const HEADERS = ['Queue Number', 'Submission ID', 'Submitted At', 'Viewer Name', 'YouTube Name', 'Editing Type', 'Special Request', 'Drive File ID', 'Stored File Name', 'MIME Type', 'File Size', 'Consent', 'Status'];
const EDIT_TYPES = ['Photo Enhance', 'Background Change', 'Passport Photo', 'Before & After', 'AI Portrait', 'Other'];
const MAX_BYTES = 15 * 1024 * 1024;

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  const props = PropertiesService.getScriptProperties();
  template.youtubeUrl = youtubeUrl_(props.getProperty('YOUTUBE_LIVE_URL'));
  return template.evaluate().setTitle('Kushi Live Studio').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function youtubeUrl_(value) {
  return /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(value || '') ? value : '';
}

function invalid_(field) {
  const error = new Error('INVALID');
  error.field = field;
  throw error;
}

function text_(value, max, required, field) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) invalid_(field);
  // Plain text only, also neutralize spreadsheet formula injection.
  return "'" + value.trim().replace(/[<>\u0000-\u001f\u007f]/g, '');
}

function validatePhoto_(blob) {
  if (!blob || typeof blob.getBytes !== 'function') throw new Error('TYPE');
  const bytes = blob.getBytes();
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('SIZE');
  const b = bytes.map(function(v) { return v & 255; });
  const mime = blob.getContentType();
  const ext = (blob.getName().split('.').pop() || '').toLowerCase();
  const ascii = function(start, text) { return text.split('').every(function(c, i) { return b[start + i] === c.charCodeAt(0); }); };
  const jpeg = mime === 'image/jpeg' && ['jpg', 'jpeg'].indexOf(ext) >= 0 && b[0] === 255 && b[1] === 216 && b[2] === 255 && b[b.length - 2] === 255 && b[b.length - 1] === 217;
  const png = mime === 'image/png' && ext === 'png' && [137,80,78,71,13,10,26,10].every(function(v,i) { return b[i] === v; }) && ascii(b.length - 8, 'IEND');
  const webp = mime === 'image/webp' && ext === 'webp' && ascii(0, 'RIFF') && ascii(8, 'WEBP') && (ascii(12,'VP8 ') || ascii(12,'VP8L') || ascii(12,'VP8X')) && ((b[4] + b[5]*256 + b[6]*65536 + b[7]*16777216) === b.length - 8);
  if (!jpeg && !png && !webp) throw new Error('TYPE');
  return { bytes: bytes, size: bytes.length, mime: mime, extension: jpeg ? 'jpg' : ext };
}

// Select this in the editor and Run. Public RPC callers must never gain owner setup powers.
function setupKushiLiveStudio() {
  const active = Session.getActiveUser().getEmail();
  const effective = Session.getEffectiveUser().getEmail();
  if (!active || active !== effective) throw new Error('Only the signed-in owner can run setup in the Apps Script editor.');
  return setup_();
}

function queueTab_(props) {
  const name = props.getProperty('QUEUE_TAB_NAME') || 'Queue';
  if (!name.trim() || name.length > 100 || /[\[\]*?:\\/]/.test(name)) throw new Error('Invalid QUEUE_TAB_NAME.');
  return name;
}

// Private helper: never callable through google.script.run.
function setup_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Uploads are busy. Run setup again in a moment.');
  try {
  const p = PropertiesService.getScriptProperties();
  ['DRIVE_FOLDER_ID', 'SPREADSHEET_ID'].forEach(function(key) {
    if (!/^[\w-]+$/.test(p.getProperty(key) || '')) throw new Error('Add ' + key + ' in Project Settings → Script Properties.');
  });
  if (!youtubeUrl_(p.getProperty('YOUTUBE_LIVE_URL'))) throw new Error('Add a full YouTube link in YOUTUBE_LIVE_URL.');
  const enabled = p.getProperty('UPLOADS_ENABLED');
  if (enabled && enabled !== 'true' && enabled !== 'false') throw new Error('UPLOADS_ENABLED must be true or false.');
  const cap = Number(p.getProperty('DAILY_UPLOAD_LIMIT') || 200);
  if (!Number.isSafeInteger(cap) || cap < 1) throw new Error('DAILY_UPLOAD_LIMIT must be a positive whole number.');
  const folder = DriveApp.getFolderById(p.getProperty('DRIVE_FOLDER_ID'));
  assertPrivate_(folder);
  const owner = folder.getOwner();
  if (!owner || owner.getEmail() !== Session.getEffectiveUser().getEmail()) throw new Error('Use a private My Drive folder owned by this Google account.');
  assertPrivate_(DriveApp.getFileById(p.getProperty('SPREADSHEET_ID')));
  const book = SpreadsheetApp.openById(p.getProperty('SPREADSHEET_ID'));
  const tab = queueTab_(p);
  let sheet = book.getSheetByName(tab);
  if (!sheet) sheet = book.insertSheet(tab);
  const header = sheet.getRange(1,1,1,13).getValues()[0];
  if (header.every(function(cell) { return cell === ''; })) sheet.getRange(1,1,1,13).setValues([HEADERS]);
  assertHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange('M2:M').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['WAITING','EDITING','COMPLETED','REJECTED'], true).setAllowInvalid(false).build());
  SpreadsheetApp.flush(); // Verifies write access without adding or deleting submission rows.
  let highest = 0;
  if (sheet.getLastRow() > 1) sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().forEach(function(row) {
    if (!/^#\d+$/.test(String(row[0]))) throw new Error('An existing queue number is invalid. Existing data has been preserved.');
    highest = Math.max(highest, Number(String(row[0]).slice(1)));
  });
  const configuredNext = Number(p.getProperty('NEXT_QUEUE') || 1);
  if (!Number.isSafeInteger(configuredNext) || configuredNext < 1 || !Number.isSafeInteger(highest + 1)) throw new Error('NEXT_QUEUE must be a positive whole number.');
  p.setProperty('NEXT_QUEUE', String(Math.max(configuredNext, highest + 1)));
  if (!enabled) p.setProperty('UPLOADS_ENABLED', 'false');
  if (!p.getProperty('DAILY_UPLOAD_LIMIT')) p.setProperty('DAILY_UPLOAD_LIMIT', '200');
  const message = 'KUSHI LIVE STUDIO setup complete. Private folder and Sheet access verified; queue is ready. Existing submissions preserved.';
  console.log(message);
  return message;
  } finally { lock.releaseLock(); }
}

