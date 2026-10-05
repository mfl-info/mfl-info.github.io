/**
 * MFL registration backend (Google Apps Script) — Season 7
 * Paste this whole file into Extensions > Apps Script of your Google Sheet, replacing the old code.
 *
 * Flow
 *  1. A boy applies on register.html -> a row is added with Status "Pending".
 *  2. The management team calls him and checks he lives in Mosjidpara.
 *  3. In the sheet, set Status to "Approved" or "Rejected" (dropdown).
 *  4. On status.html he enters his ID + phone. Only "Approved" people see the amount and the pay number.
 *  5. After he sends his TrxID the Status becomes "Payment submitted". Check the bKash/Nagad SMS, then set "Confirmed".
 *
 * Places: 8 Captains + 40 Players + 8 Goalkeepers = 56. Rejected applications do not use up a place.
 * Player and Goalkeeper pay the same fee. The limits are checked here on the server, not only in the browser.
 * FIRST TIME ONLY: run the function setup() once from the editor (it creates the Summary sheet and the weekly backup).
 */

// ---------------- EDIT THESE ----------------
const PAY_NUMBER = '01740468822';                                   // bKash / Nagad number (shown only to approved people)
const SEASON     = 'Season 7';
const FEES       = { Player: 280, Goalkeeper: 280, Captain: 700 };  // keep the same as config.js
const CAPACITY   = { Captain: 8, Player: 40, Goalkeeper: 8 };       // 56 places
const OPEN_AT    = '2026-12-16T00:00:00+06:00';                     // real opening time (Bangladesh time). For testing use openForTest() below, no editing needed.
const CLOSE_AT   = '';                                              // optional, e.g. '2026-12-31T23:59:00+06:00'. Empty = no closing time.
const AGE_MIN    = 12;
const AGE_MAX    = 25;
const NOTIFY     = '';                                              // alert email. Empty = your own Google account email.
const BACKUP_KEEP = 8;                                              // how many weekly backups to keep
// --------------------------------------------

const SHEET_NAME = 'Applications';
const SUMMARY_SHEET = 'Summary';
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Payment submitted', 'Confirmed'];
const HEADERS = ['Time', 'ID', 'Season', 'Name', 'Age', 'Type', 'Phone', 'Address',
                 'Status', 'Amount (BDT)', 'Paid with', 'Paid from', 'TrxID', 'Paid at', 'Note'];
