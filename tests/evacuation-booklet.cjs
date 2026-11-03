const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const data=JSON.parse(fs.readFileSync('content/evacuation.json','utf8'));
const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
function browserPath(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>window.FerdantBooklet&&window.FerdantResourceMap);}
(async()=>{
 const directory='screenshots/evacuation';fs.mkdirSync(directory,{recursive:true});
 const browser=await chromium.launch({executablePath:browserPath()});const findings=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:960},acceptDownloads:true});await stubPublicMap(context);
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.stack||e.message));
  await p.goto(base+'/local/?place=57026');await ready(p);
  const choices=[...places.cities.map(c=>c[0]),...Object.keys(places.counties).map(c=>'county:'+c),''];
  const summaries=await p.evaluate(async keys=>{const out=[];for(const key of keys){const m=await window.FerdantBooklet.model(key);out.push({key,local:m.evacuation.localAvailable,links:m.evacuation.links.map(s=>s.id),events:m.events.map(e=>[e.id,e.evacuation])});}return out;},choices);
  for(const s of summaries){
   const row=places.cities.find(r=>r[0]===s.key),county=row?.[2]||(s.key.startsWith('county:')?s.key.slice(7):null);
   const local=[...(data.cities[s.key]||[]),...(data.counties[county]||[])];
   assert.equal(s.local,local.length>0);assert.deepEqual(s.links,[...new Set([...local,...data.shared])]);
   assert.deepEqual(Object.fromEntries(s.events),data.events);
  }
  assert(summaries.find(s=>s.key==='44051').links.includes('santa-cruz-city'));
  assert(!summaries.find(s=>s.key==='44053').links.includes('santa-cruz-city'));
  let davis;
  for(const key of ['57026','38001','37060','44051','44053','county:57','county:02','']){
   await p.goto(base+'/local/'+(key?'?place='+encodeURIComponent(key):''));await ready(p);
   const result=await p.evaluate(async key=>{const r=await window.FerdantBooklet.build(key);return {bytes:Array.from(new Uint8Array(await r.blob.arrayBuffer())),pages:r.pages,layout:r.layout,links:r.links,events:r.events,model:r.model,sourcesText:r.sourcesText};},key);
   const bytes=Buffer.from(result.bytes);delete result.bytes;
   assert(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
   const common=result.layout.filter(l=>l.text==='Evacuation routes & updates');assert.equal(common.length,1);
   assert.equal(result.layout.filter(l=>l.text.startsWith('Evacuation routes & updates / page ')).length,9);
   for(const link of result.model.evacuation.links)assert.equal(result.links.filter(u=>u===link.url).length,1,link.id);
   assert.equal(result.links.filter(u=>u===data.sources['tsunami-maps'].url).length,1);
   assert(!result.layout.some(l=>/undefined|NaN/.test(l.text)));assert(!/undefined|NaN/.test(result.sourcesText));
   assert.equal(result.layout.some(l=>l.text.startsWith('No local route-planning resource')), !result.model.evacuation.localAvailable);
   for(const e of result.model.events){const start=result.events.find(r=>r.id===e.id).start,end=result.events.find(r=>r.id===e.id).end;const rows=result.layout.filter(l=>l.page>=start&&l.page<=end);assert.equal(rows.some(l=>l.text.startsWith('Evacuation routes & updates / page ')),Boolean(e.evacuation));}
   assert(result.layout.every(l=>l.top+l.height<=(l.top>=750?776:744)));
   const stem='ferdant-'+(key||'california').replace(':','-')+'-evacuation';fs.writeFileSync(directory+'/'+stem+'.pdf',bytes);fs.writeFileSync(directory+'/'+stem+'.json',JSON.stringify(result,null,2));
   findings.push({key,pages:result.pages,evacuationPage:common[0].page,local:result.model.evacuation.localAvailable,links:result.model.evacuation.links.map(s=>s.id)});
   if(key==='57026')davis=bytes;
  }
  await p.goto(base+'/local/?place=57026');await ready(p);
  await p.evaluate(()=>window.FerdantBooklet.model('57026'));
  const wait=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const dl=await wait;
  const saved=path.resolve(directory,'davis-offline.html');await dl.saveAs(saved);
  const offline=await browser.newContext({offline:true}),o=await offline.newPage(),requests=[];
  o.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await o.goto(pathToFileURL(saved).href);await ready(o);
  const bytes=await o.evaluate(async()=>Array.from(new Uint8Array(await (await window.FerdantBooklet.build('57026')).blob.arrayBuffer())));
  assert.deepEqual(Buffer.from(bytes),davis);assert.deepEqual(requests,[]);await offline.close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(directory+'/verification.json',JSON.stringify({models:choices.length,findings,sharedLinksOnce:true,relevantChapters:9,offlineByteEquality:true,offlineHTTP:0,errors,fixtures:'Official GIS/tiles mocked; real saved directory data. Not a live evacuation-status audit.'},null,2));
  console.log('Evacuation checks passed: 542 location models, 8 PDFs, 9 relevant chapters, scoped local sources, deduplicated links, explicit gaps and identical offline export.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
