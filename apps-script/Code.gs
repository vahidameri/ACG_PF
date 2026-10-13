/**
 * ACG Helm (سکان) — Google Sheets backend (Apps Script Web App)
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
  Projects: ['id', 'code', 'name', 'description', 'category', 'owner', 'sponsor', 'status', 'priority', 'phase', 'start_date', 'end_date', 'budget', 'spent', 'progress', 'health_override', 'objective', 'paused_at', 'pause_reason'],
  Scope: ['id', 'project_id', 'item', 'type', 'status', 'change_note', 'date'],
  Milestones: ['id', 'project_id', 'title', 'planned_date', 'actual_date', 'status', 'owner', 'weight'],
  Sprints: ['id', 'project_id', 'name', 'start_date', 'end_date', 'goal', 'committed_points', 'completed_points', 'status'],
  Tasks: ['id', 'project_id', 'sprint_id', 'title', 'description', 'assignee', 'reporter', 'status', 'priority', 'due_date', 'points', 'tags', 'created_at', 'completed_at', 'track', 'depends_on', 'meeting_id', 'private'],
  FollowUps: ['id', 'project_id', 'subject', 'person', 'channel', 'due_date', 'status', 'priority', 'notes', 'created_at', 'done_at'],
  Risks: ['id', 'project_id', 'title', 'type', 'probability', 'impact', 'owner', 'mitigation', 'status', 'due_date'],
  // capacity = % of one full-time person (100 = full-time, 600 = a team of six)
  // email = the Google account used to sign in; tasks_private = '1' hides this person's tasks (e.g. the CEO)
  Team: ['id', 'name', 'role', 'email', 'team', 'track', 'capacity', 'photo', 'tasks_private', 'phone'],
  // start_date / end_date are optional; blank = open-ended
  Allocations: ['id', 'member_id', 'project_id', 'percent', 'start_date', 'end_date'],
  Updates: ['id', 'project_id', 'week_date', 'author', 'health', 'summary', 'done', 'next', 'blockers'],
  // Comments on tasks / follow-ups / projects. created_at is "YYYY-MM-DD HH:mm".
  Comments: ['id', 'entity', 'entity_id', 'author', 'body', 'created_at'],
  // Delivery plan. baseline_date = first committed date (kept when target_date moves → slippage).
  Deliverables: ['id', 'project_id', 'title', 'track', 'owner', 'target_date', 'baseline_date', 'delivered_date', 'status', 'confidence', 'notes'],
  // Weekly meetings. series: portfolio | product | tech | project | other. attendees comma-separated; decisions one per line.
  Meetings: ['id', 'series', 'title', 'project_id', 'date', 'time', 'facilitator', 'attendees', 'status', 'notes', 'decisions', 'gcal_id', 'meet_url', 'duration'],
  // Leave / training — reduces capacity in the weeks it covers.
  TimeOff: ['id', 'member_id', 'start_date', 'end_date', 'kind', 'note'],
  // Uploaded files live in a Drive folder; this tab is the index.
  Files: ['id', 'entity', 'entity_id', 'name', 'mime', 'size', 'url', 'uploaded_by', 'created_at'],
  // Shared settings (automation switches: auto.<id> = on/off). id = key.
  Config: ['id', 'value'],
};

var USERS_SHEET = 'Users';
var USERS_HEADERS = ['key', 'name', 'email', 'role', 'active'];
var LOG_SHEET = 'AuditLog';
var DATE_COLS = ['start_date', 'end_date', 'planned_date', 'actual_date', 'due_date', 'created_at', 'completed_at', 'done_at', 'week_date', 'date', 'target_date', 'baseline_date', 'delivered_date', 'time'];

// --------------------------------------------------------------------------
// HTTP entry points
// --------------------------------------------------------------------------

function doGet(e) {
  try {
    var user = auth_(e.parameter);
    var action = e.parameter.action || 'all';
    var me = { name: user.name, role: user.role, email: user.email };
    if (action === 'all') return json_({ ok: true, user: me, data: readAll_(user) });
    if (action === 'ping') return json_({ ok: true, user: me });
    throw new Error('Unknown action: ' + action);
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var user = auth_(body);
    if (user.role === 'viewer') throw new Error('دسترسی شما فقط مشاهده است');
    lock.waitLock(20000);
    var result;
    if (body.action === 'upload') result = upload_(body, user);
    else if (body.action === 'mailMinutes') result = mailMinutes_(body.meeting_id, user);
    else {
      if (!SCHEMA[body.sheet]) throw new Error('Unknown sheet: ' + body.sheet);
      if (body.sheet === 'Config' && user.role !== 'admin') throw new Error('فقط ادمین می‌تواند تنظیمات را تغییر دهد');
      guardPrivate_(body.sheet, body.action === 'delete' ? { id: body.id } : body.row, user);
      if (body.action === 'upsert') result = upsert_(body.sheet, body.row, user);
      else if (body.action === 'delete') result = delete_(body.sheet, body.id, user);
      else throw new Error('Unknown action: ' + body.action);
    }
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

function readAll_(user) {
  var ss = SpreadsheetApp.getActive();
  var out = {};
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    out[name] = sh ? readSheet_(sh) : [];
  });
  return user ? applyPrivacy_(out, user) : out;
}

// --------------------------------------------------------------------------
// Privacy — private tasks (and everything attached to them) never leave the sheet
// for anyone except the assignee and the person who created the task.
// --------------------------------------------------------------------------

function privateOwners_(team) {
  var set = {};
  team.forEach(function (m) { if (String(m.tasks_private) === '1') set[m.name] = true; });
  return set;
}

function canSeeTask_(t, user, owners) {
  var priv = String(t.private) === '1' || owners[t.assignee];
  return !priv || t.assignee === user.name || t.reporter === user.name;
}

function applyPrivacy_(data, user) {
  var owners = privateOwners_(data.Team || []);
  var hidden = {};
  data.Tasks = (data.Tasks || []).filter(function (t) {
    var ok = canSeeTask_(t, user, owners);
    if (!ok) hidden[t.id] = true;
    return ok;
  });
  data.Comments = (data.Comments || []).filter(function (c) { return !(c.entity === 'Tasks' && hidden[c.entity_id]); });
  data.Files = (data.Files || []).filter(function (f) { return !(f.entity === 'Tasks' && hidden[f.entity_id]); });
  return data;
}

/** Stops edits to a private task (or its comments/files) by someone who can't see it. */
function guardPrivate_(sheet, row, user) {
  if (!row) return;
  var ss = SpreadsheetApp.getActive();
  var taskId = sheet === 'Tasks' ? row.id : (sheet === 'Comments' || sheet === 'Files') && row.entity === 'Tasks' ? row.entity_id : '';
  if (!taskId) return;
  var owners = privateOwners_(readSheet_(ss.getSheetByName('Team')));
  var tasks = readSheet_(ss.getSheetByName('Tasks'));
  for (var i = 0; i < tasks.length; i++) {
    if (String(tasks[i].id) === String(taskId) && !canSeeTask_(tasks[i], user, owners)) throw new Error('این تسک خصوصی است');
  }
}

