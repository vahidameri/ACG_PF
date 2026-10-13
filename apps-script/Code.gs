/**
 * ACG Atlas (اطلس) — Google Sheets backend (Apps Script Web App)
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
 * Security: people sign in with Google; the email is matched to the Team tab, whose `access`
 * column decides what they receive: super (program manager, everything + back office),
 * exec (CEO), head (heads of product/tech), member (only their own projects). Legacy roles:
 *   admin  — read + write + manage
 *   editor — read + write
 *   viewer — read only (leadership)
 */

var SCHEMA = {
  Projects: ['id', 'code', 'name', 'description', 'category', 'owner', 'client', 'liaison', 'liaison_contact', 'status', 'priority', 'phase', 'start_date', 'end_date', 'progress', 'health_override', 'objective', 'paused_at', 'pause_reason'],
  Scope: ['id', 'project_id', 'item', 'type', 'status', 'change_note', 'date'],
  Milestones: ['id', 'project_id', 'title', 'planned_date', 'actual_date', 'status', 'owner', 'weight'],
  Sprints: ['id', 'project_id', 'name', 'start_date', 'end_date', 'goal', 'committed_points', 'completed_points', 'status'],
  Tasks: ['id', 'project_id', 'sprint_id', 'title', 'description', 'assignee', 'reporter', 'status', 'priority', 'due_date', 'points', 'tags', 'created_at', 'completed_at', 'track', 'depends_on', 'meeting_id', 'private'],
  // owner = who is chasing; follow-ups are personal
  FollowUps: ['id', 'project_id', 'subject', 'person', 'channel', 'due_date', 'status', 'priority', 'notes', 'created_at', 'done_at', 'owner'],
  Risks: ['id', 'project_id', 'title', 'type', 'probability', 'impact', 'owner', 'mitigation', 'status', 'due_date'],
  // capacity = % of one full-time person (100 = full-time, 600 = a team of six)
  // email = the Google account used to sign in; tasks_private = '1' hides this person's tasks (e.g. the CEO)
  // access: super | exec | head | member. key = optional personal key (sign-in without Google).
  Team: ['id', 'name', 'name_en', 'role', 'email', 'team', 'track', 'capacity', 'photo', 'tasks_private', 'phone', 'access', 'active', 'key'],
  // start_date / end_date are optional; blank = open-ended
  Allocations: ['id', 'member_id', 'project_id', 'percent', 'start_date', 'end_date'],
  Updates: ['id', 'project_id', 'week_date', 'author', 'health', 'summary', 'done', 'next', 'blockers'],
  // Comments on tasks / follow-ups / projects. created_at is "YYYY-MM-DD HH:mm".
  Comments: ['id', 'entity', 'entity_id', 'author', 'body', 'created_at'],
  // Delivery plan. baseline_date = first committed date (kept when target_date moves → slippage).
  Deliverables: ['id', 'project_id', 'title', 'track', 'owner', 'target_date', 'baseline_date', 'delivered_date', 'status', 'confidence', 'notes'],
  // Weekly meetings. series: portfolio | product | tech | project | other. attendees comma-separated; decisions one per line.
  Meetings: ['id', 'series', 'title', 'project_id', 'date', 'time', 'facilitator', 'attendees', 'status', 'notes', 'decisions', 'gcal_id', 'meet_url', 'duration'],
  // Uploaded files live in a Drive folder; this tab is the index.
  Files: ['id', 'entity', 'entity_id', 'name', 'mime', 'size', 'url', 'uploaded_by', 'created_at'],
  // Shared settings (automation switches: auto.<id> = on/off). id = key.
  Config: ['id', 'value'],
  // Contracts — only ever sent to super (program manager) and exec (CEO)
  Contracts: ['id', 'project_id', 'title', 'counterparty', 'number', 'kind', 'status', 'start_date', 'end_date', 'value', 'notes'],
};