function assertHeaders_(sheet) {
  if (!sheet || JSON.stringify(sheet.getRange(1,1,1,13).getValues()[0]) !== JSON.stringify(HEADERS)) throw new Error('CONFIG');
}
function assertPrivate_(folder) {
  if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE || folder.getViewers().length || folder.getEditors().length) throw new Error('CONFIG');
}

function submitPhoto(form) {
  let lock;
  let file;
  let committed = false;
  try {
    if (!form) invalid_('form');
    if (form.website) invalid_('website');
    if (form.consent !== 'yes') invalid_('consent');
    if (!/^[a-f0-9-]{36}$/.test(form.requestId || '')) invalid_('requestId');
    if (!/^[a-f0-9-]{36}$/.test(form.clientId || '')) invalid_('clientId');
    if (Object.keys(form).filter(function(key) { return form[key] && typeof form[key].getBytes === 'function'; }).length !== 1) invalid_('photo');
    const name = text_(form.viewerName, 80, true, 'viewerName');
    const youtubeName = text_(form.youtubeName, 100, true, 'youtubeName');
    const special = text_(form.specialRequest, 500, false, 'specialRequest');
    if (EDIT_TYPES.indexOf(form.editingType) < 0) invalid_('editingType');
    const photo = validatePhoto_(form.photo);
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('UPLOADS_ENABLED') !== 'true') throw new Error('CLOSED');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('BUSY');
    const sheet = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID')).getSheetByName(queueTab_(props));
    assertHeaders_(sheet);
    // Durable retry protection; survives cache expiry and a lost browser response.
    const prior = sheet.getLastRow() > 1 ? sheet.getRange(2,2,sheet.getLastRow()-1,1).createTextFinder(form.requestId).matchEntireCell(true).findNext() : null;
    if (prior) return { ok: true, queue: sheet.getRange(prior.getRow(),1).getDisplayValue(), submissionId: form.requestId };
    const cache = CacheService.getScriptCache();
    const day = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    const rateKey = 'rate:' + form.clientId;
    const countKey = 'count:' + day;
    if (cache.get(rateKey)) throw new Error('RATE');
    const dailyLimit = Number(props.getProperty('DAILY_UPLOAD_LIMIT') || 200);
    const count = Number(props.getProperty(countKey) || 0);
    if (!Number.isSafeInteger(dailyLimit) || dailyLimit < 1 || !Number.isSafeInteger(count) || count < 0 || count >= dailyLimit) throw new Error('CLOSED');
    const folder = DriveApp.getFolderById(props.getProperty('DRIVE_FOLDER_ID'));
    assertPrivate_(folder);
    const next = Number(props.getProperty('NEXT_QUEUE') || 1);
    if (!Number.isSafeInteger(next) || next < 1 || next >= Number.MAX_SAFE_INTEGER) throw new Error('CONFIG');
    const queue = '#' + String(next).padStart(3, '0');
    // Reserve before writing: a failed request can leave a harmless queue gap.
    props.setProperty('NEXT_QUEUE', String(next + 1));
    // Reserve the daily slot before file creation; failures cannot bypass the cap.
    props.setProperty(countKey, String(count + 1));
    const stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd_HHmmss');
    const filename = 'LIVE_' + String(next).padStart(3,'0') + '_' + stamp + '_' + Utilities.getUuid() + '.' + photo.extension;
    file = folder.createFile(Utilities.newBlob(photo.bytes, photo.mime, filename));
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    sheet.appendRow([queue, form.requestId, new Date(), name, youtubeName, form.editingType, special, file.getId(), filename, photo.mime, photo.size, 'YES', 'WAITING']);
    committed = true;
    SpreadsheetApp.flush();
    cache.put(rateKey, '1', 60);
    return { ok: true, queue: queue, submissionId: form.requestId };
  } catch (err) {
    if (file && !committed) { try { file.setTrashed(true); } catch (_) {} }
    const allowed = ['TYPE','SIZE','INVALID','RATE','CLOSED','BUSY'];
    const result = { ok: false, code: allowed.indexOf(err.message) >= 0 ? err.message : 'SERVER' };
    if (err.message === 'INVALID' && ['form','website','consent','requestId','clientId','photo','viewerName','youtubeName','specialRequest','editingType'].indexOf(err.field) >= 0) {
      result.field = err.field; // Field names only; never log submitted values or private IDs.
      console.warn('KUSHI_LIVE_VALIDATION', err.field);
    }
    return result;
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