function setting_(key, fallback) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Config');
  if (!sh) return fallback;
  var rows = readSheet_(sh);
  for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === key) return String(rows[i].value);
  return fallback;
}
function automationOn_(id) { return setting_('auto.' + id, 'on') !== 'off'; }

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
      if (v instanceof Date) v = headers[c] === 'time' ? Utilities.formatDate(v, tz, 'HH:mm') : Utilities.formatDate(v, tz, v.getHours() || v.getMinutes() ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
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
    // keep "10:00" as text so Sheets doesn't turn it into a 1899 date-time
    if (h === 'time' && v !== '') return "'" + v;
    return v;
  });
  var idx = findRow_(sh, row.id);
  if (idx > 0) {
    sh.getRange(idx, 1, 1, headers.length).setValues([values]);
    log_(user, 'update', name, row.id);
  } else {
    sh.appendRow(values);
    log_(user, 'create', name, row.id);
    if (name === 'Comments') notifyMentions_(row, user);
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

/**
 * Who is calling. Preferred: a Google access token from "Sign in with Google" — verified with
 * Google, then matched by email to the Users tab. Fallback: a personal key from the Users tab.
 */
function auth_(params) {
  var sh = SpreadsheetApp.getActive().getSheetByName(USERS_SHEET);
  if (!sh) throw new Error('تب Users وجود ندارد؛ تابع setup را اجرا کنید');
  var rows = readSheet_(sh);
  var active = function (u) { return String(u.active).toLowerCase() !== 'false'; };
  var pick = function (u) { return { name: u.name, email: String(u.email || '').toLowerCase(), role: (u.role || 'viewer').toLowerCase() }; };
  if (params.access_token) {
    var email = googleEmail_(params.access_token);
    for (var i = 0; i < rows.length; i++) if (String(rows[i].email).toLowerCase() === email && active(rows[i])) return pick(rows[i]);
    throw new Error('حساب ' + email + ' در تب Users تعریف نشده است. از مدیر برنامه بخواهید دسترسی بدهد.');
  }
  if (!params.token) throw new Error('وارد نشده‌اید');
  for (var j = 0; j < rows.length; j++) if (rows[j].key && String(rows[j].key) === String(params.token) && active(rows[j])) return pick(rows[j]);
  throw new Error('کلید دسترسی نامعتبر است');
}

/** Verifies a Google access token (cached ~50 min) and returns the signed-in email. */
function googleEmail_(token) {
  var cache = CacheService.getScriptCache();
  var k = 'tok:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  var hit = cache.get(k);
  if (hit) return hit;
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('نشست گوگل منقضی شده؛ دوباره وارد شوید');
  var info = JSON.parse(res.getContentText());
  var client = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  if (client && info.aud !== client && info.azp !== client) throw new Error('این توکن برای این برنامه صادر نشده است');
  if (!info.email || String(info.email_verified) !== 'true') throw new Error('ایمیل حساب گوگل تأیید نشده است');
  var email = String(info.email).toLowerCase();
  cache.put(k, email, Math.min(3000, Number(info.expires_in) || 3000));
  return email;
}

function log_(user, action, sheet, id) {
  var sh = ensureSheet_(LOG_SHEET, ['time', 'user', 'action', 'sheet', 'id']);
  sh.appendRow([new Date(), user.name, action, sheet, id]);
}

/** Emails team members @mentioned in a new comment (Team tab must have their email). */
function notifyMentions_(c, user) {
  try {
    var team = readSheet_(SpreadsheetApp.getActive().getSheetByName('Team'));
    team.forEach(function (m) {
      if (m.email && m.name && String(c.body).indexOf('@' + m.name) !== -1) {
        MailApp.sendEmail({
          to: m.email,
          subject: 'ACG Helm · ' + user.name + ' mentioned you',
          htmlBody: '<div dir="auto" style="font-family:Tahoma,sans-serif;line-height:1.8"><b>' + user.name + '</b>:<br>' + String(c.body).replace(/</g, '&lt;') + '</div>',
        });
      }
    });
  } catch (e) {
    Logger.log('mention mail failed: ' + e);
  }
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
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ensureSheet_(name, SCHEMA[name]);
    // Upgrade older sheets: append any columns added since they were created.
    var have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
    SCHEMA[name].forEach(function (h) {
      if (have.indexOf(h) === -1) {
        sh.getRange(1, have.length + 1).setValue(h).setFontWeight('bold').setBackground('#eef2ff');
        have.push(h);
      }
    });
  });
  var users = ensureSheet_(USERS_SHEET, USERS_HEADERS);
  ensureSheet_(LOG_SHEET, ['time', 'user', 'action', 'sheet', 'id']);
  var ss = SpreadsheetApp.getActive();
  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('برگه۱');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  if (users.getLastRow() < 2) {
    var key = newKey_();
    var me = Session.getEffectiveUser().getEmail();
    users.appendRow([key, 'وحید عامری', me, 'admin', true]);
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
    .createMenu('ACG Helm')
    .addItem('راه‌اندازی تب‌ها', 'setup')
    .addItem('افزودن کاربر جدید…', 'promptAddUser')
    .addItem('ارسال خلاصه‌ی روزانه (همین حالا)', 'sendDailyDigest')
    .addItem('فعال‌سازی ایمیل روزانه', 'installDailyDigest')
    .addItem('نصب همه‌ی اتوماسیون‌ها', 'installAutomations')
    .addItem('فعال‌سازی یادآوری گزارش هفتگی', 'installWeeklyReminder')
    .addItem('ارسال یادآوری گزارش هفتگی (همین حالا)', 'remindWeeklyUpdates')
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
  if (!automationOn_('daily_digest')) return;
  // private tasks (e.g. the CEO's) are never included in a shared email
  var data = applyPrivacy_(readAll_(), { name: '' });
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
    '<h2 style="margin:0 0 8px">خلاصه‌ی امروز — سکان ACG</h2>' +
    sec('فالوآپ‌های امروز و معوق', '#e13748', fus.map(function (f) { return li('<b>' + f.subject + '</b> — ' + f.person + (f.project_id ? ' · ' + (pname[f.project_id] || '') : '') + ' · ' + f.due_date); })) +
    sec('تسک‌های امروز', '#4f46e5', todayTasks.map(function (t) { return li(t.title + ' — ' + t.assignee + (t.project_id ? ' · ' + (pname[t.project_id] || '') : '')); })) +
    sec('تسک‌های معوق', '#d98d06', overdueTasks.map(function (t) { return li(t.title + ' — ' + t.assignee + ' · سررسید ' + t.due_date); })) +
    sec('تسک‌های مسدود', '#e13748', blocked.map(function (t) { return li(t.title + ' — ' + t.assignee + (t.description ? ' · ' + t.description : '')); })) +
    sec('مایلستون‌های عقب‌افتاده', '#e13748', ms.map(function (m) { return li(m.title + ' · ' + (pname[m.project_id] || '') + ' · ' + m.planned_date); })) +
    '<p style="color:#666;margin-top:24px;font-size:12px">این ایمیل به‌صورت خودکار از Google Sheet پورتفولیو ارسال شده است.</p></div>';

  var to = PropertiesService.getScriptProperties().getProperty('DIGEST_TO') || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: to, subject: 'ACG Helm · خلاصه‌ی ' + today, htmlBody: html });
}