var USERS_SHEET = 'Users';
var USERS_HEADERS = ['key', 'name', 'email', 'role', 'active'];
var LOG_SHEET = 'AuditLog';
var DATE_COLS = ['start_date', 'end_date', 'planned_date', 'actual_date', 'due_date', 'created_at', 'completed_at', 'done_at', 'week_date', 'date', 'target_date', 'baseline_date', 'delivered_date', 'time'];

// --------------------------------------------------------------------------
// HTTP entry points
// --------------------------------------------------------------------------

function doGet(e) {
  // No action → serve the app itself (Index.html). Everything runs on Google: no other hosting.
  if (!e.parameter.action) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('ACG Atlas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  try {
    var user = auth_(e.parameter);
    var action = e.parameter.action || 'all';
    var me = { name: user.name, role: user.role, email: user.email, access: user.access };
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
            guardPrivate_(body.sheet, body.action === 'delete' ? { id: body.id } : body.row, user);
      guardWrite_(body.sheet, body.action === 'delete' ? existingRow_(body.sheet, body.id) : body.row, user);
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

/**
 * Called from the app (google.script.run) in the "Execute as: User accessing the web app"
 * deployment. Hands the signed-in person their own Google token plus the data API address.
 * The token is the user's, so it can never act as anyone else; if this deployment were
 * misconfigured to run as the owner for other visitors, we refuse.
 */
function atlasSession() {
  var active = Session.getActiveUser().getEmail();
  var effective = Session.getEffectiveUser().getEmail();
  if (!active || active !== effective) throw new Error('این آدرس باید با «Execute as: User accessing the web app» منتشر شود.');
  return {
    token: ScriptApp.getOAuthToken(),
    email: active,
    apiUrl: PropertiesService.getScriptProperties().getProperty('API_URL') || '',
  };
}

/** Run once from the editor with the "Execute as: Me" deployment URL: setApiUrl('https://script.google.com/macros/s/…/exec') */
function setApiUrl(url) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('API_URL', url);
  // Only accept Google tokens issued to this script project (learned from your own token).
  var info = JSON.parse(UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + ScriptApp.getOAuthToken()).getContentText());
  var allowed = (props.getProperty('GOOGLE_CLIENT_ID') || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (info.azp && allowed.indexOf(info.azp) === -1) allowed.push(info.azp);
  props.setProperty('GOOGLE_CLIENT_ID', allowed.join(','));
  Logger.log('API_URL = ' + url + '\nGOOGLE_CLIENT_ID = ' + allowed.join(','));
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

var LEADERS = { super: 1, exec: 1, head: 1 };

function applyPrivacy_(data, user) {
  var owners = privateOwners_(data.Team || []);
  data.Team = (data.Team || []).map(function (m) { var c = {}; for (var k in m) if (k !== 'key') c[k] = m[k]; return c; });
  var hidden = {};
  data.Tasks = (data.Tasks || []).filter(function (t) {
    var ok = canSeeTask_(t, user, owners);
    if (!ok) hidden[t.id] = true;
    return ok;
  });
  data.Comments = (data.Comments || []).filter(function (c) { return !(c.entity === 'Tasks' && hidden[c.entity_id]); });
  data.Files = (data.Files || []).filter(function (f) { return !(f.entity === 'Tasks' && hidden[f.entity_id]); });
  return applyScope_(data, user, owners);
}

/** Access scoping (mirrors src/lib/access.ts). */
function applyScope_(data, user, owners) {
  var a = user.access || 'member';
  var me = user.name;
  // follow-ups are personal; super/exec see everyone's except another private person's
  data.FollowUps = (data.FollowUps || []).filter(function (f) {
    if (a === 'super' || a === 'exec') return !f.owner || f.owner === me || !owners[f.owner];
    return f.owner === me || f.person === me;
  });
  if (a !== 'super' && a !== 'exec') {
    data.Contracts = [];
    data.Files = data.Files.filter(function (f) { return f.entity !== 'Contracts'; });
  }
  if (LEADERS[a]) return data;
  var ok = allowedProjects_(data, me);
  var inP = function (pid) { return !!pid && !!ok[pid]; };
  var listed = function (s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).indexOf(me) !== -1; };
  ['Milestones', 'Sprints', 'Scope', 'Risks', 'Updates', 'Deliverables'].forEach(function (k) { data[k] = (data[k] || []).filter(function (r) { return inP(r.project_id); }); });
  var myId = ((data.Team || []).filter(function (m) { return m.name === me; })[0] || {}).id;
  data.Allocations = (data.Allocations || []).filter(function (r) { return inP(r.project_id) || r.member_id === myId; });
  data.Projects = (data.Projects || []).filter(function (p) { return ok[p.id]; });
  data.Tasks = data.Tasks.filter(function (t) { return inP(t.project_id) || t.assignee === me || t.reporter === me; });
  data.Meetings = (data.Meetings || []).filter(function (m) { return listed(m.attendees) || m.facilitator === me || inP(m.project_id); });
  var vis = { Tasks: {}, Projects: ok, Meetings: {}, FollowUps: {}, Deliverables: {}, Risks: {}, Team: {} };
  data.Tasks.forEach(function (t) { vis.Tasks[t.id] = 1; });
  data.Meetings.forEach(function (m) { vis.Meetings[m.id] = 1; });
  data.FollowUps.forEach(function (f) { vis.FollowUps[f.id] = 1; });
  data.Deliverables.forEach(function (d) { vis.Deliverables[d.id] = 1; });
  data.Risks.forEach(function (r) { vis.Risks[r.id] = 1; });
  data.Team.forEach(function (m) { vis.Team[m.id] = 1; });
  data.Comments = data.Comments.filter(function (c) { return vis[c.entity] && vis[c.entity][c.entity_id]; });
  data.Files = data.Files.filter(function (f) { return vis[f.entity] && vis[f.entity][f.entity_id]; });
  data.Contracts = [];
  return data;
}

function allowedProjects_(data, me) {
  var ok = {};
  var myId = ((data.Team || []).filter(function (m) { return m.name === me; })[0] || {}).id;
  (data.Projects || []).forEach(function (p) { if (p.owner === me) ok[p.id] = 1; });
  (data.Allocations || []).forEach(function (a) { if (a.member_id === myId) ok[a.project_id] = 1; });
  (data.Tasks || []).forEach(function (t) { if (t.project_id && t.assignee === me) ok[t.project_id] = 1; });
  (data.Deliverables || []).forEach(function (d) { if (d.owner === me) ok[d.project_id] = 1; });
  return ok;
}

/** What each access level may write. */
function guardWrite_(sheet, row, user) {
  var a = user.access || 'member';
  if (sheet === 'Config' && a !== 'super') throw new Error('فقط مدیر برنامه می‌تواند تنظیمات را تغییر دهد');
  if (sheet === 'Contracts' && a !== 'super' && a !== 'exec') throw new Error('دسترسی به قراردادها ندارید');
  if (sheet === 'Team' && a !== 'super') {
    // anyone may update their own photo / phone; only the program manager manages people
    var cur = readSheet_(SpreadsheetApp.getActive().getSheetByName('Team')).filter(function (m) { return String(m.id) === String(row.id); })[0];
    if (!cur || cur.name !== user.name) throw new Error('فقط مدیر برنامه می‌تواند افراد را تعریف یا ویرایش کند');
    ['access', 'active', 'key', 'tasks_private', 'email', 'name'].forEach(function (k) { row[k] = cur[k]; });
  }
  if (LEADERS[a] || !row) return;
  if (sheet === 'Projects' || sheet === 'Allocations') throw new Error('فقط لیدرشیپ می‌تواند پروژه و تخصیص را تغییر دهد');
  if (sheet === 'FollowUps' && row.owner && row.owner !== user.name) throw new Error('فالوآپ دیگران را نمی‌توانید تغییر دهید');
  if (sheet === 'FollowUps') row.owner = user.name;
  if (row.project_id) {
    var ok = allowedProjects_(readAll_(), user.name);
    var own = sheet === 'Tasks' && (row.assignee === user.name || row.reporter === user.name);
    if (!ok[row.project_id] && !own) throw new Error('این پروژه در دسترس شما نیست');
  }
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

function existingRow_(sheet, id) {
  var sh = SpreadsheetApp.getActive().getSheetByName(sheet);
  if (!sh) return null;
  return readSheet_(sh).filter(function (r) { return String(r.id) === String(id); })[0] || null;
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
  var ss = SpreadsheetApp.getActive();
  var team = ss.getSheetByName('Team') ? readSheet_(ss.getSheetByName('Team')) : [];
  var legacy = ss.getSheetByName(USERS_SHEET) ? readSheet_(ss.getSheetByName(USERS_SHEET)) : [];
  var active = function (u) { return String(u.active).toLowerCase() !== 'false'; };
  var fromTeam = function (m) { return { name: m.name, email: String(m.email || '').toLowerCase(), access: m.access || 'member', role: 'editor' }; };
  // legacy Users rows: admin → super, viewer stays read-only
  var fromUsers = function (u) {
    var r = (u.role || 'viewer').toLowerCase();
    var m = team.filter(function (t) { return t.name === u.name; })[0];
    return { name: u.name, email: String(u.email || '').toLowerCase(), access: m && m.access ? m.access : r === 'admin' ? 'super' : 'member', role: r === 'viewer' ? 'viewer' : 'editor' };
  };
  var find = function (list, pred) { for (var i = 0; i < list.length; i++) if (active(list[i]) && pred(list[i])) return list[i]; return null; };
  if (params.access_token) {
    var email = googleEmail_(params.access_token);
    var m = find(team, function (x) { return String(x.email).toLowerCase() === email; });
    if (m) return fromTeam(m);
    var u = find(legacy, function (x) { return String(x.email).toLowerCase() === email; });
    if (u) return fromUsers(u);
    throw new Error('حساب ' + email + ' تعریف نشده است. از مدیر برنامه بخواهید شما را در بک‌آفیس اضافه کند.');
  }
  if (!params.token) throw new Error('وارد نشده‌اید');
  var k = find(team, function (x) { return x.key && String(x.key) === String(params.token); });
  if (k) return fromTeam(k);
  var lu = find(legacy, function (x) { return x.key && String(x.key) === String(params.token); });
  if (lu) return fromUsers(lu);
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
  var clients = (PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (!clients.length) throw new Error('تنظیم ناقص: setApiUrl را یک بار اجرا کنید');
  if (clients.indexOf(info.aud) === -1 && clients.indexOf(info.azp) === -1) throw new Error('این توکن برای این برنامه صادر نشده است');
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
          subject: 'ACG Atlas · ' + user.name + ' mentioned you',
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
  ensureSheet_(LOG_SHEET, ['time', 'user', 'action', 'sheet', 'id']);
  var ss = SpreadsheetApp.getActive();
  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('برگه۱');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  // The person running setup becomes the super admin (program manager).
  var team = ss.getSheetByName('Team');
  if (team.getLastRow() < 2) {
    var key = newKey_();
    var me = Session.getEffectiveUser().getEmail();
    upsert_('Team', { id: 'm1', name: 'وحید عامری', name_en: 'Vahid Ameri', role: 'مدیر برنامه', email: me, team: 'PMO', capacity: 100, access: 'super', active: 'true', key: key }, { name: 'setup' });
    safeAlert_('راه‌اندازی انجام شد. شما (' + me + ') سوپر ادمین هستید.\n\nکلید پشتیبان (برای ورود بدون گوگل):\n' + key);
    Logger.log('Admin key: ' + key);
  }
}

/** Adds a person from the editor: addUser('آتنا دهقان', 'athena@acg.com', 'member'). Easier: use the back office in the app. */
function addUser(name, email, access) {
  var id = 'M-' + Utilities.getUuid().slice(0, 6);
  upsert_('Team', { id: id, name: name, email: email || '', access: access || 'member', active: 'true', capacity: 100 }, { name: 'editor' });
  Logger.log(name + ' → ' + id);
  return id;
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
    .createMenu('ACG Atlas')
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
  var r = ui.prompt('دسترسی: super / exec / head / member').getResponseText() || 'member';
  addUser(n, em, r);
  ui.alert(n + ' اضافه شد و می‌تواند با ' + em + ' وارد شود.');
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
  // the digest goes to the program manager: scoped as super, so the CEO's private items stay out
  var all = readAll_();
  var pm = (all.Team || []).filter(function (m) { return m.access === 'super'; })[0] || {};
  var data = applyPrivacy_(all, { name: pm.name || '', access: 'super' });
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
    '<h2 style="margin:0 0 8px">خلاصه‌ی امروز — اطلس ACG</h2>' +
    sec('فالوآپ‌های امروز و معوق', '#e13748', fus.map(function (f) { return li('<b>' + f.subject + '</b> — ' + f.person + (f.project_id ? ' · ' + (pname[f.project_id] || '') : '') + ' · ' + f.due_date); })) +
    sec('تسک‌های امروز', '#4f46e5', todayTasks.map(function (t) { return li(t.title + ' — ' + t.assignee + (t.project_id ? ' · ' + (pname[t.project_id] || '') : '')); })) +
    sec('تسک‌های معوق', '#d98d06', overdueTasks.map(function (t) { return li(t.title + ' — ' + t.assignee + ' · سررسید ' + t.due_date); })) +
    sec('تسک‌های مسدود', '#e13748', blocked.map(function (t) { return li(t.title + ' — ' + t.assignee + (t.description ? ' · ' + t.description : '')); })) +
    sec('مایلستون‌های عقب‌افتاده', '#e13748', ms.map(function (m) { return li(m.title + ' · ' + (pname[m.project_id] || '') + ' · ' + m.planned_date); })) +
    '<p style="color:#666;margin-top:24px;font-size:12px">این ایمیل به‌صورت خودکار از Google Sheet پورتفولیو ارسال شده است.</p></div>';

  var to = PropertiesService.getScriptProperties().getProperty('DIGEST_TO') || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: to, subject: 'ACG Atlas · خلاصه‌ی ' + today, htmlBody: html });
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
    MailApp.sendEmail({ to: to, subject: 'ACG Atlas · ' + missing.length + ' گزارش هفتگی ارسال نشده', htmlBody: '<div dir="rtl" style="font-family:Tahoma,sans-serif">' + missing.map(function (p) { return p.name + ' — ' + p.owner; }).join('<br>') + '</div>' });
  }
}

