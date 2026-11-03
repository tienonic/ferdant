// Count resources represented by both individual pins and numbered groups.
async function mappedIds(page){return page.locator('.atlas-pin,.atlas-cluster').evaluateAll(els=>els.flatMap(el=>el.dataset.resourceIds?JSON.parse(el.dataset.resourceIds):[el.dataset.resourceId]));}
async function mappedCount(page,...kinds){const ids=await mappedIds(page);return page.evaluate(async({ids,kinds})=>{const directory=await window.FerdantResourceMap.directory(document.querySelector('#phone-city').value);return directory.items.filter(f=>ids.includes(f.id)&&kinds.includes(f.kind)).length;},{ids,kinds});}
module.exports={mappedIds,mappedCount};
