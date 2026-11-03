// Isolate repeatable UI checks from third-party rate limits. Live sources get a
// separate smoke check; these fixtures never stand in for a successful live feed.
const tile=/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/;
const shelter=/^https:\/\/gis\.fema\.gov\/arcgis\/rest\/services\/NSS\/FEMA_NSS\/FeatureServer\/0\/query\?/;
const area=/\/assets\/data\/city-maps\/\d{2}\.json$/;
exports.isPublicMapRequest=url=>tile.test(url)||shelter.test(url)||area.test(url);
exports.stubPublicMap=async context=>{
 await context.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 await context.route('https://gis.fema.gov/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[]})}));
};