const C = { TIME: 1, ID: 2, SEASON: 3, NAME: 4, AGE: 5, TYPE: 6, PHONE: 7, ADDRESS: 8,
            STATUS: 9, AMOUNT: 10, METHOD: 11, SENDER: 12, TRX: 13, PAIDAT: 14, NOTE: 15 };

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    if (d.action === 'apply') return apply(d);
    if (d.action === 'status') return status(d);
    if (d.action === 'pay') return pay(d);
    return reply({ ok: false, error: 'invalid' });
  } catch (err) {
    return reply({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

// The website reads the numbers with: <web app url>?action=summary&season=Season%207
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'summary') return reply(summary(p.season ? String(p.season) : SEASON));
  return reply({ ok: false, error: 'invalid' });
}

// ---------- applications ----------
function apply(d) {
  if (d.website) return reply({ ok: true, id: 'MFL-00000' });          // bot trap

  const now = new Date().getTime();
  if (now < new Date(getOpenAt()).getTime()) return reply({ ok: false, error: 'notopen' });
  if (CLOSE_AT && now > new Date(CLOSE_AT).getTime()) return reply({ ok: false, error: 'closed' });

  const name = clean(d.name, 60);
  const address = clean(d.address, 120);
  const type = String(d.type);
  const age = Number(d.age);
  const phone = normPhone(d.phone);
  if (name.length < 2 || address.length < 3 || !FEES[type] || !CAPACITY[type] ||
      !(age >= AGE_MIN && age <= AGE_MAX) || !/^01[3-9]\d{8}$/.test(phone)) {
    return reply({ ok: false, error: 'invalid' });
  }

  const sh = getSheet();
  const rows = readRows(sh);

  for (const r of rows) {                                               // one application per phone
    if (normPhone(r[C.PHONE - 1]) === phone && String(r[C.SEASON - 1]) === SEASON) {
      return reply({ ok: false, error: 'exists' });
    }
  }
  if (taken(rows, type) >= CAPACITY[type]) return reply({ ok: false, error: 'full' });

  const ids = rows.map(r => String(r[C.ID - 1]));
  let id;
  do { id = 'MFL-' + randomCode(5); } while (ids.indexOf(id) !== -1);

  sh.appendRow([new Date(), id, SEASON, name, age, type, phone, address, 'Pending', '', '', '', '', '', '']);
  ensureSummary();
  notify('MFL: new application - ' + name,
         name + ' (' + type + ', age ' + age + ') has applied.\nID: ' + id +
         '\n\nOpen the sheet to call and verify:\n' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  return reply({ ok: true, id: id });
}

function status(d) {
  const f = find(d.id, d.phone);
  if (!f) return reply({ ok: false, error: 'notfound' });
  const st = String(f.row[C.STATUS - 1]) || 'Pending';
  const out = { ok: true, status: st, name: f.row[C.NAME - 1], type: f.row[C.TYPE - 1] };
  if (st === 'Approved') {                                              // pay details only after approval
    out.amount = FEES[out.type];
    out.number = PAY_NUMBER;
  }
  return reply(out);
}

function pay(d) {
  const f = find(d.id, d.phone);
  if (!f) return reply({ ok: false, error: 'notfound' });
  if (String(f.row[C.STATUS - 1]) !== 'Approved') return reply({ ok: false, error: 'notallowed' });

  const sender = normPhone(d.sender);
  const method = String(d.method);
  const trx = clean(d.trx, 14).toUpperCase();
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
         f.row[C.NAME - 1] + ' (' + type + ') sent TrxID ' + trx + '.\nExpected amount: ' + FEES[type] +
         ' BDT.\nPaid with ' + method + '. Check it against your ' + method + ' SMS, then set Status to Confirmed:\n' +
         SpreadsheetApp.getActiveSpreadsheet().getUrl());
  return reply({ ok: true });
}

// Public counts only (no names, phones or addresses). Used by the Register page and the Registration Summary page.
// total = everyone who still holds a place (not Rejected); approved/paid/confirmed count people who reached that step.
function summary(season) {
  const rows = readRows(getSheet()).filter(r => String(r[C.SEASON - 1]) === (season || SEASON));
  const active = rows.filter(r => String(r[C.STATUS - 1]) !== 'Rejected');
  const st = r => String(r[C.STATUS - 1]);
  const byType = t => active.filter(r => String(r[C.TYPE - 1]) === t).length;
  return {
    ok: true,
    total: active.length,
    approved: active.filter(r => ['Approved', 'Payment submitted', 'Confirmed'].indexOf(st(r)) !== -1).length,
    paid: active.filter(r => ['Payment submitted', 'Confirmed'].indexOf(st(r)) !== -1).length,
    confirmed: active.filter(r => st(r) === 'Confirmed').length,
    captains: byType('Captain'),
    players: byType('Player'),
    goalkeepers: byType('Goalkeeper')
  };
}

// ---------- helpers ----------
function readRows(sh) {
  return sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues() : [];
}
// Rejected applications do not use up a place.
function taken(rows, type) {
  return rows.filter(r => String(r[C.SEASON - 1]) === SEASON && String(r[C.TYPE - 1]) === type &&
                          String(r[C.STATUS - 1]) !== 'Rejected').length;
}
function find(id, phone) {
  const key = String(id || '').trim().toUpperCase();
  const ph = normPhone(phone);
  if (!key || !ph) return null;
  const rows = readRows(getSheet());
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][C.ID - 1]).toUpperCase() === key && normPhone(rows[i][C.PHONE - 1]) === ph) {
      return { row: rows[i], rowNum: i + 2 };
    }
  }
  return null;
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    [C.ID, C.PHONE, C.SENDER, C.TRX].forEach(c => sh.getRange(2, c, 1999, 1).setNumberFormat('@'));
    sh.getRange(2, C.STATUS, 1999, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  }
  return sh;
}

