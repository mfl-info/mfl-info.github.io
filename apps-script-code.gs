/**
 * MFL Season 7 backend (Google Apps Script) - registration + ADMIN PANEL
 * Paste this whole file into Extensions > Apps Script of your Google Sheet (replace everything).
 *
 * FIRST TIME ONLY
 *  1. Project Settings (gear icon) > Script properties > Add property:  ADMIN_PASSWORD = (your secret password)
 *  2. Run the function  setup()  once (creates the tabs and the weekly backup).
 *  3. Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone > Deploy. Copy the /exec link into config.js (scriptUrl).
 *  After changing this code later: Deploy > Manage deployments > pencil > New version > Deploy.
 *
 * Capacity: 8 Captains + 40 Players + 8 Goalkeepers = 56. ONLINE + OFFLINE(confirmed) count together.
 * The public website only ever gets the COMBINED number. The online/offline split is for the admin panel only.
 */

// ---------------- EDIT THESE ----------------
const PAY_NUMBER  = '01740468822';                                   // bKash / Nagad number (shown only to approved people)
const SEASON      = 'Season 7';
const FEES        = { Player: 280, Goalkeeper: 280, Captain: 700 };  // keep the same as config.js
const CAPACITY    = { Captain: 8, Player: 40, Goalkeeper: 8 };       // per type
const TOTAL_CAPACITY = 56;
const OPEN_AT     = '2026-12-16T00:00:00+06:00';                     // normal opening time (admin panel can override)
const CLOSE_AT    = '';                                              // normal closing time. Empty = none (admin panel can override)
const AGE_MIN     = 12;
const AGE_MAX     = 25;
const NOTIFY      = '';                                              // alert email. Empty = your own Google account email.
const BACKUP_KEEP = 8;
const ADMIN_HOURS = 6;                                               // admin login lasts this many hours
// --------------------------------------------

const SHEET_NAME = 'Applications', OFFLINE_SHEET = 'Offline', CONTENT_SHEET = 'Content', SUMMARY_SHEET = 'Summary';
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Payment submitted', 'Confirmed'];
const HEADERS = ['Time', 'ID', 'Season', 'Name', 'Age', 'Type', 'Phone', 'Address',
                 'Status', 'Amount (BDT)', 'Paid with', 'Paid from', 'TrxID', 'Paid at', 'Note'];
const C = { TIME: 1, ID: 2, SEASON: 3, NAME: 4, AGE: 5, TYPE: 6, PHONE: 7, ADDRESS: 8,
            STATUS: 9, AMOUNT: 10, METHOD: 11, SENDER: 12, TRX: 13, PAIDAT: 14, NOTE: 15 };
const OFF_HEADERS = ['ID', 'Time', 'Season', 'Name', 'Type', 'Payment', 'Status', 'Phone', 'Note'];
const OFF_TYPES = Object.keys(CAPACITY), OFF_PAY = ['Cash', 'bKash', 'Nagad', 'Other'], OFF_STATUS = ['Confirmed', 'Pending', 'Cancelled'];
// what the admin panel may store (anything else is dropped)
const SCHEMAS = {
  news: ['id', 'title', 'date', 'summary', 'link', 'image'],
  s7teams: ['name', 'group', 'captain', 'note'],
  s7schedule: ['date', 'time', 'home', 'away', 'venue', 'stage'],
  s7results: ['home', 'away', 'hs', 'as', 'stage', 'date', 'scorers', 'motm'],
  s7awards: ['title', 'winner', 'note'],
  gallery: ['url', 'caption', 'season'],
  highlights: ['title', 'url', 'season']
};
const URL_FIELDS = ['link', 'image', 'url'];

// ================= entry points =================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    const a = String(d.action || '');
    if (a === 'apply') return apply(d);
    if (a === 'status') return status(d);
    if (a === 'pay') return pay(d);
    if (a.indexOf('admin_') === 0) return admin(a, d);
    return reply({ ok: false, error: 'invalid' });
  } catch (err) {
    return reply({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

// Public, read-only. Never returns names, phones, or the online/offline split.
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'summary') return reply(summary(p.season ? String(p.season) : SEASON));
    if (p.action === 'content') return reply(publicContent(String(p.page || '')));
  } catch (err) { return reply({ ok: false, error: 'server' }); }
  return reply({ ok: false, error: 'invalid' });
}

