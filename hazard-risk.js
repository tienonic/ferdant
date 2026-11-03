'use strict';
(() => {
 const node=document.querySelector('#resource-map-data');if(!node)return;
 const config=JSON.parse(node.textContent),data=config.hazardRisk;if(!data)return;
 function profile(key){
  const record=data.locations[key];
  const scope=!record?'Choose a city or county for a local ranking.':record.scope==='county'?'FEMA county-level risk ratings.':'City-area screening: highest rating across '+record.tracts.length+' overlapping census tracts. Not an official city rating.';
  const coverage=record?.scope==='city-tract-screen'&&record.coverage<95?' Mapped-area coverage: '+record.coverage+'% (includes water where present); other areas remain unassessed.':'';
  return {record,scope:scope+coverage,release:data.release,method:data.method};
 }
 function rating(key,id){
  const i=data.hazardIds.indexOf(id),record=data.locations[key],value=record?.values[i]||[3,0,0,0];
  return {...data.bands[value[0]],order:value[0],sourceRating:record?data.ratingLabels[value[1]]:'No location selected',ratedComponents:value[2],totalComponents:value[3],scopeNote:data.scopeNotes[id]||'No rating source'};
 }
 function ordered(key,plans=config.disasters.plans){return plans.map(p=>({...p,risk:rating(key,p.id)})).sort((a,b)=>a.risk.order-b.risk.order||data.hazardIds.indexOf(a.id)-data.hazardIds.indexOf(b.id));}
 window.FerdantRisk={data,profile,rating,ordered};
})();
