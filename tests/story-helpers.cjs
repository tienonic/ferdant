// Engine checks enter the resource step before measuring its pins. The opening
// story intentionally shows the boundary alone; its sequence has separate checks.
async function showEveryday(page){
 await page.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !document.querySelector('.place-story')||r.hidden||r.classList.contains('story-live')||r.classList.contains('story-static');});
 const enter=await page.evaluate(()=>{const r=document.querySelector('#resource-atlas');return r?.classList.contains('story-live')&&r.dataset.currentStep==='1'&&window.FerdantResourceMap?.active==='everyday';});
 if(!enter)return;
 await page.locator('[data-story-jump="5"]').click();
 await page.locator('#story-5').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return r.dataset.currentStep==='5'&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true'&&window.FerdantResourceMap.active==='everyday';});
}
async function openMapControls(page){
 const controls=page.locator('.story-map-controls');
 if(await controls.count()&&!await controls.evaluate(el=>el.open))await controls.locator('> summary').click();
}
module.exports={showEveryday,openMapControls};