// ================= registration (public) =================
function apply(d) {
  if (d.website) return reply({ ok: true, id: 'MFL-S7-00000' });          // bot trap
  const now = new Date().getTime();
  if (now < new Date(effOpen()).getTime()) return reply({ ok: false, error: 'notopen' });
  const close = effClose();
  if (close && now > new Date(close).getTime()) return reply({ ok: false, error: 'closed' });

  const name = clean(d.name, 60), address = clean(d.address, 120), type = String(d.type);
  const age = Number(d.age), phone = normPhone(d.phone);
  if (name.length < 2 || address.length < 3 || !FEES[type] || !CAPACITY[type] ||
      !(age >= AGE_MIN && age <= AGE_MAX) || !/^01[3-9]\d{8}$/.test(phone)) {
    return reply({ ok: false, error: 'invalid' });
  }
  const sh = getSheet(), rows = readRows(sh);
  for (const r of rows) {
    if (normPhone(r[C.PHONE - 1]) === phone && String(r[C.SEASON - 1]) === SEASON) return reply({ ok: false, error: 'exists' });
  }
  const c = counts(SEASON);                                              // online + offline together
  if (c.combined.total >= TOTAL_CAPACITY || c.combined[type] >= CAPACITY[type]) return reply({ ok: false, error: 'full' });

  const ids = rows.map(r => String(r[C.ID - 1]));
  let id;
  do { id = 'MFL-S7-' + randomCode(5); } while (ids.indexOf(id) !== -1);
  sh.appendRow([new Date(), id, SEASON, name, age, type, phone, address, 'Pending', '', '', '', '', '', '']);
  ensureSummary();
  notify('MFL: new application - ' + name,
         name + ' (' + type + ', age ' + age + ') has applied.\nID: ' + id +
         '\n\nOpen the admin panel or the sheet to call and verify:\n' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  return reply({ ok: true, id: id });
}

function status(d) {
  const f = find(d.id, d.phone);
  if (!f) return reply({ ok: false, error: 'notfound' });
  const st = String(f.row[C.STATUS - 1]) || 'Pending';
  const out = { ok: true, status: st, name: f.row[C.NAME - 1], type: f.row[C.TYPE - 1] };
  if (st === 'Approved') { out.amount = FEES[out.type]; out.number = PAY_NUMBER; }
  return reply(out);
}

function pay(d) {
  const f = find(d.id, d.phone);
  if (!f) return reply({ ok: false, error: 'notfound' });
  if (String(f.row[C.STATUS - 1]) !== 'Approved') return reply({ ok: false, error: 'notallowed' });
  const sender = normPhone(d.sender), method = String(d.method), trx = clean(d.trx, 14).toUpperCase();
  if (['bKash', 'Nagad'].indexOf(method) === -1 || !/^01[3-9]\d{8}$/.test(sender) || !/^[A-Z0-9]{6,14}$/.test(trx)) {
    return reply({ ok: false, error: 'invalid' });
  }
  const sh = getSheet();
  const used = sh.getLastRow() > 1 ? sh.getRange(2, C.TRX, sh.getLastRow() - 1, 1).getValues() : [];
  if (used.some(r => String(r[0]).toUpperCase() === trx)) return reply({ ok: false, error: 'duplicate' });
  const type = String(f.row[C.TYPE - 1]);
  sh.getRange(f.rowNum, C.AMOUNT).setValue(FEES[type]);
  sh.getRange(f.rowNum, C.METHOD).setValue(method);
  sh.getRange(f.rowNum, C.SENDER).setValue(sender);
  sh.getRange(f.rowNum, C.TRX).setValue(trx);
  sh.getRange(f.rowNum, C.PAIDAT).setValue(new Date());
  sh.getRange(f.rowNum, C.STATUS).setValue('Payment submitted');
  notify('MFL: payment submitted - ' + f.row[C.NAME - 1],
         f.row[C.NAME - 1] + ' (' + type + ') sent TrxID ' + trx + '.\nExpected amount: ' + FEES[type] + ' BDT.\nPaid with ' + method +
         '. Check it against your ' + method + ' SMS, then set Status to Confirmed.');
  return reply({ ok: true });
}

// ================= counting (online + offline) =================
function counts(season) {
  const on = { Captain: 0, Player: 0, Goalkeeper: 0, total: 0 };
  const off = { Captain: 0, Player: 0, Goalkeeper: 0, total: 0 };
  readRows(getSheet()).forEach(r => {
    const t = String(r[C.TYPE - 1]);
    if (String(r[C.SEASON - 1]) === season && String(r[C.STATUS - 1]) !== 'Rejected' && on[t] !== undefined) { on[t]++; on.total++; }
  });
  readOffline().forEach(r => {
    if (r.season === season && r.status === 'Confirmed' && off[r.type] !== undefined) { off[r.type]++; off.total++; }
  });
  const both = { total: on.total + off.total };
  OFF_TYPES.forEach(t => { both[t] = on[t] + off[t]; });
  return { online: on, offline: off, combined: both };
}

// PUBLIC: combined numbers only.
function summary(season) {
  const b = counts(season).combined;
  return { ok: true, season: season, total: b.total, capacity: TOTAL_CAPACITY, remaining: Math.max(0, TOTAL_CAPACITY - b.total),
           full: b.total >= TOTAL_CAPACITY, captains: b.Captain, players: b.Player, goalkeepers: b.Goalkeeper };
}

// ================= settings (open/lock) =================
function getSettings() {
  const s = readJson('settings', {});
  return { mode: ['auto', 'open', 'locked'].indexOf(s.mode) >= 0 ? s.mode : 'auto', opensAt: s.opensAt || '', closesAt: s.closesAt || '',
           notice: s.notice || '', noticeLink: s.noticeLink || '' };
}
function effOpen() {
  const s = getSettings();
  if (s.mode === 'open') return '2020-01-01T00:00:00+06:00';
  if (s.mode === 'locked') return '2100-01-01T00:00:00+06:00';
  return s.opensAt || OPEN_AT;
}
function effClose() { const s = getSettings(); return s.mode === 'auto' ? (s.closesAt || CLOSE_AT) : ''; }
function openForTest() { saveSettings({ mode: 'open' }); }          // kept for the old guide; the admin panel does this now
function lockRegistration() { saveSettings({ mode: 'auto' }); }
function saveSettings(patch) { writeJson('settings', Object.assign(getSettings(), patch)); }

// ================= public site content =================
function publicContent(page) {
  const all = readContent(), s = getSettings(), out = { ok: true, collections: {}, v: 0 };
  Object.keys(SCHEMAS).forEach(k => { out.collections[k] = all[k] ? safeParse(all[k].value, []) : []; });
  out.settings = { opensAt: effOpen(), closesAt: effClose(), notice: s.notice, noticeLink: s.noticeLink };
  if (/^[a-z0-9-]+\.html$/.test(page)) out.patches = all['patch:' + page] ? safeParse(all['patch:' + page].value, []) : [];
  Object.keys(all).forEach(k => { out.v = Math.max(out.v, all[k].updated); });
  return out;
}

// ================= ADMIN =================
function admin(a, d) {
  if (a === 'admin_login') return adminLogin(d);
  if (!adminOk(d)) return reply({ ok: false, error: 'auth' });
  switch (a) {
    case 'admin_ping': return reply({ ok: true });
    case 'admin_logout': CacheService.getScriptCache().remove('adm_' + d.token); return reply({ ok: true });
    case 'admin_overview': return reply({ ok: true, season: SEASON, total: TOTAL_CAPACITY, capacity: CAPACITY, fees: FEES,
                                          counts: counts(SEASON), settings: getSettings(), effective: { opensAt: effOpen(), closesAt: effClose() } });
    case 'admin_apps': return reply({ ok: true, rows: readRows(getSheet()).map(appObj) });
    case 'admin_set_status': return setStatus(d);
    case 'admin_offline_list': return reply({ ok: true, rows: readOffline() });
    case 'admin_offline_save': return offlineSave(d);
    case 'admin_offline_delete': return offlineDelete(d);
    case 'admin_settings_save': return settingsSave(d);
    case 'admin_content_get': return contentGet(d);
    case 'admin_content_save': return contentSave(d);
    case 'admin_upload': return upload(d);
  }
  return reply({ ok: false, error: 'invalid' });
}

function adminLogin(d) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('adm_fail') || 0);
  if (fails >= 8) return reply({ ok: false, error: 'locked' });             // too many wrong tries: wait 15 minutes
  const pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pw || pw.length < 6) return reply({ ok: false, error: 'not_configured' });
  if (!safeEqual(String(d.password || ''), pw)) { cache.put('adm_fail', String(fails + 1), 900); return reply({ ok: false, error: 'bad_password' }); }
  cache.remove('adm_fail');
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  cache.put('adm_' + token, '1', ADMIN_HOURS * 3600);
  return reply({ ok: true, token: token });
}
function adminOk(d) {
  const t = String(d.token || '');
  return /^[a-f0-9]{64}$/.test(t) && !!CacheService.getScriptCache().get('adm_' + t);
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

function appObj(r) {
  return { id: r[C.ID - 1], time: r[C.TIME - 1], season: r[C.SEASON - 1], name: r[C.NAME - 1], age: r[C.AGE - 1], type: r[C.TYPE - 1],
           phone: String(r[C.PHONE - 1]), address: r[C.ADDRESS - 1], status: r[C.STATUS - 1], amount: r[C.AMOUNT - 1],
           method: r[C.METHOD - 1], sender: String(r[C.SENDER - 1]), trx: r[C.TRX - 1], paidAt: r[C.PAIDAT - 1], note: r[C.NOTE - 1] };
}
function setStatus(d) {
  const id = String(d.id || '').toUpperCase(), st = String(d.status);
  if (STATUSES.indexOf(st) === -1) return reply({ ok: false, error: 'invalid' });
  const rows = readRows(getSheet());
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][C.ID - 1]).toUpperCase() === id) {
      const sh = getSheet();
      sh.getRange(i + 2, C.STATUS).setValue(st);
      if (d.note !== undefined) sh.getRange(i + 2, C.NOTE).setValue(clean(d.note, 200));
      return reply({ ok: true });
    }
  }
  return reply({ ok: false, error: 'notfound' });
}

