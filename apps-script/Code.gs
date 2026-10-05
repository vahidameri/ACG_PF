/**
 * ACG Portfolio — Google Sheets backend (Apps Script Web App)
 *
 * Setup:
 *   1. Create an empty Google Sheet → Extensions → Apps Script → paste this file.
 *   2. Run `setup` once (authorize when asked). It creates every tab with headers
 *      and an admin key in the "Users" tab.
 *   3. Optional: run `seedDemo` to load sample rows.
 *   4. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *   5. Paste the /exec URL and your key into the dashboard's Settings page.
 *   6. Optional: run `installDailyDigest` for a 7:30 morning email digest.
 *
 * Security: every request must carry a key from the "Users" tab. Roles:
 *   admin  — read + write + manage
 *   editor — read + write
 *   viewer — read only (leadership)
 */

var SCHEMA = {
  Projects: ['id', 'code', 'name', 'description', 'category', 'owner', 'sponsor', 'status', 'priority', 'phase', 'start_date', 'end_date', 'budget', 'spent', 'progress', 'health_override', 'objective'],
  Scope: ['id', 'project_id', 'item', 'type', 'status', 'change_note', 'date'],
  Milestones: ['id', 'project_id', 'title', 'planned_date', 'actual_date', 'status', 'owner', 'weight'],
  Sprints: ['id', 'project_id', 'name', 'start_date', 'end_date', 'goal', 'committed_points', 'completed_points', 'status'],
  Tasks: ['id', 'project_id', 'sprint_id', 'title', 'description', 'assignee', 'reporter', 'status', 'priority', 'due_date', 'points', 'tags', 'created_at', 'completed_at'],
  FollowUps: ['id', 'project_id', 'subject', 'person', 'channel', 'due_date', 'status', 'priority', 'notes', 'created_at', 'done_at'],
  Risks: ['id', 'project_id', 'title', 'type', 'probability', 'impact', 'owner', 'mitigation', 'status', 'due_date'],
  Team: ['id', 'name', 'role', 'email', 'team'],
  Allocations: ['id', 'member_id', 'project_id', 'percent'],
  Updates: ['id', 'project_id', 'week_date', 'author', 'health', 'summary', 'done', 'next', 'blockers'],
};

var USERS_SHEET = 'Users';
var USERS_HEADERS = ['key', 'name', 'email', 'role', 'active'];
var LOG_SHEET = 'AuditLog';
var DATE_COLS = ['start_date', 'end_date', 'planned_date', 'actual_date', 'due_date', 'created_at', 'completed_at', 'done_at', 'week_date', 'date'];

// --------------------------------------------------------------------------
// HTTP entry points
// --------------------------------------------------------------------------

function doGet(e) {
  try {
    var user = auth_(e.parameter.token);
    var action = e.parameter.action || 'all';
    if (action === 'all') return json_({ ok: true, user: { name: user.name, role: user.role }, data: readAll_() });
    if (action === 'ping') return json_({ ok: true, user: { name: user.name, role: user.role } });
    throw new Error('Unknown action: ' + action);
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var user = auth_(body.token);
    if (user.role === 'viewer') throw new Error('دسترسی شما فقط مشاهده است');
    if (!SCHEMA[body.sheet]) throw new Error('Unknown sheet: ' + body.sheet);
    lock.waitLock(20000);
    var result;
    if (body.action === 'upsert') result = upsert_(body.sheet, body.row, user);
    else if (body.action === 'delete') result = delete_(body.sheet, body.id, user);
    else throw new Error('Unknown action: ' + body.action);
    return json_({ ok: true, row: result });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// --------------------------------------------------------------------------
// Data access
// --------------------------------------------------------------------------

function readAll_() {
  var ss = SpreadsheetApp.getActive();
  var out = {};
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    out[name] = sh ? readSheet_(sh) : [];
  });
  return out;
}

function readSheet_(sh) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var tz = Session.getScriptTimeZone();
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row[0] === '' || row[0] === null) continue;
    var o = {};
    for (var c = 0; c < headers.length; c++) {
      var v = row[c];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      o[headers[c]] = v;
    }
    rows.push(o);
  }
  return rows;
}