// --------------------------------------------------------------------------
// Weekly update cycle — reports are due by end of Sunday; the portfolio weekly is Monday.
// remindWeeklyUpdates emails each project lead whose active project has no update this week
// (week starts Saturday) and sends the PMO a list of who is missing.
// --------------------------------------------------------------------------

function installWeeklyReminder() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'remindWeeklyUpdates') ScriptApp.deleteTrigger(t);
  });
  // Sunday 14:00 (a nudge before the deadline) and Monday 08:00 (last call before the weekly)
  ScriptApp.newTrigger('remindWeeklyUpdates').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(14).create();
  ScriptApp.newTrigger('remindWeeklyUpdates').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  safeAlert_('یادآوری گزارش هفتگی یکشنبه ساعت ۱۴ و دوشنبه ساعت ۸ برای مدیران پروژه‌ای که گزارش نداده‌اند ارسال می‌شود.');
}

function weekStartISO_(tz) {
  var x = new Date();
  var dow = (x.getDay() + 1) % 7; // Saturday = 0
  x.setDate(x.getDate() - dow);
  return Utilities.formatDate(x, tz, 'yyyy-MM-dd');
}

function remindWeeklyUpdates() {
  if (!automationOn_('update_reminder')) return;
  var data = readAll_();
  var tz = Session.getScriptTimeZone();
  var ws = weekStartISO_(tz);
  var email = {};
  data.Team.forEach(function (m) { if (m.email) email[m.name] = m.email; });
  var missing = data.Projects.filter(function (p) {
    if (p.status !== 'active') return false;
    return !data.Updates.some(function (u) { return u.project_id === p.id && String(u.week_date) >= ws; });
  });
  var byOwner = {};
  missing.forEach(function (p) { (byOwner[p.owner] = byOwner[p.owner] || []).push(p.name); });
  Object.keys(byOwner).forEach(function (owner) {
    if (!email[owner]) return;
    MailApp.sendEmail({
      to: email[owner],
      subject: 'یادآوری گزارش هفتگی · ' + byOwner[owner].join('، '),
      htmlBody: '<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.9">' + owner + ' عزیز، سلام<br>گزارش هفتگی این پروژه‌ها هنوز ثبت نشده است: <b>' + byOwner[owner].join('، ') +
        '</b><br>لطفاً پیش از ویکلی پورتفولیو از صفحه‌ی «گزارش هفتگی» ثبت کنید. ممنون 🙏</div>',
    });
  });
  if (missing.length) {
    var to = PropertiesService.getScriptProperties().getProperty('DIGEST_TO') || Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({ to: to, subject: 'ACG Helm · ' + missing.length + ' گزارش هفتگی ارسال نشده', htmlBody: '<div dir="rtl" style="font-family:Tahoma,sans-serif">' + missing.map(function (p) { return p.name + ' — ' + p.owner; }).join('<br>') + '</div>' });
  }
}