function offlineSave(d) {
  const it = d.item || {};
  const type = String(it.type), pay = String(it.payment || 'Cash'), st = String(it.status || 'Confirmed');
  const name = clean(it.name, 60);
  if (name.length < 2 || OFF_TYPES.indexOf(type) < 0 || OFF_PAY.indexOf(pay) < 0 || OFF_STATUS.indexOf(st) < 0) return reply({ ok: false, error: 'invalid' });
  const sh = offSheet(), rows = readOffline();
  const editing = it.id ? rows.filter(r => r.id === String(it.id))[0] : null;
  if (it.id && !editing) return reply({ ok: false, error: 'notfound' });
  if (st === 'Confirmed') {                                                // must fit inside the same 56 places
    const c = counts(SEASON).combined;
    const was = editing && editing.status === 'Confirmed' && editing.season === SEASON ? editing.type : null;
    const total = c.total - (was ? 1 : 0), ofType = c[type] - (was === type ? 1 : 0);
    if (total >= TOTAL_CAPACITY || ofType >= CAPACITY[type]) return reply({ ok: false, error: 'full' });
  }
  const phone = it.phone ? normPhone(it.phone) : '', note = clean(it.note, 200);
  if (editing) {
    sh.getRange(editing.row, 4, 1, 6).setValues([[name, type, pay, st, phone, note]]);
    return reply({ ok: true, id: editing.id });
  }
  let n = 0; rows.forEach(r => { const m = /^MFL-S7-O(\d+)$/.exec(r.id); if (m) n = Math.max(n, Number(m[1])); });
  const id = 'MFL-S7-O' + String(n + 1).padStart(3, '0');
  sh.appendRow([id, new Date(), SEASON, name, type, pay, st, phone, note]);
  return reply({ ok: true, id: id });
}
function offlineDelete(d) {
  const rows = readOffline(), r = rows.filter(x => x.id === String(d.id))[0];
  if (!r) return reply({ ok: false, error: 'notfound' });
  offSheet().deleteRow(r.row);
  return reply({ ok: true });
}

