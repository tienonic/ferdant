// Isolate repeatable UI checks from third-party rate limits. Live sources get a
// separate smoke check; these fixtures never stand in for a successful live feed.
const tile=/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/;
const shelter=/^https:\/\/gis\.fema\.gov\/arcgis\/rest\/services\/NSS\/FEMA_NSS\/FeatureServer\/0\/query\?/;
const faultTile=/^https:\/\/tiles\.arcgis\.com\/tiles\/zr3KAIbsRSUyARHG\/arcgis\/rest\/services\/QuatFaults_Tiles\/MapServer\/tile\/\d+\/\d+\/\d+$/;
const area=url=>{try{const u=new URL(url),base=new URL(process.env.SITE_URL||'http://127.0.0.1:4173');return u.origin===base.origin&&!u.search&&/^\/assets\/data\/(city-maps|service-maps|everyday-maps|evacuation-routes|visit-facts)\/\d{2}\.json$/.test(u.pathname);}catch{return false;}};
const fs=require('node:fs');
const registry=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/<script type="application\/json" id="resource-map-data">(.*?)<\/script>/s)[1]).disasters;
const services=Object.values(registry.layers).map(x=>x.service);
const image=/^https:\/\/(mapservices\.weather\.noaa\.gov\/.*NWS_HeatRisk|coast\.noaa\.gov\/arcgis\/rest\/directories\/arcgisoutput\/dc_slr\/slr_3ft_MapServer\/|gis\.conservation\.ca\.gov\/server\/rest\/directories\/arcgisoutput\/CGS\/FaultActivityMapCA_MapServer\/).*\.png(?:\?|$)/;
exports.isPublicMapRequest=url=>tile.test(url)||faultTile.test(url)||shelter.test(url)||area(url)||services.some(s=>url.startsWith(s+'/query?')||url.startsWith(s+'/exportImage?')||url.startsWith(s+'/export?'))||image.test(url);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
exports.stubPublicMap=async context=>{
 await context.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:png}));
 await context.route(url=>faultTile.test(url.href),route=>route.fulfill({contentType:'image/png',body:png}));
 await context.route('https://gis.fema.gov/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[]})}));
 await context.route(url=>services.some(s=>url.href.startsWith(s+'/'))||image.test(url.href),route=>{
  const url=new URL(route.request().url()),q=url.searchParams;
  if(faultTile.test(url.href))return route.fulfill({contentType:'image/png',body:png});
  if(image.test(url.href))return route.fulfill({contentType:'image/png',body:png});
  if(url.pathname.endsWith('/exportImage'))return route.fulfill({contentType:'application/json',body:JSON.stringify({href:'https://mapservices.weather.noaa.gov/experimental/rest/directories/arcgisoutput/NWS_HeatRisk_test.png',extent:{xmin:-13560000,ymin:4620000,xmax:-13540000,ymax:4640000,spatialReference:{wkid:3857}}})});
  if(url.pathname.endsWith('/export'))return route.fulfill({contentType:'application/json',body:JSON.stringify({href:url.host==='gis.conservation.ca.gov'?'https://gis.conservation.ca.gov/server/rest/directories/arcgisoutput/CGS/FaultActivityMapCA_MapServer/test.png':'https://coast.noaa.gov/arcgis/rest/directories/arcgisoutput/dc_slr/slr_3ft_MapServer/test.png',extent:{xmin:-13560000,ymin:4620000,xmax:-13540000,ymax:4640000,spatialReference:{wkid:3857}}})});
  if(url.href.includes('NWS_HeatRisk'))return route.fulfill({contentType:'application/json',body:JSON.stringify({features:[{attributes:{objectid:1,idp_filedate:Date.now()-3600000,idp_validtime:Date.now()+3600000}}]})});
  if(q.get('f')==='json')return route.fulfill({contentType:'application/json',body:JSON.stringify({features:[{attributes:{target:new Date().toLocaleString('en-US',{month:'short',timeZone:'UTC'})+' '+new Date().getUTCFullYear(),idp_filedate:Date.now()-3600000}}]})});
  const [w,s,e,n]=(q.get('geometry')||'-121.8,38.5,-121.7,38.6').split(',').map(Number),x=w+(e-w)*.3,y=s+(n-s)*.3,dx=(e-w)*.15,dy=(n-s)*.15;
  return route.fulfill({contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy],[x,y]]]},properties:{OBJECTID:1,FHSZ_Description:'High',VertDispFT:'-0.4 - -0.2',outlook:'Persistence',prod_type:'Test current alert',expiration:new Date(Date.now()+3600000).toISOString(),issuance:new Date(Date.now()-3600000).toISOString()}}]})});
 });
};
