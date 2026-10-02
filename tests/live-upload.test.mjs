import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../google-apps-script/kushi-live-upload/Code.gs', import.meta.url), 'utf8');
function blob(bytes, mime='image/jpeg', name='test.jpg') { return {getBytes:()=>bytes,getContentType:()=>mime,getName:()=>name}; }
function harness() {
  const rows = [], files = [], values = {UPLOADS_ENABLED:'true',DRIVE_FOLDER_ID:'private-folder',SPREADSHEET_ID:'private-sheet'};
  const cache = new Map();
  let locked = false;
  const headers = ['Queue Number','Submission ID','Submitted At','Viewer Name','YouTube Name','Editing Type','Special Request','Drive File ID','Stored File Name','MIME Type','File Size','Consent','Status'];
  const sheet = {getLastRow:()=>rows.length+1,getRange:(row,col)=>({getValues:()=>[headers],getDisplayValue:()=>rows[row-2][col-1],createTextFinder:id=>({matchEntireCell(){return this;},findNext(){const i=rows.findIndex(r=>r[1]===id);return i<0?null:{getRow:()=>i+2};}})}),appendRow:r=>rows.push(r)};
  const folder = {getSharingAccess:()=> 'PRIVATE',getViewers:()=>[],getEditors:()=>[],createFile:b=>{const file={blob:b,sharing:null,trashed:false,setSharing(a,p){this.sharing=[a,p];},getId:()=> 'owner-file-'+files.length,setTrashed(v){this.trashed=v;}};files.push(file);return file;}};
  const ctx = vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>values[k],setProperty:(k,v)=>{values[k]=v;}})},SpreadsheetApp:{openById:id=>{assert.equal(id,'private-sheet');return {getSheetByName:()=>sheet};},flush(){}},DriveApp:{Access:{PRIVATE:'PRIVATE'},Permission:{NONE:'NONE'},getFolderById:id=>{assert.equal(id,'private-folder');return folder;}},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},Utilities:{formatDate:(_d,_tz,fmt)=>fmt==='yyyy-MM-dd'?'2026-10-02':'20261002_120000',getUuid:()=> 'random-id',newBlob:(bytes,mime,name)=>blob(bytes,mime,name)}});
  vm.runInContext(source,ctx);
  const form={viewerName:'=HYPERLINK("evil")',youtubeName:'<script>name</script>',specialRequest:'hello',editingType:'Photo Enhance',consent:'yes',website:'',requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',clientId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',photo:blob([255,216,255,1,255,217])};
  return {ctx,form,rows,files,values,folder,cache};
}
test('JPG/JPEG PNG WEBP signatures accepted; renamed malicious and oversized uploads rejected',()=>{
  const {ctx}=harness();
  assert.equal(ctx.validatePhoto_(blob([255,216,255,1,255,217])).extension,'jpg');
  assert.equal(ctx.validatePhoto_(blob([255,216,255,1,255,217],'image/jpeg','test.jpeg')).extension,'jpg');
  assert.equal(ctx.validatePhoto_(blob([137,80,78,71,13,10,26,10,73,69,78,68,174,66,96,130],'image/png','test.png')).extension,'png');
  const webp=[...Buffer.from('RIFF'),12,0,0,0,...Buffer.from('WEBPVP8 '),0,0,0,0];
  assert.equal(ctx.validatePhoto_(blob(webp,'image/webp','test.webp')).extension,'webp');
  for(const bad of [blob([...Buffer.from('<script>evil</script>')]),blob([255,216,255,1,255,217],'image/jpeg','photo.svg'),blob([255,216,255,1,255,217],'application/pdf','photo.jpg')]) assert.throws(()=>ctx.validatePhoto_(bad),/TYPE/);
  assert.throws(()=>ctx.validatePhoto_(blob(new Array(15*1024*1024+1).fill(0))),/SIZE/);
});
test('private destination, 13-column queue, text sanitization, durable retry and throttle',()=>{
  const {ctx,form,rows,files}=harness();
  const result=ctx.submitPhoto(form);
  assert.equal(result.ok,true);assert.equal(result.queue,'#001');assert.equal(rows[0].length,13);assert.equal(rows[0][12],'WAITING');assert.ok(rows[0][3].startsWith("'="));assert.ok(!rows[0][4].includes('<'));
  assert.deepEqual(files[0].sharing,['PRIVATE','NONE']);assert.match(files[0].blob.getName(),/^LIVE_001_20261002_120000_random-id.jpg$/);
  assert.equal(ctx.submitPhoto(form).queue,'#001');assert.equal(files.length,1);assert.equal(rows.length,1);
  assert.equal(ctx.submitPhoto({...form,requestId:'cccccccc-cccc-cccc-cccc-cccccccccccc'}).code,'RATE');
  assert.ok(!JSON.stringify(result).includes('owner-file'));
});
test('required fields, consent, honeypot, daily cap, shared folder and write-failure recovery',()=>{
  for(const patch of [{viewerName:''},{consent:''},{website:'bot'},{editingType:'bad'},{specialRequest:'x'.repeat(501)}]){const {ctx,form,files}=harness();assert.equal(ctx.submitPhoto({...form,...patch}).ok,false);assert.equal(files.length,0);}
  {const {ctx,form,values}=harness();values['count:2026-10-02']='200';assert.equal(ctx.submitPhoto(form).code,'CLOSED');}
  {const {ctx,form,folder}=harness();folder.getViewers=()=>['stranger'];assert.equal(ctx.submitPhoto(form).code,'SERVER');}
  {const {ctx,form,rows,files}=harness();rows.push=()=>{throw Error('internal private error');};assert.equal(ctx.submitPhoto(form).code,'SERVER');assert.equal(files[0].trashed,true);}
});
test('live code has no Supabase storage and preserves existing studio route',()=>{
  const page=fs.readFileSync(new URL('../src/pages/public/Live.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source+page,/supabase|storage\.from|base64/i);
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(app,/path="live" element={<Live \/>}/);assert.match(app,/path="studio"/);
  const html=fs.readFileSync(new URL('../google-apps-script/kushi-live-upload/Index.html',import.meta.url),'utf8');
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  assert.match(html,/if\(busy\|\|!form.reportValidity\(\)\)return/);assert.match(html,/withFailureHandler/);assert.match(html,/showSuccess\(saved.result\)/);
});

function setupHarness({existingRows=[], header=[], tabExists=true}={}) {
  const values={DRIVE_FOLDER_ID:'folder',SPREADSHEET_ID:'sheet',YOUTUBE_LIVE_URL:'https://www.youtube.com/watch?v=test'};
  let currentHeader=header, created=false, wrote=false, flushed=false;
  const data=existingRows.map(r=>[...r]);
  const validation={requireValueInList(){return this;},setAllowInvalid(){return this;},build(){return {};}};
  const sheet={getLastRow:()=>data.length+1,setFrozenRows:()=>{wrote=true;},getRange:(row,col)=>({getValues:()=>row===1?[currentHeader.length?currentHeader:Array(13).fill('')]:data.map(r=>[r[col-1]]),setValues:v=>{currentHeader=[...v[0]];},setDataValidation:()=>{wrote=true;}})};
  const privateItem={getSharingAccess:()=> 'PRIVATE',getViewers:()=>[],getEditors:()=>[],getOwner:()=>({getEmail:()=> 'owner@example.com'})};
  const session={getActiveUser:()=>({getEmail:()=> 'owner@example.com'}),getEffectiveUser:()=>({getEmail:()=> 'owner@example.com'})};
  const ctx=vm.createContext({Session:session,console:{log(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>values[k],setProperty:(k,v)=>{values[k]=v;}})},DriveApp:{Access:{PRIVATE:'PRIVATE'},getFolderById:()=>privateItem,getFileById:()=>privateItem},SpreadsheetApp:{openById:()=>({getSheetByName:name=>{assert.equal(name,values.QUEUE_TAB_NAME||'Queue');return tabExists?sheet:null;},insertSheet:()=>{created=true;return sheet;}}),newDataValidation:()=>validation,flush:()=>{flushed=true;}}});
  vm.runInContext(source,ctx);
  return {ctx,values,data,session,state:()=>({header:currentHeader,created,wrote,flushed})};
}
test('owner setup creates tab/headers, verifies writes and defaults uploads to closed',()=>{
  const h=setupHarness({tabExists:false});assert.match(h.ctx.setupKushiLiveStudio(),/setup complete/);
  assert.equal(h.state().created,true);assert.equal(h.state().header.length,13);assert.equal(h.state().flushed,true);assert.equal(h.values.UPLOADS_ENABLED,'false');assert.equal(h.values.NEXT_QUEUE,'1');
});
test('owner setup preserves existing rows and advances queue without resetting it',()=>{
  const h=setupHarness({existingRows:[['#012','existing submission']]});h.values.QUEUE_TAB_NAME='Live Queue';h.ctx.setupKushiLiveStudio();assert.deepEqual(h.data,[['#012','existing submission']]);assert.equal(h.values.NEXT_QUEUE,'13');h.values.NEXT_QUEUE='100';h.ctx.setupKushiLiveStudio();assert.equal(h.values.NEXT_QUEUE,'100');
});
test('owner setup rejects anonymous/viewer RPC and invalid configuration before writes',()=>{
  const h=setupHarness();h.session.getActiveUser=()=>({getEmail:()=>''});assert.throws(()=>h.ctx.setupKushiLiveStudio(),/signed-in owner/);assert.equal(h.state().wrote,false);
  const bad=setupHarness();bad.values.YOUTUBE_LIVE_URL='https://evil.example';assert.throws(()=>bad.ctx.setupKushiLiveStudio(),/YouTube/);assert.equal(bad.state().wrote,false);
});
test('successful queue append survives flush failure and malformed daily counter blocks uploads',()=>{
  const h=harness();h.ctx.SpreadsheetApp.flush=()=>{throw Error('transient failure');};assert.equal(h.ctx.submitPhoto(h.form).code,'SERVER');assert.equal(h.files[0].trashed,false);assert.equal(h.ctx.submitPhoto(h.form).queue,'#001');assert.equal(h.files.length,1);
  const bad=harness();bad.values['count:2026-10-02']='invalid';assert.equal(bad.ctx.submitPhoto(bad.form).code,'CLOSED');assert.equal(bad.files.length,0);
});