// --------------------------------------------------------------------------
// Files — uploads go to one shared Drive folder ("ACG Helm files"), indexed in the Files tab.
// Script property FILE_SHARING: 'link' (default, anyone with the link) or 'domain'.
// --------------------------------------------------------------------------

function filesFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('ACG Helm files');
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function upload_(b, user) {
  if (!b.data || !b.name) throw new Error('فایل ارسال نشده است');
  guardPrivate_('Files', { entity: b.entity, entity_id: b.entity_id }, user);
  var blob = Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'application/octet-stream', b.name);
  if (blob.getBytes().length > 10 * 1024 * 1024) throw new Error('حداکثر حجم فایل ۱۰ مگابایت است');
  var file = filesFolder_().createFile(blob);
  var sharing = PropertiesService.getScriptProperties().getProperty('FILE_SHARING') || 'link';
  try {
    file.setSharing(sharing === 'domain' ? DriveApp.Access.DOMAIN_WITH_LINK : DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  var isImage = String(b.mime || '').indexOf('image/') === 0;
  var row = {
    id: 'FL-' + Utilities.getUuid().slice(0, 8), entity: b.entity, entity_id: b.entity_id, name: b.name, mime: b.mime, size: blob.getBytes().length,
    // images use the thumbnail endpoint so they render inside <img>
    url: isImage ? 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w600' : file.getUrl(),
    uploaded_by: user.name, created_at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
  };
  upsert_('Files', row, user);
  return row;
}

// --------------------------------------------------------------------------
// Meeting minutes & action plan email (automation: minutes_mail)
// --------------------------------------------------------------------------

function mailMinutes_(meetingId, user) {
  if (!automationOn_('minutes_mail')) return { skipped: true };
  var data = readAll_();
  var m = data.Meetings.filter(function (x) { return String(x.id) === String(meetingId); })[0];
  if (!m) throw new Error('جلسه پیدا نشد');
  var email = {};
  data.Team.forEach(function (t) { if (t.email) email[t.name] = t.email; });
  var to = String(m.attendees || '').split(',').map(function (n) { return email[n.trim()]; }).filter(Boolean);
  if (!to.length) return { sent: 0 };
  var owners = privateOwners_(data.Team);
  var actions = data.Tasks.filter(function (t) { return String(t.meeting_id) === String(m.id) && String(t.private) !== '1' && !owners[t.assignee]; });
  var esc = function (x) { return String(x || '').replace(/</g, '&lt;'); };
  var lines = function (x) { return String(x || '').split('\n').filter(function (l) { return l.trim(); }); };
  var html = '<div dir="rtl" style="font-family:Tahoma,sans-serif;font-size:14px;line-height:1.9;color:#111">' +
    '<h2 style="margin:0">' + esc(m.title) + '</h2><div style="color:#666">' + m.date + ' · ' + esc(m.time) + '</div>' +
    (m.notes ? '<h3>صورت‌جلسه</h3><p>' + esc(m.notes).replace(/\n/g, '<br>') + '</p>' : '') +
    (lines(m.decisions).length ? '<h3>تصمیم‌ها</h3><ul>' + lines(m.decisions).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') +
    (actions.length ? '<h3>اکشن پلن</h3><table cellpadding="6" style="border-collapse:collapse">' + actions.map(function (t) {
      return '<tr><td style="border-bottom:1px solid #eee">' + esc(t.title) + '</td><td style="border-bottom:1px solid #eee"><b>' + esc(t.assignee) + '</b></td><td style="border-bottom:1px solid #eee;color:#666">' + (t.due_date || '') + '</td></tr>';
    }).join('') + '</table>' : '') +
    '<p style="color:#888;font-size:12px;margin-top:20px">ارسال خودکار از سکان ACG — ' + esc(user.name) + '</p></div>';
  MailApp.sendEmail({ to: to.join(','), subject: 'صورت‌جلسه · ' + m.title + ' · ' + m.date, htmlBody: html });
  return { sent: to.length };
}

// --------------------------------------------------------------------------
// Overdue action reminders (automation: action_reminder) — every morning
// --------------------------------------------------------------------------

function remindOverdueActions() {
  if (!automationOn_('action_reminder')) return;
  var data = readAll_();
  var tz = Session.getScriptTimeZone();
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var email = {};
  data.Team.forEach(function (t) { if (t.email) email[t.name] = t.email; });
  var by = {};
  data.Tasks.filter(function (t) { return t.meeting_id && t.status !== 'done' && t.due_date && t.due_date < today; })
    .forEach(function (t) { (by[t.assignee] = by[t.assignee] || []).push(t); });
  Object.keys(by).forEach(function (who) {
    if (!email[who]) return;
    MailApp.sendEmail({
      to: email[who],
      subject: 'سکان ACG · ' + by[who].length + ' اقدام عقب‌افتاده',
      htmlBody: '<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.9">' + who + ' عزیز، این اقدام‌های جلسات از سررسیدشان گذشته‌اند:<ul>' +
        by[who].map(function (t) { return '<li>' + String(t.title).replace(/</g, '&lt;') + ' — ' + t.due_date + '</li>'; }).join('') + '</ul></div>',
    });
  });
}

/** One click: installs every scheduled automation. Each one checks its on/off switch before running. */
function installAutomations() {
  var keep = { sendDailyDigest: 1, remindWeeklyUpdates: 1, remindOverdueActions: 1 };
  ScriptApp.getProjectTriggers().forEach(function (t) { if (keep[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendDailyDigest').timeBased().everyDays(1).atHour(7).nearMinute(30).create();
  ScriptApp.newTrigger('remindOverdueActions').timeBased().everyDays(1).atHour(8).nearMinute(15).create();
  ScriptApp.newTrigger('remindWeeklyUpdates').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(14).create();
  ScriptApp.newTrigger('remindWeeklyUpdates').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  safeAlert_('اتوماسیون‌ها نصب شدند: خلاصه‌ی صبح ۷:۳۰، یادآوری اقدام‌های معوق ۸:۱۵، یادآوری گزارش هفتگی یکشنبه ۱۴ و دوشنبه ۸. روشن/خاموش کردن هر کدام از صفحه‌ی تنظیمات اپ.');
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
    { id: 'm1', name: 'وحید عامری', role: 'مدیر پروگرم', team: 'PMO', track: '' },
    { id: 'm2', name: 'جلیل علیزاده', role: 'مدیرعامل', team: 'مدیریت', track: '', tasks_private: '1' },
    { id: 'm3', name: 'وحید کیوانیان', role: 'هد تک', team: 'تک', track: 'tech' },
    { id: 'm4', name: 'مهرزاد گلی', role: 'هد پروداکت', team: 'پروداکت', track: 'product' },
    { id: 'm5', name: 'آتنا دهقان', role: 'پروداکت منیجر', team: 'پروداکت', track: 'product' },
    { id: 'm6', name: 'علی سرمیلی', role: 'پروداکت منیجر', team: 'پروداکت', track: 'product' },
    { id: 'm7', name: 'علی سالمه', role: 'پروداکت منیجر', team: 'پروداکت', track: 'product' },
    { id: 'm8', name: 'مهرسا دبیر', role: 'پروداکت منیجر', team: 'پروداکت', track: 'product' },
    { id: 'm9', name: 'بابک معروفی', role: 'پروداکت منیجر', team: 'پروداکت', track: 'product' },
    { id: 'm10', name: 'امین ظفری', role: 'پروداکت منیجر', team: 'پروداکت', track: 'product' },
    { id: 'm11', name: 'هانیه منصورکیایی', role: 'پروداکت دیزاینر', team: 'پروداکت', track: 'product' },
    { id: 'm12', name: 'تیم تک', role: 'مهندسی (تیمی)', team: 'تک', track: 'tech', capacity: 600 },
  ].map(function (m) { if (!m.capacity) m.capacity = 100; return m; }));
  // Weekly cadence: one row per meeting; the app's "schedule next week" clones it.
  var ws = weekStartISO_(tz);
  var on = function (day) { var x = new Date(ws + 'T00:00:00'); x.setDate(x.getDate() + day); return Utilities.formatDate(x, tz, 'yyyy-MM-dd'); };
  put('Meetings', [
    { id: 'mt1', series: 'portfolio', title: 'ویکلی پورتفولیو', date: on(2), time: "'10:00", facilitator: 'وحید عامری', attendees: 'وحید عامری, جلیل علیزاده, وحید کیوانیان, مهرزاد گلی', status: 'scheduled' },
    { id: 'mt2', series: 'product', title: 'ویکلی پروداکت', date: on(1), time: "'14:00", facilitator: 'مهرزاد گلی', attendees: 'مهرزاد گلی, وحید عامری, آتنا دهقان, علی سرمیلی, علی سالمه, مهرسا دبیر, بابک معروفی, امین ظفری, هانیه منصورکیایی', status: 'scheduled' },
    { id: 'mt3', series: 'tech', title: 'ویکلی تک', date: on(3), time: "'11:00", facilitator: 'وحید کیوانیان', attendees: 'وحید کیوانیان, وحید عامری, مهرزاد گلی', status: 'scheduled' },
  ]);
  var pm = { 'CX Orbit': 'آتنا دهقان', 'Insight X Padida': 'علی سرمیلی', 'Roo B Roo': 'علی سالمه', 'Kadiner': 'مهرسا دبیر', 'HamAfza': 'بابک معروفی', 'Myca': 'امین ظفری', 'malek': 'آتنا دهقان', 'SimiPass': 'علی سرمیلی', 'Ino School': 'مهرسا دبیر', 'AISN': 'امین ظفری', 'Clarity Pass': 'بابک معروفی' };
  put('Projects', Object.keys(pm).map(function (name, i) {
    return { id: 'p' + (i + 1), code: name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase(), name: name, owner: pm[name], sponsor: 'جلیل علیزاده', status: 'planning', priority: 'medium', start_date: d(0), end_date: d(90), budget: 0, spent: 0, progress: '' };
  }));
}
