'use strict';
(() => {
 const dataNode=document.querySelector('#phone-data');if(!dataNode)return;
 const {directory:data,places}=JSON.parse(dataNode.textContent);
 const cities=new Map(places.cities.map(([id,name,county])=>[id,{id,name,county}]));
 const measure=document.createElement('canvas').getContext('2d');
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
 function place(key){if(cities.has(key))return cities.get(key);const county=key?.startsWith('county:')?key.slice(7):null;return places.counties[county]?{id:key,name:places.counties[county]+' County',county}:null;}
 function lines(text,width,size,weight=400){
  measure.font=`${weight} ${size}px Arial`;const result=[];let line='';
  for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(line&&measure.measureText(next).width>width){result.push(line);line=word;}else line=next;}
  if(line)result.push(line);return result;
 }
 function textBlock(text,x,y,width,size=18,color='#526170',weight=400){
  const rows=lines(text,width,size,weight),step=size*1.35;
  return {markup:rows.map((row,i)=>`<text x="${x}" y="${y+i*step}" fill="${color}" font-size="${size}" font-weight="${weight}">${escape(row)}</text>`).join(''),height:rows.length*step};
 }
 function build(key){
  const location=place(key),local=location?[...new Set([...(data.countyContacts[location.county]?.length?data.countyContacts[location.county]:['211-routing']),...(data.cityContacts[location.id]||[])])]:[];
  const statewide=data.statewide.filter(id=>!local.includes(id));
  const W=1200,pad=52,gap=28,col=(W-pad*2-gap)/2,parts=[];
  const heading=textBlock(location?location.name+', California':'California',pad,114,W-pad*2,44,'#1d2d3e',700);
  parts.push(`<text x="${pad}" y="48" font-size="20" fill="#244b84" font-weight="700">ferdant.</text><text x="${W-pad}" y="48" text-anchor="end" font-size="16" fill="#526170">OFFLINE CONTACT SHEET</text>`,heading.markup);
  let top=114+heading.height+8;
  const coverage=location?(data.cityNotes[location.id]||(location.id.startsWith('county:')?'County-level contacts. City agency coverage is not implied.':'City agency contacts have not been checked here. Statewide and any saved county help remain available.')):'Shared California support and referral lines.';
  const note=textBlock(coverage,pad+18,top+29,W-pad*2-36,18);parts.push(`<rect x="${pad}" y="${top}" width="${W-pad*2}" height="${note.height+34}" rx="4" fill="#e9f5f1"/>`,note.markup);top+=note.height+78;
  function column(ids,x,title,color){
   let y=top;parts.push(`<text x="${x}" y="${y}" font-size="24" font-weight="700" fill="${color}">${escape(title)}</text>`);y+=22;
   for(const id of ids){
    const contact=data.contacts[id],items=[];let cy=y+30;
    function add(value,size=18,ink='#526170',weight=400){const block=textBlock(value,x+20,cy,col-40,size,ink,weight);items.push(block.markup);cy+=block.height+9;}
    add(contact.title,23,'#1d2d3e',700);
    const scope=contact.scope==='Selected county'?places.counties[location.county]+' County':contact.scope;
    add([contact.kind,scope,contact.hours].filter(Boolean).join(' · '),16);
    for(const ref of contact.phones){if(ref.note)add(ref.note,16);add(data.numbers[ref.number].label+(ref.text?'  call or text':''),30,color,700);}
    add(contact.detail,17);
    const source=data.sources[contact.source];if(source.published)add('Publisher date: '+source.published+'.',14);
    const height=cy-y+5;parts.push(`<rect x="${x}" y="${y}" width="${col}" height="${height}" rx="5" fill="#ffffff" stroke="#cad5dc"/><rect x="${x}" y="${y}" width="4" height="${height}" fill="${color}"/>`,...items);y+=height+16;
   }
   return y;
  }
  if(local.length){const half=Math.ceil(local.length/2),a=column(local.slice(0,half),pad,'Local & referral help','#126c68'),b=column(local.slice(half),pad+col+gap,'','#126c68');top=Math.max(a,b)+30;}
  const half=Math.ceil(statewide.length/2),left=column(statewide.slice(0,half),pad,'California-wide support','#244b84');
  const right=column(statewide.slice(half),pad+col+gap,'','#244b84');
  let foot=Math.max(left,right)+18;
  const info=textBlock('Immediate danger: call 911. Calls and texts need phone service. This is a dated directory, without live dispatch, outages or shelter availability.',pad,foot,W-pad*2,18,'#1d2d3e');parts.push(info.markup);foot+=info.height+17;
  const dates=textBlock('Contacts checked '+data.checked+'. Publisher dates are not stated unless shown. Source dates and full guidance are included in the complete offline website.',pad,foot,W-pad*2,16);parts.push(dates.markup);foot+=dates.height+14;
  const sourceLink='Full sources, coverage and guides: ferdant.com/local/'+(location?'?place='+location.id:'');
  const sourceNote=textBlock(sourceLink,pad,foot,W-pad*2,16);parts.push(sourceNote.markup);foot+=sourceNote.height+30;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Math.ceil(foot)}" viewBox="0 0 ${W} ${Math.ceil(foot)}"><rect width="100%" height="100%" fill="#fbfcfa"/><g font-family="Arial, sans-serif">${parts.join('')}</g></svg>`;
  return {svg,width:W,height:Math.ceil(foot),location};
 }
 function embed(doc,key){const preview=doc.querySelector('#infographic-preview');if(!preview)return;const sheet=build(key);preview.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sheet.svg);preview.alt=`Contact sheet for ${sheet.location?.name||'California'}: local help and California-wide support.`;}
 window.FerdantInfographic={embed,build};
 const button=document.querySelector('#download-infographic');if(!button)return;
 let key=document.querySelector('#phone-city')?.value||document.querySelector('meta[name="ferdant-city"]')?.content||'';
 function update(next){key=next;embed(document,key);document.querySelector('#infographic-status').textContent='';}
 let pending;document.addEventListener('ferdant:location',event=>{key=event.detail.key;cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>update(key));});update(key);
 button.addEventListener('click',async()=>{
  const status=document.querySelector('#infographic-status');status.textContent='Preparing your contact sheet…';button.disabled=true;
  try{
   const sheet=build(key),img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sheet.svg);await img.decode();
   const canvas=document.createElement('canvas'),scale=1.5;canvas.width=sheet.width*scale;canvas.height=sheet.height*scale;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image unavailable');
   const url=URL.createObjectURL(blob),link=document.createElement('a'),slug=(sheet.location?.name||'california').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
   link.href=url;link.download=`ferdant-${slug}-contacts-${data.checked}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Contact sheet ready. Save it in Photos or Files for offline use.';
  }catch{status.textContent='The image could not be prepared. Try again, or download the complete offline website below.';}finally{button.disabled=false;}
 });
})();
