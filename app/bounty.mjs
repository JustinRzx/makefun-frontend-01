export async function renderBounty(slug){window.__shotReady = false; const API=(new URLSearchParams(location.search)).get('api')||'https://make.fun/api';
const e=(s,r=document)=>r.querySelector(s);
const cg=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
const cp=(k,v)=>{try{const s=JSON.stringify(v); if(s.length>1000000) return false; localStorage.setItem(k,s);return true}catch{return false}}
async function fetchWithEtag(path){const k='etag:'+path;const prev=cg(k);const headers=prev?.etag?{'If-None-Match':prev.etag}:{ };const res=await fetch(path,{headers});if(res.status===304) return prev.data;const data=await res.json();const et=res.headers.get('etag');if(et) cp(k,{etag:et,data});return data}
const app=e('#view'); app.innerHTML=''; try{const b=await fetchWithEtag(API+'/competitions/'+encodeURIComponent(slug)); if(!b) {app.textContent='not found'; return}
const pot=b.potUsd||b.rewardAmount||0; const fee=b.entryFeeUsd||0; const rows=b.submissionCount||0;
const h=document.createElement('div'); h.innerHTML=`<h2>${b.title}</h2><div class="meta">${b.description?b.description.substring(0,200):''}</div>`;
const info=document.createElement('div'); info.className='meta'; info.innerHTML=`Pot: ${pot?('$'+pot):'—'} • Fee: ${fee?('$'+fee):'Free'} • Entries: ${rows}`;
const table=document.createElement('table'); table.innerHTML=`<thead><tr><th>Place</th><th>Base</th><th>Fee share</th><th>Pays now</th></tr></thead>`;
const body=document.createElement('tbody'); const base=b.rewardAmount||0; for(let i=1;i<=5;i++){const feeShare=Math.max(0,Math.round((base*(6-i))/15)); const pays=base+Math.round(feeShare*rows); const tr=document.createElement('tr'); tr.innerHTML=`<td>${i}</td><td>${base}</td><td>${feeShare}</td><td>${pays}</td>`; body.append(tr)} table.append(body);
app.append(h,info,table);
// Top 5 now
const lb=await fetchWithEtag(API+'/competitions/'+encodeURIComponent(slug)+'/leaderboard?phase=dev'); const now=(lb && lb.entries)?lb.entries.slice(0,5):[]; const strip=document.createElement('div'); strip.innerHTML='<h3>Top 5 now</h3>' + now.map(x=>`<div class="row"><div><a href="#/u/${x.handle}">${x.handle}</a></div><div class="meta">${((Number(x.values?.judge)||0)/10000).toFixed(2)}%</div></div>`).join(''); app.append(strip);
window.__shotReady = true; }catch(e){app.textContent='Failed to load bounty'} }
