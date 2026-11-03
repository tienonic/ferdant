const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const data=JSON.parse(fs.readFileSync('content/hazard-risk.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('content/hazard-risk-manifest.json','utf8'));
const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
const config=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/id="resource-map-data">(.*?)<\/script>/s)[1]);
const hash=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
assert.equal(hash('content/hazard-risk.json'),manifest.outputSha256);
for(const [path,expected] of Object.entries(manifest.boundaryInputs))assert.equal(hash(path),expected,path);
assert.deepEqual(config.hazardRisk,data);assert.equal(Object.keys(data.locations).length,541);
assert.equal(Object.keys(data.locations).filter(k=>k.startsWith('county:')).length,58);assert.equal(data.hazardIds.length,15);
const box={window:{},document:{querySelector:()=>({textContent:JSON.stringify(config)})}};
vm.runInNewContext(fs.readFileSync('hazard-risk.js','utf8'),box);const api=box.window.FerdantRisk;
for(const [key,record] of Object.entries(data.locations)){
 assert.equal(record.values.length,15,key);assert(places.counties[record.county]);
 if(key.startsWith('county:')){assert.equal(record.scope,'county');assert(/^06\d{3}$/.test(record.fips));}
 else{assert.equal(record.scope,'city-tract-screen');assert(record.tracts.length>0);assert(record.coverage>0&&record.coverage<=100);assert.equal(new Set(record.tracts).size,record.tracts.length);assert(api.profile(key).scope.includes('Not an official city rating'));}
 for(const [i,value] of record.values.entries()){
  const [band,rating,known,total]=value;assert(band>=0&&band<=3);assert(known<=total&&known>=0);
  if(known){assert(rating>=4&&rating<=8);assert.equal(band,rating>=7?0:rating===6?1:2);}else assert.equal(band,3);
  if(['dam','levee','subsidence'].includes(data.hazardIds[i])){assert.equal(band,3);assert.equal(rating,0);assert.equal(total,0);}
 }
 const order=api.ordered(key);assert.equal(new Set(order.map(p=>p.id)).size,15);
 for(let i=1;i<order.length;i++)assert(order[i-1].risk.order<=order[i].risk.order,key);
 assert.deepEqual(JSON.parse(JSON.stringify(order)),JSON.parse(JSON.stringify(api.ordered(key))));
}
assert(api.ordered('').every(p=>p.risk.id==='unassessed'));assert(api.ordered('unknown').every(p=>p.risk.id==='unassessed'));
assert.equal(api.rating('county:57','drought').id,'high');assert.equal(api.rating('county:57','earthquake').id,'moderate');
assert.equal(api.rating('57026','earthquake').id,'high','City screening must not silently reuse county ratings');
assert.equal(api.rating('57026','tsunami').id,'unassessed');
function luminance(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
for(const band of data.bands){const a=luminance(band.color),b=luminance(band.fill),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(contrast>=4.5,band.id+' contrast '+contrast);assert(band.label);}
console.log('Risk ranking: 541 locations, 15 plans each, original ratings and scope, unassessed gaps, deterministic order, source hashes and four contrast pairs passed.');