function upsert_(name, row, user) {
  if (!row || !row.id) throw new Error('row.id is required');
  var sh = ensureSheet_(name, SCHEMA[name]);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  // Add any new columns the client sends (forward compatible).
  Object.keys(row).forEach(function (k) {
    if (headers.indexOf(k) === -1) {
      sh.getRange(1, headers.length + 1).setValue(k);
      headers.push(k);
    }
  });
  var values = headers.map(function (h) {
    var v = row[h];
    if (v === undefined || v === null) return '';
    return v;
  });
  var idx = findRow_(sh, row.id);
  if (idx > 0) {
    sh.getRange(idx, 1, 1, headers.length).setValues([values]);
    log_(user, 'update', name, row.id);
  } else {
    sh.appendRow(values);
    log_(user, 'create', name, row.id);
  }
  return row;
}

function delete_(name, id, user) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return null;
  var idx = findRow_(sh, id);
  if (idx > 0) {
    sh.deleteRow(idx);
    log_(user, 'delete', name, id);
  }
  return { id: id };
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

// --------------------------------------------------------------------------
// Auth & audit
// --------------------------------------------------------------------------

function auth_(token) {
  if (!token) throw new Error('کلید دسترسی ارسال نشده است');
  var sh = SpreadsheetApp.getActive().getSheetByName(USERS_SHEET);
  if (!sh) throw new Error('تب Users وجود ندارد؛ تابع setup را اجرا کنید');
  var rows = readSheet_(sh);
  for (var i = 0; i < rows.length; i++) {
    var u = rows[i];
    if (String(u.key) === String(token) && String(u.active).toLowerCase() !== 'false') {
      return { name: u.name, email: u.email, role: (u.role || 'viewer').toLowerCase() };
    }
  }
  throw new Error('کلید دسترسی نامعتبر است');
}

function log_(user, action, sheet, id) {
  var sh = ensureSheet_(LOG_SHEET, ['time', 'user', 'action', 'sheet', 'id']);
  sh.appendRow([new Date(), user.name, action, sheet, id]);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// --------------------------------------------------------------------------
// Setup helpers (run manually from the editor)
// --------------------------------------------------------------------------

function ensureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#eef2ff');
    sh.setFrozenRows(1);
    // Keep dates as plain ISO text so the client always receives YYYY-MM-DD.
    headers.forEach(function (h, i) {
      if (DATE_COLS.indexOf(h) !== -1) sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
    });
    sh.getRange(2, 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  }
  return sh;
}

function setup() {
  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(name, SCHEMA[name]); });
  var users = ensureSheet_(USERS_SHEET, USERS_HEADERS);
  ensureSheet_(LOG_SHEET, ['time', 'user', 'action', 'sheet', 'id']);
  var ss = SpreadsheetApp.getActive();
  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('برگه۱');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  if (users.getLastRow() < 2) {
    var key = newKey_();
    var me = Session.getEffectiveUser().getEmail();
    users.appendRow([key, 'مدیر برنامه', me, 'admin', true]);
    SpreadsheetApp.getUi && safeAlert_('راه‌اندازی انجام شد.\n\nکلید ادمین شما:\n' + key + '\n\nاین کلید در تب Users هم ذخیره شده است.');
    Logger.log('Admin key: ' + key);
  }
}

/** Creates a new access key row. Usage from editor: addUser('دکتر کامرانی', 'ceo@acg.com', 'viewer') */
function addUser(name, email, role) {
  var sh = ensureSheet_(USERS_SHEET, USERS_HEADERS);
  var key = newKey_();
  sh.appendRow([key, name || 'کاربر', email || '', role || 'viewer', true]);
  Logger.log(name + ' → ' + key);
  return key;
}

function newKey_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 24);
}

function safeAlert_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
}