function settingsSave(d) {
  const s = d.settings || {};
  const iso = v => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(String(v)) ? String(v) : '');
  saveSettings({ mode: ['auto', 'open', 'locked'].indexOf(s.mode) >= 0 ? s.mode : 'auto', opensAt: iso(s.opensAt), closesAt: iso(s.closesAt),
                 notice: clean(s.notice, 240), noticeLink: safeUrl(s.noticeLink) });
  return reply({ ok: true, settings: getSettings(), effective: { opensAt: effOpen(), closesAt: effClose() } });
}

function contentGet(d) {
  const key = String(d.key || '');
  if (!SCHEMAS[key] && !/^patch:[a-z0-9-]+\.html$/.test(key)) return reply({ ok: false, error: 'invalid' });
  return reply({ ok: true, value: readJson(key, []) });
}
function contentSave(d) {
  const key = String(d.key || ''), val = d.value;
  if (!Array.isArray(val) || val.length > 300) return reply({ ok: false, error: 'invalid' });
  let out;
  if (SCHEMAS[key]) {
    out = val.map(it => {
      const o = {};
      SCHEMAS[key].forEach(f => {
        let v = String((it && it[f] != null) ? it[f] : '').trim().slice(0, f === 'summary' || f === 'scorers' ? 1500 : 300);
        if (URL_FIELDS.indexOf(f) >= 0) v = safeUrl(v);
        o[f] = v;
      });
      return o;
    });
  } else if (/^patch:[a-z0-9-]+\.html$/.test(key)) {
    out = val.filter(p => p && typeof p.p === 'string' && p.p.length < 300 && (p.l === 'en' || p.l === 'bn') &&
                          typeof p.h === 'string' && p.h.length < 4000 && !/<\s*(script|iframe|object|embed|style|link|meta)|\son\w+\s*=|javascript:/i.test(p.h))
             .map(p => ({ p: p.p, l: p.l, h: p.h, o: String(p.o || '').slice(0, 60) }));
  } else return reply({ ok: false, error: 'invalid' });
  if (JSON.stringify(out).length > 45000) return reply({ ok: false, error: 'too_big' });
  writeJson(key, out);
  return reply({ ok: true, count: out.length });
}

