const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = async function checkAccessibility(page, width) {
 await page.locator('[data-portal-card]').evaluateAll(rows=>rows.forEach(row=>row.open=true));
 await page.getByLabel('City or county in California',{exact:true}).selectOption('57026');
 const measurements = await page.evaluate(() => {
  const rgba = value => value.match(/[\d.]+/g).map(Number);
  const luminance = value => {
   const channels = rgba(value).slice(0,3).map(c=>{c/=255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});
   return channels.reduce((sum,c,i)=>sum+c*[0.2126,0.7152,0.0722][i],0);
  };
  const background = element => {
   for (let node=element;node;node=node.parentElement) {
    const color=getComputedStyle(node).backgroundColor, channels=rgba(color);
    if (channels.length<4 || channels[3]===1) return color;
   }
   return 'rgb(255,255,255)';
  };
  const ratio = (a,b) => {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const visible = element => element.getClientRects().length>0;
  const text=[...document.querySelectorAll('.location-start h2, #location-summary, #location-coverage, .location-source-note, #location-links h3 a, #location-links small, #location-links .phone-method a, .service-toggle strong, .service-toggle small, .phone-toggle span, .phone-toggle small, .destination-label > span, .portal-description, .portal-note, .portal-destination small, .portal-nav a, .phone-heading h2, .phone-coverage, .phone-table th, .phone-table th > small, .phone-method a, .phone-footnote, .phone-controls label')].filter(visible);
  const icons=[...document.querySelectorAll('.service-toggle > .ui-icon:first-child, .destination-label > .ui-icon')].filter(visible);
  const targets=[...document.querySelectorAll('#location-city, .service-toggle, .portal-destination, .portal-nav a, .portal-search button, .phone-method a, #phone-city, #phone-query, .phone-actions a, .phone-toggle, #map-city-search, #map-city-form button, .leaflet-control-zoom a')].filter(visible);
  return {
   textMinimum:Math.min(...text.map(el=>ratio(getComputedStyle(el).color,background(el)))),
   iconMinimum:Math.min(...icons.map(el=>ratio(getComputedStyle(el).color,background(el)))),
   headerColors:new Set([...document.querySelectorAll('.service-toggle > .ui-icon:first-child')].map(el=>getComputedStyle(el).color)).size,
   targetMinimum:Math.min(...targets.map(el=>el.getBoundingClientRect().height)),
   hiddenNavLinks:[...document.querySelectorAll('.portal-nav nav')].some(nav=>[...nav.querySelectorAll('a')].some(link=>link.getBoundingClientRect().right>nav.getBoundingClientRect().right+1)),
   allIconsDecorative:[...document.querySelectorAll('.ui-icon')].every(el=>el.getAttribute('aria-hidden')==='true'&&el.getAttribute('focusable')==='false')
  };
 });
 assert(measurements.textMinimum>=4.5, `Text contrast at ${width}: ${measurements.textMinimum}`);
 assert(measurements.iconMinimum>=3, `Icon contrast at ${width}: ${measurements.iconMinimum}`);
 assert.equal(measurements.headerColors,5);
 assert(measurements.targetMinimum>=44, `Primary targets smaller than 44px at ${width}`);
 assert(!measurements.hiddenNavLinks, `Section links hidden horizontally at ${width}`);
 assert(measurements.allIconsDecorative);
 const first=page.locator('.portal-destination').first();await first.focus();
 assert(await first.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));

 const spacing=await page.addStyleTag({content:'body * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `Text spacing causes overflow at ${width}`);
 assert.equal(await page.locator('[data-portal-card]:visible').count(),5);
 await spacing.evaluate(el=>el.remove());
 if(width===390) {
  await page.emulateMedia({forcedColors:'active'});
  await first.focus();
  assert(await first.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));
  await page.screenshot({path:'screenshots/directory-forced-colors.png',fullPage:true});
  await page.emulateMedia({forcedColors:'none'});
 }
 await page.getByLabel('City or county in California',{exact:true}).selectOption('');
 await page.locator('[data-portal-card]').evaluateAll(rows=>rows.forEach(row=>row.open=false));
 await page.locator('#what-am-i-paying-for > summary').click();
 const path='screenshots/accessibility.json';
 const data=width===320?[]:JSON.parse(fs.readFileSync(path,'utf8'));
 data.push({width,...measurements,textSpacing:'passed',focus:'passed',forcedColors:width===390?'passed':'not run at this width'});
 fs.writeFileSync(path,JSON.stringify(data,null,2));
};