/** Adds a custom menu in the Sheet for non-technical users. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ACG Portfolio')
    .addItem('راه‌اندازی تب‌ها', 'setup')
    .addItem('افزودن کاربر جدید…', 'promptAddUser')
    .addItem('ارسال خلاصه‌ی روزانه (همین حالا)', 'sendDailyDigest')
    .addItem('فعال‌سازی ایمیل روزانه', 'installDailyDigest')
    .addToUi();
}

function promptAddUser() {
  var ui = SpreadsheetApp.getUi();
  var n = ui.prompt('نام کاربر').getResponseText();
  if (!n) return;
  var em = ui.prompt('ایمیل').getResponseText();
  var r = ui.prompt('نقش: admin / editor / viewer').getResponseText() || 'viewer';
  var key = addUser(n, em, r);
  ui.alert('کلید دسترسی ' + n + ':\n' + key);
}

// --------------------------------------------------------------------------
// Daily digest email — the "assistant" pushes your day to your inbox
// --------------------------------------------------------------------------

function installDailyDigest() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyDigest').timeBased().everyDays(1).atHour(7).nearMinute(30).create();
  safeAlert_('ایمیل خلاصه‌ی روزانه هر روز حدود ساعت ۷:۳۰ ارسال می‌شود.');
}

function sendDailyDigest() {
  var data = readAll_();
  var tz = Session.getScriptTimeZone();
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var pname = {};
  data.Projects.forEach(function (p) { pname[p.id] = p.name; });

  var overdueTasks = data.Tasks.filter(function (t) { return t.status !== 'done' && t.due_date && t.due_date < today; });
  var todayTasks = data.Tasks.filter(function (t) { return t.status !== 'done' && t.due_date === today; });
  var blocked = data.Tasks.filter(function (t) { return t.status === 'blocked'; });
  var fus = data.FollowUps.filter(function (f) { return f.status !== 'done' && f.due_date && f.due_date <= today; });
  var ms = data.Milestones.filter(function (m) { return m.status !== 'done' && m.planned_date && m.planned_date < today; });

  var li = function (s) { return '<li style="margin:4px 0">' + s + '</li>'; };
  var sec = function (title, color, items) {
    if (!items.length) return '';
    return '<h3 style="color:' + color + ';margin:18px 0 6px">' + title + ' (' + items.length + ')</h3><ul style="padding-right:18px;margin:0">' + items.join('') + '</ul>';
  };

  var html = '<div dir="rtl" style="font-family:Tahoma,Vazirmatn,sans-serif;font-size:14px;line-height:1.8;color:#111">' +
    '<h2 style="margin:0 0 8px">خلاصه‌ی امروز پورتفولیو ACG</h2>' +
    sec('فالوآپ‌های امروز و معوق', '#e13748', fus.map(function (f) { return li('<b>' + f.subject + '</b> — ' + f.person + (f.project_id ? ' · ' + (pname[f.project_id] || '') : '') + ' · ' + f.due_date); })) +
    sec('تسک‌های امروز', '#4f46e5', todayTasks.map(function (t) { return li(t.title + ' — ' + t.assignee + (t.project_id ? ' · ' + (pname[t.project_id] || '') : '')); })) +
    sec('تسک‌های معوق', '#d98d06', overdueTasks.map(function (t) { return li(t.title + ' — ' + t.assignee + ' · سررسید ' + t.due_date); })) +
    sec('تسک‌های مسدود', '#e13748', blocked.map(function (t) { return li(t.title + ' — ' + t.assignee + (t.description ? ' · ' + t.description : '')); })) +
    sec('مایلستون‌های عقب‌افتاده', '#e13748', ms.map(function (m) { return li(m.title + ' · ' + (pname[m.project_id] || '') + ' · ' + m.planned_date); })) +
    '<p style="color:#666;margin-top:24px;font-size:12px">این ایمیل به‌صورت خودکار از Google Sheet پورتفولیو ارسال شده است.</p></div>';

  var to = PropertiesService.getScriptProperties().getProperty('DIGEST_TO') || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: to, subject: 'ACG Portfolio · خلاصه‌ی ' + today, htmlBody: html });
}

// --------------------------------------------------------------------------
// Sample data (optional)
// --------------------------------------------------------------------------

function seedDemo() {
  setup();
  var tz = Session.getScriptTimeZone();
  var d = function (n) { var x = new Date(); x.setDate(x.getDate() + n); return Utilities.formatDate(x, tz, 'yyyy-MM-dd'); };
  var put = function (name, rows) {
    var sh = ensureSheet_(name, SCHEMA[name]);
    var h = SCHEMA[name];
    var vals = rows.map(function (r) { return h.map(function (k) { return r[k] === undefined ? '' : r[k]; }); });
    if (vals.length) sh.getRange(sh.getLastRow() + 1, 1, vals.length, h.length).setValues(vals);
  };
  put('Team', [
    { id: 'm1', name: 'مدیر برنامه', role: 'Program Manager', team: 'PMO' },
    { id: 'm2', name: 'سارا محمدی', role: 'Product Owner', team: 'محصول' },
    { id: 'm3', name: 'علی رضایی', role: 'Tech Lead', team: 'فنی' },
    { id: 'm4', name: 'رضا کریمی', role: 'Backend Developer', team: 'فنی' },
  ]);
  put('Projects', [
    { id: 'p1', code: 'ACG-CRM', name: 'سامانه CRM یکپارچه', description: 'یکپارچه‌سازی فروش و پشتیبانی', category: 'تحول دیجیتال', owner: 'سارا محمدی', sponsor: 'مدیرعامل', status: 'active', priority: 'critical', phase: 'توسعه', start_date: d(-120), end_date: d(60), budget: 8500000000, spent: 5200000000, progress: 58, objective: 'افزایش ۲۰٪ نرخ تبدیل' },
    { id: 'p2', code: 'ACG-APP', name: 'اپلیکیشن موبایل مشتریان', description: 'اپ سفارش و پرداخت', category: 'محصول', owner: 'علی رضایی', sponsor: 'مدیرعامل', status: 'active', priority: 'high', phase: 'توسعه', start_date: d(-90), end_date: d(25), budget: 6000000000, spent: 5600000000, progress: 72 },
  ]);
  put('Milestones', [
    { id: 'ms1', project_id: 'p1', title: 'MVP فروش', planned_date: d(-20), actual_date: d(-15), status: 'done', owner: 'علی رضایی', weight: 2 },
    { id: 'ms2', project_id: 'p1', title: 'ماژول پشتیبانی', planned_date: d(10), status: 'in_progress', owner: 'رضا کریمی', weight: 2 },
    { id: 'ms3', project_id: 'p1', title: 'Go-Live', planned_date: d(60), status: 'pending', owner: 'سارا محمدی', weight: 1 },
    { id: 'ms4', project_id: 'p2', title: 'انتشار در استورها', planned_date: d(25), status: 'pending', owner: 'علی رضایی', weight: 2 },
  ]);
  put('Sprints', [{ id: 's1', project_id: 'p1', name: 'اسپرینت ۹', start_date: d(-7), end_date: d(6), goal: 'SLA تیکت‌ها', status: 'active' }]);
  put('Tasks', [
    { id: 't1', project_id: 'p1', sprint_id: 's1', title: 'موتور SLA', assignee: 'رضا کریمی', status: 'done', priority: 'high', due_date: d(-3), points: 8, created_at: d(-7), completed_at: d(-4) },
    { id: 't2', project_id: 'p1', sprint_id: 's1', title: 'قوانین اسکالیشن', assignee: 'رضا کریمی', status: 'in_progress', priority: 'high', due_date: d(3), points: 5, created_at: d(-7) },
    { id: 't3', project_id: 'p1', title: 'جلسه‌ی دمو با فروش', assignee: 'مدیر برنامه', status: 'todo', priority: 'high', due_date: d(0), created_at: d(-2) },
  ]);
  put('FollowUps', [{ id: 'f1', project_id: 'p2', subject: 'پیش‌فاکتور سرویس پوش', person: 'واحد تدارکات', channel: 'call', due_date: d(0), status: 'open', priority: 'high', created_at: d(-3) }]);
  put('Risks', [{ id: 'r1', project_id: 'p1', title: 'تأخیر API تیم ERP', type: 'dependency', probability: 4, impact: 4, owner: 'علی رضایی', mitigation: 'Mock API', status: 'open', due_date: d(5) }]);
  put('Allocations', [{ id: 'a1', member_id: 'm2', project_id: 'p1', percent: 60 }, { id: 'a2', member_id: 'm3', project_id: 'p2', percent: 70 }]);
  put('Updates', [{ id: 'u1', project_id: 'p1', week_date: d(-2), author: 'سارا محمدی', health: 'amber', summary: 'ماژول پشتیبانی طبق برنامه است؛ وابستگی ERP در خطر.', done: 'موتور SLA', next: 'تست یکپارچه', blockers: 'دسترسی API' }]);
}