// --------------------------------------------------------------------------
// Files — uploads go to one shared Drive folder ("ACG Atlas files"), indexed in the Files tab.
// Script property FILE_SHARING: 'link' (default, anyone with the link) or 'domain'.
// --------------------------------------------------------------------------

// Drive REST with the owner's token: only needs the narrow drive.file scope.
function drive_(method, path, payload, contentType) {
  var res = UrlFetchApp.fetch('https://www.googleapis.com' + path, {
    method: method, contentType: contentType || 'application/json', payload: payload,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error('Drive: ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText() || '{}');
}

function filesFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) return id;
  var f = drive_('post', '/drive/v3/files', JSON.stringify({ name: 'ACG Atlas files', mimeType: 'application/vnd.google-apps.folder' }));
  props.setProperty('FOLDER_ID', f.id);
  return f.id;
}

function upload_(b, user) {
  if (!b.data || !b.name) throw new Error('فایل ارسال نشده است');
  guardPrivate_('Files', { entity: b.entity, entity_id: b.entity_id }, user);
  var bytes = Utilities.base64Decode(b.data);
  if (bytes.length > 10 * 1024 * 1024) throw new Error('حداکثر حجم فایل ۱۰ مگابایت است');
  var boundary = 'atlas' + Date.now();
  var meta = JSON.stringify({ name: b.name, parents: [filesFolder_()] });
  var body = Utilities.newBlob(
    '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + boundary + '\r\nContent-Type: ' + (b.mime || 'application/octet-stream') + '\r\n\r\n'
  ).getBytes().concat(bytes).concat(Utilities.newBlob('\r\n--' + boundary + '--').getBytes());
  var file = drive_('post', '/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', body, 'multipart/related; boundary=' + boundary);
  // anyone with the link can view, so images render inside the app
  var sharing = PropertiesService.getScriptProperties().getProperty('FILE_SHARING') || 'link';
  var domain = sharing === 'domain' ? String(Session.getEffectiveUser().getEmail()).split('@')[1] : '';
  drive_('post', '/drive/v3/files/' + file.id + '/permissions', JSON.stringify(domain ? { role: 'reader', type: 'domain', domain: domain } : { role: 'reader', type: 'anyone' }));
  var isImage = String(b.mime || '').indexOf('image/') === 0;
  var row = {
    id: 'FL-' + Utilities.getUuid().slice(0, 8), entity: b.entity, entity_id: b.entity_id, name: b.name, mime: b.mime, size: bytes.length,
    // images use the thumbnail endpoint so they render inside <img>
    url: isImage ? 'https://drive.google.com/thumbnail?id=' + file.id + '&sz=w600' : file.webViewLink,
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
    '<p style="color:#888;font-size:12px;margin-top:20px">ارسال خودکار از اطلس ACG — ' + esc(user.name) + '</p></div>';
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
      subject: 'اطلس ACG · ' + by[who].length + ' اقدام عقب‌افتاده',
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

/** Fills the sheet with the real team and project names (nothing else). Safe to run twice. */
function seedDemo() {
  setup();
  var put = function (name, rows) {
    var sh = ensureSheet_(name, SCHEMA[name]);
    var h = SCHEMA[name];
    var have = readSheet_(sh).map(function (r) { return String(r.id); });
    rows = rows.filter(function (r) { return have.indexOf(String(r.id)) === -1; });
    var vals = rows.map(function (r) { return h.map(function (k) { return r[k] === undefined ? '' : r[k]; }); });
    if (vals.length) sh.getRange(sh.getLastRow() + 1, 1, vals.length, h.length).setValues(vals);
  };
  put('Team', [
    ['m1', 'وحید عامری', 'Vahid Ameri', 'مدیر برنامه', '', 'super'],
    ['m2', 'جلیل علیزاده', 'Jalil Alizadeh', 'مدیرعامل', '', 'exec'],
    ['m3', 'وحید کیوانیان', 'Vahid Keyvanian', 'هد تک', 'tech', 'head'],
    ['m4', 'مهرزاد گلی', 'Mehrzad Goli', 'هد پروداکت', 'product', 'head'],
    ['m5', 'آتنا دهقان', 'Athena Dehghan', 'پروداکت منیجر', 'product', 'member'],
    ['m6', 'علی سرمیلی', 'Ali Sormeili', 'پروداکت منیجر', 'product', 'member'],
    ['m7', 'علی سالمه', 'Ali Salemeh', 'پروداکت منیجر', 'product', 'member'],
    ['m8', 'مهرسا دبیر', 'Mehrsa Dabir', 'پروداکت منیجر', 'product', 'member'],
    ['m9', 'بابک معروفی', 'Babak Maroufi', 'پروداکت منیجر', 'product', 'member'],
    ['m10', 'امین ظفری', 'Amin Zafari', 'پروداکت منیجر', 'product', 'member'],
    ['m11', 'هانیه منصورکیایی', 'Hanie Mansurkiae', 'پروداکت دیزاینر', 'product', 'member'],
  ].map(function (r) {
    return { id: r[0], name: r[1], name_en: r[2], role: r[3], track: r[4], access: r[5], capacity: 100, active: 'true', tasks_private: r[5] === 'exec' ? '1' : '' };
  }));
  put('Projects', ['CX Orbit', 'Insight X Padida', 'Roo B Roo', 'Kadiner', 'HamAfza', 'Myca', 'malek', 'SimiPass', 'Ino School', 'AISN', 'Clarity Pass'].map(function (name, i) {
    return { id: 'p' + (i + 1), code: name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase(), name: name, status: 'active', priority: 'medium' };
  }));
}