function upload(d) {
  const mime = String(d.mime || ''), data = String(d.data || '');
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0 || data.length < 100 || data.length > 1700000) return reply({ ok: false, error: 'invalid' });
  const name = String(d.name || 'photo').replace(/[^\w.-]+/g, '_').slice(0, 60);
  const it = DriveApp.getFoldersByName('MFL Uploads');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('MFL Uploads');
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(data), mime, new Date().getTime() + '_' + name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return reply({ ok: true, id: file.getId(), url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1400' });
}

// ================= sheets =================
function readRows(sh) { return sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues() : []; }
function find(id, phone) {
  const key = String(id || '').trim().toUpperCase(), ph = normPhone(phone);
  if (!key || !ph) return null;
  const rows = readRows(getSheet());
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][C.ID - 1]).toUpperCase() === key && normPhone(rows[i][C.PHONE - 1]) === ph) return { row: rows[i], rowNum: i + 2 };
  }
  return null;
}
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    [C.ID, C.PHONE, C.SENDER, C.TRX].forEach(c => sh.getRange(2, c, 1999, 1).setNumberFormat('@'));
    sh.getRange(2, C.STATUS, 1999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  }
  return sh;
}
function offSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(OFFLINE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(OFFLINE_SHEET);
    sh.appendRow(OFF_HEADERS); sh.setFrozenRows(1); sh.getRange(1, 1, 1, OFF_HEADERS.length).setFontWeight('bold');
    [[5, OFF_TYPES], [6, OFF_PAY], [7, OFF_STATUS]].forEach(p =>
      sh.getRange(2, p[0], 1999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(p[1], true).setAllowInvalid(false).build()));
    sh.getRange(2, 8, 1999, 1).setNumberFormat('@');
  }
  return sh;
}
function readOffline() {
  const sh = offSheet();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, OFF_HEADERS.length).getValues().map((r, i) => ({
    row: i + 2, id: String(r[0]), time: r[1], season: String(r[2]), name: String(r[3]), type: String(r[4]), payment: String(r[5]),
    status: String(r[6]), phone: String(r[7]), note: String(r[8]) })).filter(r => r.id);
}
function contentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONTENT_SHEET);
  if (!sh) { sh = ss.insertSheet(CONTENT_SHEET); sh.appendRow(['Key', 'Value (JSON)', 'Updated']); sh.setFrozenRows(1); sh.getRange(1, 1, 1, 3).setFontWeight('bold'); }
  return sh;
}
function readContent() {
  const sh = contentSheet(), out = {};
  if (sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(r => {
    if (r[0]) out[String(r[0])] = { value: String(r[1]), updated: r[2] ? new Date(r[2]).getTime() : 0 };
  });
  return out;
}
function readJson(key, dflt) { const a = readContent()[key]; return a ? safeParse(a.value, dflt) : dflt; }
function writeJson(key, obj) {
  const sh = contentSheet(), n = sh.getLastRow();
  const keys = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0])) : [];
  const i = keys.indexOf(key), val = JSON.stringify(obj);
  if (i >= 0) { sh.getRange(i + 2, 2).setValue(val); sh.getRange(i + 2, 3).setValue(new Date()); }
  else sh.appendRow([key, val, new Date()]);
}
function safeParse(s, dflt) { try { const v = JSON.parse(s); return v == null ? dflt : v; } catch (e) { return dflt; } }

function ensureSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SUMMARY_SHEET)) return;
  offSheet();
  const sh = ss.insertSheet(SUMMARY_SHEET), A = SHEET_NAME, O = OFFLINE_SHEET;
  sh.getRange(1, 1, 9, 2).setValues([
    ['MFL ' + SEASON + ' - registration summary', ''], ['', ''], ['Online by status', 'People'],
    ['Pending (waiting for the call)', '=COUNTIF(' + A + '!I2:I,"Pending")'], ['Approved (can pay)', '=COUNTIF(' + A + '!I2:I,"Approved")'],
    ['Payment submitted (check SMS)', '=COUNTIF(' + A + '!I2:I,"Payment submitted")'], ['Confirmed', '=COUNTIF(' + A + '!I2:I,"Confirmed")'],
    ['Rejected', '=COUNTIF(' + A + '!I2:I,"Rejected")'], ['All online applications', '=COUNTA(' + A + '!B2:B)']]);
  sh.getRange(11, 1, 1, 6).setValues([['By type', 'Places', 'Online', 'Offline', 'Combined', 'Left']]);
  OFF_TYPES.forEach((t, i) => {
    const r = 12 + i;
    sh.getRange(r, 1, 1, 6).setFormulas([[t, CAPACITY[t],
      '=COUNTIFS(' + A + '!F2:F,"' + t + '",' + A + '!I2:I,"<>Rejected")', '=COUNTIFS(' + O + '!E2:E,"' + t + '",' + O + '!G2:G,"Confirmed")',
      '=C' + r + '+D' + r, '=B' + r + '-E' + r]]);
  });
  const tr = 12 + OFF_TYPES.length;
  sh.getRange(tr, 1, 1, 6).setFormulas([['Total', '=SUM(B12:B' + (tr - 1) + ')', '=SUM(C12:C' + (tr - 1) + ')', '=SUM(D12:D' + (tr - 1) + ')',
                                          '=SUM(E12:E' + (tr - 1) + ')', '=SUM(F12:F' + (tr - 1) + ')']]);
  sh.getRange(tr + 2, 1, 3, 2).setFormulas([['Money', 'BDT'], ['Confirmed online payments', '=SUMIF(' + A + '!I2:I,"Confirmed",' + A + '!J2:J)'],
                                            ['Waiting to be confirmed', '=SUMIF(' + A + '!I2:I,"Payment submitted",' + A + '!J2:J)']]);
  [1, 3, 11, tr, tr + 2].forEach(r => sh.getRange(r, 1, 1, 6).setFontWeight('bold'));
  sh.setColumnWidth(1, 260);
}

// ================= run from the editor =================
function setup() { getSheet(); offSheet(); contentSheet(); ensureSummary(); installWeeklyBackup(); checkAdminPassword(); }
function checkAdminPassword() {
  const pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  Logger.log(pw && pw.length >= 6 ? 'ADMIN_PASSWORD is set. Good.' : 'ADMIN_PASSWORD is NOT set (or shorter than 6). Add it in Project Settings > Script properties.');
}
function clearTestData() {                                                   // run ONLY before the real launch
  const sh = getSheet();
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).clearContent();
  const o = offSheet();
  if (o.getLastRow() > 1) o.getRange(2, 1, o.getLastRow() - 1, OFF_HEADERS.length).clearContent();
}
function installWeeklyBackup() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'weeklyBackup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
}
function weeklyBackup() {
  const file = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const it = DriveApp.getFoldersByName('MFL Backups');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('MFL Backups');
  file.makeCopy('MFL backup ' + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd'), folder);
  const files = [], fi = folder.getFiles();
  while (fi.hasNext()) files.push(fi.next());
  files.sort((a, b) => b.getDateCreated().getTime() - a.getDateCreated().getTime());
  files.slice(BACKUP_KEEP).forEach(f => f.setTrashed(true));
}

// ================= helpers =================
function normPhone(v) {
  let s = String(v == null ? '' : v).replace(/\D/g, '');
  if (s.length === 13 && s.indexOf('880') === 0) s = '0' + s.slice(3);
  if (s.length === 10 && s.charAt(0) === '1') s = '0' + s;
  return s;
}
function randomCode(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
function clean(v, max) {                                                     // trim, cap, and stop spreadsheet formulas
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function safeUrl(u) { u = String(u || '').trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(u) && u.length < 600 ? u : ''; }
function notify(subject, body) {
  try { const to = NOTIFY || Session.getEffectiveUser().getEmail(); if (to) MailApp.sendEmail(to, subject, body); } catch (err) {}
}
function reply(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