// Summary tab: live counts with formulas (it updates itself).
function ensureSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SUMMARY_SHEET)) return;
  const sh = ss.insertSheet(SUMMARY_SHEET);
  const A = SHEET_NAME;
  const rows = [
    ['MFL ' + SEASON + ' - registration summary', ''],
    ['', ''],
    ['By status', 'People'],
    ['Pending (waiting for the call)', '=COUNTIF(' + A + '!I2:I,"Pending")'],
    ['Approved (can pay)', '=COUNTIF(' + A + '!I2:I,"Approved")'],
    ['Payment submitted (check SMS)', '=COUNTIF(' + A + '!I2:I,"Payment submitted")'],
    ['Confirmed', '=COUNTIF(' + A + '!I2:I,"Confirmed")'],
    ['Rejected', '=COUNTIF(' + A + '!I2:I,"Rejected")'],
    ['All applications', '=COUNTA(' + A + '!B2:B)'],
    ['', ''],
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(11, 1, 1, 5).setValues([['By type', 'Places', 'Taken', 'Left', 'Confirmed']]);
  const types = Object.keys(CAPACITY);
  types.forEach((t, i) => {
    const r = 12 + i;
    sh.getRange(r, 1, 1, 5).setFormulas([[t, CAPACITY[t],
      '=COUNTIFS(' + A + '!F2:F,"' + t + '",' + A + '!I2:I,"<>Rejected")',
      '=B' + r + '-C' + r,
      '=COUNTIFS(' + A + '!F2:F,"' + t + '",' + A + '!I2:I,"Confirmed")']]);
  });
  const tr = 12 + types.length;
  sh.getRange(tr, 1, 1, 5).setFormulas([['Total', '=SUM(B12:B' + (tr - 1) + ')', '=SUM(C12:C' + (tr - 1) + ')',
                                          '=SUM(D12:D' + (tr - 1) + ')', '=SUM(E12:E' + (tr - 1) + ')']]);
  sh.getRange(tr + 2, 1, 3, 2).setFormulas([
    ['Money', 'BDT'],
    ['Confirmed payments', '=SUMIF(' + A + '!I2:I,"Confirmed",' + A + '!J2:J)'],
    ['Waiting to be confirmed', '=SUMIF(' + A + '!I2:I,"Payment submitted",' + A + '!J2:J)'],
  ]);
  [1, 3, 11, tr, tr + 2].forEach(r => sh.getRange(r, 1, 1, 5).setFontWeight('bold'));
  sh.setColumnWidth(1, 260);
}

// ---------- open / lock registration (run from the editor, no redeploy needed) ----------
function getOpenAt() {
  return PropertiesService.getScriptProperties().getProperty('OPEN_AT_OVERRIDE') || OPEN_AT;
}
// TESTING: opens registration on the server right now. Also set opensAt in config.js to an earlier date on the website.
function openForTest() {
  PropertiesService.getScriptProperties().setProperty('OPEN_AT_OVERRIDE', '2020-01-01T00:00:00+06:00');
}
// LOCK AGAIN: goes back to the real opening time (OPEN_AT above).
function lockRegistration() {
  PropertiesService.getScriptProperties().deleteProperty('OPEN_AT_OVERRIDE');
}
// Deletes test rows (keeps the header). Run ONLY before the real launch.
function clearTestData() {
  const sh = getSheet();
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).clearContent();
}

// ---------- run ONCE from the editor ----------
function setup() {
  getSheet();
  ensureSummary();
  installWeeklyBackup();
}

function installWeeklyBackup() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'weeklyBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
}

// Every Sunday ~3 AM: copy the whole spreadsheet into the Drive folder "MFL Backups", keep the newest BACKUP_KEEP.
function weeklyBackup() {
  const file = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const it = DriveApp.getFoldersByName('MFL Backups');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('MFL Backups');
  const stamp = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd');
  file.makeCopy('MFL backup ' + stamp, folder);
  const files = [];
  const fi = folder.getFiles();
  while (fi.hasNext()) files.push(fi.next());
  files.sort((a, b) => b.getDateCreated().getTime() - a.getDateCreated().getTime());
  files.slice(BACKUP_KEEP).forEach(f => f.setTrashed(true));
}

function normPhone(v) {
  let s = String(v == null ? '' : v).replace(/\D/g, '');
  if (s.length === 13 && s.indexOf('880') === 0) s = '0' + s.slice(3);
  if (s.length === 10 && s.charAt(0) === '1') s = '0' + s;
  return s;
}

function randomCode(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';                      // no 0/O/1/I
  let s = '';
  for (let i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

// Trim, cap length, and stop spreadsheet formulas (=, +, -, @) from running.
function clean(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

// Email alert to the organiser (no phone number or address inside). A failure here never breaks a registration.
function notify(subject, body) {
  try {
    const to = NOTIFY || Session.getEffectiveUser().getEmail();
    if (to) MailApp.sendEmail(to, subject, body);
  } catch (err) {}
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
