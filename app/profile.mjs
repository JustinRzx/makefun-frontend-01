export async function renderProfile(handle){window.__shotReady = false; const API=(new URLSearchParams(location.search)).get('api')||'https://make.fun/api';
const e=(s,r=document)=>r.querySelector(s);
const cg=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
const cp=(k,v)=>{try{const s=JSON.stringify(v); if(s.length>1000000) return false; localStorage.setItem(k,s);return true}catch{return false}}
async function fetchWithEtag(path){const k='etag:'+path;const prev=cg(k);const headers=prev?.etag?{'If-None-Match':prev.etag}:{ };const res=await fetch(path,{headers});if(res.status===304) return prev.data;const data=await res.json();const et=res.headers.get('etag');if(et) cp(k,{etag:et,data});return data}
const app=e('#view'); app.innerHTML=''; try{const p=await fetchWithEtag(API+'/profiles/'+encodeURIComponent(handle)); if(!p) {app.textContent='not found';return} const div=document.createElement('div'); div.innerHTML=`<h2>${p.display_name||p.handle}</h2><div class="meta">${p.bio||''}</div><div class="meta">github: ${p.github_login||'—'}</div>`; app.append(div); window.__shotReady = true;}catch(e){app.textContent='Failed to load profile'} }
