const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const manifest=JSON.parse(fs.readFileSync('content/visit-fact-manifest.json','utf8')),providers=JSON.parse(fs.readFileSync('content/provider-visit-details.json','utf8'));
const code=fs.readFileSync('resource-facts.js','utf8');
function runtime({offline=false,tampered=false,snapshot=null}={}){
 const config={visitFacts:manifest,providerVisitDetails:providers,serviceTypes:{library:{label:'Library'},water:{label:'Drinking water'},clinic:{label:'Community clinic'}},sources:{reviewed:{title:'Provider',url:'https://example.org/',checked:'2026-11-03'}}};
 const box={window:{},document:{querySelector:s=>s==='#resource-map-data'?{textContent:JSON.stringify(config)}:s==='#visit-facts-snapshot'&&snapshot?{textContent:JSON.stringify(snapshot)}:null},location:{protocol:offline?'file:':'https:'},URL,TextEncoder,AbortController,setTimeout,clearTimeout,crypto:crypto.webcrypto,fetch:async url=>({ok:true,text:async()=>fs.readFileSync('.'+url,'utf8')+(tampered?' ':'')})};
 vm.runInNewContext(code,box);return box.window.FerdantResourceFacts;
}
(async()=>{
 let count=0,fields={};
 for(const [county,ref]of Object.entries(manifest.counties)){
  const raw=fs.readFileSync('.'+ref.path);assert.equal(raw.length,ref.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),ref.sha256);const d=JSON.parse(raw);assert.equal(d.county,county);assert.equal(Object.keys(d.records).length,ref.count);
  for(const [id,record]of Object.entries(d.records)){count++;assert(record.evidence.url.startsWith('https://www.openstreetmap.org/'));assert(record.evidence.observed);for(const key of Object.keys(record.values))fields[key]=(fields[key]||0)+1;assert(!/"(?:user|uid|changeset|email|phone)":/.test(JSON.stringify(record)));}
 }
 assert.equal(count,manifest.count);assert.equal(fields.hours,666);assert.equal(fields.amenities,1770);assert.equal(fields.cost,1539);
 const facts=runtime();
 assert.equal(facts.hours('Mo-Fr 09:00-17:00; Sa 10:00-14:00'),'Mon\u2013Fri 9am\u20135pm; Sat 10am\u20132pm');assert.equal(facts.hours('24/7'),'Daily, 24 hours (listed schedule)');
 for(const complex of ['Mo-Fr 25:00-28:00','sunrise-sunset','Mo-Fr 09:00-17:00; PH off; Dec-Mar closed','By appointment only'])assert.equal(facts.hours(complex),complex);
 await facts.load('48');const f={id:'imls-CA0136-003',kind:'library',county:'48',name:'John F. Kennedy Library',address:'505 Santa Clara St.',city:'Vallejo'};
 const rows=facts.rows(f);assert.deepEqual(Array.from(rows,r=>r.label),['Location','Hours','Services','Costs','Amenities']);assert(rows[1].value.includes('Mon'));assert(rows[4].value.includes('Wi-Fi'));assert.equal(rows[4].evidence.title,providers.records[f.id].evidence.title);
 const reviewed=facts.rows({...f,visit:{hours:'Provider schedule: Mon 9am-4pm'},source:'reviewed'});assert.equal(reviewed[1].value,'Provider schedule: Mon 9am-4pm');assert.equal(reviewed[1].evidence.title,'Provider');
 const missing=facts.rows({id:'unknown',kind:'clinic',county:'02'});assert(missing[1].value.startsWith('Not listed'));assert(!missing[4].value.includes('Wi-Fi'));assert(missing[3].value.startsWith('Not listed'));
 await assert.rejects(runtime({tampered:true}).load('48'),/hash mismatch/);
 const shard=JSON.parse(fs.readFileSync('.'+manifest.counties['48'].path));const offline=runtime({offline:true,snapshot:{schema:1,edition:manifest.edition,counties:{'48':shard}}});assert.equal(offline.rows(f)[1].value,rows[1].value);await offline.load('01');assert(offline.rows({id:'imls-not-saved',kind:'library',county:'01'})[1].value.startsWith('Not listed'));
 console.log('Visit facts: 58 county hashes, 2800 matched records, readable schedules, source priority, missing values, tamper rejection and saved snapshots passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
