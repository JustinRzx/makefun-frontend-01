window.__shotReady = false;
// allow runtime override for screenshots: ?api=http://localhost:8080/api
const API = (new URLSearchParams(location.search)).get('api') || 'https://make.fun/api';
const qs = (o) => new URLSearchParams(o).toString();
const e = (sel, root=document) => root.querySelector(sel);
const fmtH = (ms) => {
  if (ms<=0) return 'ended';
  const h = Math.floor(ms/3600000); const m = Math.floor(ms%3600000/60000);
  return h+'h '+String(m).padStart(2,'0')+'m';
}
const fm = (n) => { if (n==null) return '—'; const num=Number(n)||0; if(num>=1) return '$'+num.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2}); return '$'+num.toFixed(2); }

const cg = (k) => { try { return JSON.parse(localStorage.getItem(k)||'null'); } catch { return null } }
// Quota-safe cachePut: skip huge payloads and ignore storage errors.
const cp = (k,v) => { try { const s=JSON.stringify(v); if(s.length>1000000) return false; try{ localStorage.setItem(k,s); return true }catch(e){return false} } catch(e){return false} };

async function fetchWithEtag(path){
  const k = 'etag:'+path; const v = cg(k);
  const headers = v?.etag ? {'If-None-Match': v.etag} : {};
  const res = await fetch(path, {headers});
  if (res.status===304) return v.data;
  const data = await res.json();
  const etag = res.headers.get('etag');
  if (etag) cp(k,{etag,data});
  return data;
}

async function loadBoard(q=''){
  const d = await fetchWithEtag(API + '/competitions?status=open&activity=times');
  let items = (d && d.items) ? d.items : [];
  // exclude ended bounties
  const now = Date.now();
  items = items.filter(it => new Date(it.deadline).getTime() > now);
  if (q) q=q.toLowerCase(), items = items.filter(x=> (x.title||'').toLowerCase().includes(q) || (x.slug||'').toLowerCase().includes(q));
  items.sort((a,b)=> new Date(a.deadline) - new Date(b.deadline));
  return items;
}

function nav(hash){
  location.hash = hash;
}

async function renderBoard(q){
  const app = e('#view');
  try {
    app.innerHTML = '';
    const items = await loadBoard(q||'');
    const strip = e('#strip');
    const soon = items.filter(it => new Date(it.deadline).getTime() - Date.now() < 24*3600*1000);
    strip.textContent = soon.length ? `Closing: ${soon.map(s=>s.title).join(' • ')}` : '';
    items.forEach(it => {
      const row = document.createElement('div'); row.className='row';
      const left = document.createElement('div'); left.className='col-left';
      const potVal = it.potUsd ?? it.rewardAmount ?? 0;
      left.innerHTML = `<div class="title"><a href="#/bounty/${it.slug}">${it.title}</a></div><div class="meta">fee:${it.entryFeeUsd?('$'+it.entryFeeUsd):'—'} • ${it.submissionCount||0} entries</div>`;
      const mid = document.createElement('div'); mid.className='col-mid';
      mid.innerHTML = `<div class="meta">pot:${fm(potVal)}</div>`;
      const right = document.createElement('div'); right.className='col-right';
      const cd = document.createElement('div'); cd.className='countdown'; cd.dataset.deadline = it.deadline;
      // set countdown immediately
      cd.textContent = fmtH(new Date(cd.dataset.deadline) - Date.now());
      const valueDensity = document.createElement('div'); valueDensity.className='meta';
      const hoursLeft = (new Date(it.deadline).getTime() - Date.now())/3600000;
      if (hoursLeft>0) valueDensity.textContent = `${fm(potVal/Math.max(1,hoursLeft))}/h`; else valueDensity.textContent = '—';
      row.append(left,mid,right);
      right.append(cd,valueDensity);
      app.append(row);
    });
    // ticking
    const ticks = setInterval(()=>{
      const clocks = document.querySelectorAll('.countdown');
      clocks.forEach(c=>{ c.textContent = fmtH(new Date(c.dataset.deadline)-Date.now()); });
    }, 1000);
    // stop ticking on navigate away
    window.onhashchange = ()=> clearInterval(ticks);
    return true;
  } catch (err) {
    app.textContent = 'Failed to load board: '+(err && err.message ? err.message : String(err));
    return false;
  }
}

async function renderBounty(slug){
  const app = e('#view');
  try{
    app.innerHTML = 'Loading…';
    const b = await fetchWithEtag(API + '/competitions/' + encodeURIComponent(slug));
    if (!b) { app.textContent='not found'; return false }
    const potVal = b.potUsd ?? b.rewardAmount ?? 0;
    app.innerHTML = `<h2>${b.title}</h2><div class="meta">deadline: ${new Date(b.deadline).toLocaleString()}</div><div class="meta">pot: ${fm(potVal)} • fee: ${b.entryFeeUsd?('$'+b.entryFeeUsd):'—'} • reward: ${b.rewardAmount?fm(b.rewardAmount):'—'} • ${b.submissionCount||0} entries</div><section>${b.description||b.summary||''}</section><p><a href="#/leaderboard/${slug}">View leaderboard</a></p>`;
    return true;
  } catch (err) {
    app.textContent = 'Failed to load bounty: '+(err && err.message ? err.message : String(err));
    return false;
  }
}

async function renderLeaderboard(slug){
  const app = e('#view');
  try{
    app.innerHTML = 'Loading…';
    const d = await fetchWithEtag(API + '/competitions/' + encodeURIComponent(slug) + '/leaderboard?phase=dev');
    const rows = (d && d.entries) ? d.entries : [];
    const total = rows.length || 0;
    const shown = rows.slice(0, 50);
    const ul = document.createElement('div');
    shown.forEach(r=>{
      const row = document.createElement('div'); row.className='row';
      const winMicro = r.values?.judge ?? 0;
      const winPct = (Number(winMicro)/10000).toFixed(2);
      row.innerHTML = `<div><a href="#/u/${r.handle}">${r.handle}</a> — ${r.title||''}</div><div class="meta">${r.rank} • ${winPct}% • ${r.values?.bytes ?? 0} bytes</div>`;
      ul.append(row);
    });
    app.innerHTML = `<h2>Leaderboard: ${slug}</h2>`;
    if (total > shown.length) {
      const note = document.createElement('div'); note.className = 'meta'; note.textContent = `Top ${shown.length}/${total}`; app.append(note);
    }
    app.append(ul);
    return true;
  } catch (err) {
    app.textContent = 'Failed to load leaderboard: '+(err && err.message ? err.message : String(err));
    return false;
  }
}

async function renderProfile(handle){
  const app = e('#view');
  try{
    app.innerHTML = 'Loading profile…';
    const p = await fetchWithEtag(API + '/profiles/' + encodeURIComponent(handle));
    if (!p) { app.textContent='no profile'; return false }
    app.innerHTML = `<h2>${p.display_name||p.handle}</h2><div class="meta">${p.bio||''}</div><p>GitHub: ${p.github_login||'—'}</p><p>Wallet: ${p.wallet||p.address||'—'}</p><div class="meta">entered: ${p.competitions_entered||0} • placed: ${p.competitions_placed||0} • won: ${p.competitions_won||0}</div>`;
    return true;
  } catch (err) {
    app.textContent = 'Failed to load profile: '+(err && err.message ? err.message : String(err));
    return false;
  }
}

async function route(){
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  const view = parts[0] || '';
  const arg = parts[1] || '';
  const q = e('#search').value;
  try{
    let ok = false;
    if (!view) { ok = await renderBoard(q); }
    else if (view==='bounty') ok = await renderBounty(arg);
    else if (view==='leaderboard') ok = await renderLeaderboard(arg);
    else if (view==='u') ok = await renderProfile(arg);
    // set shot ready only on success
    if (ok) { const wait = Number(new URLSearchParams(location.search).get("wait")||0); if (wait>0) setTimeout(()=> window.__shotReady = true, wait); else window.__shotReady = true; } else window.__shotReady = false;
  } catch(err){
    e('#view').textContent = 'Routing error: '+(err && err.message?err.message:String(err));
    window.__shotReady = false;
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('load', ()=>{
  const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t);
  const themeBtn = e('#theme');
  if (themeBtn) themeBtn.addEventListener('click', ()=>{ const cur = document.documentElement.getAttribute('data-theme'); const next = cur==='dark'?'':'dark'; document.documentElement.setAttribute('data-theme', next); localStorage.setItem('theme', next); themeBtn.textContent = next==='dark' ? 'Dark' : 'Light'; });
  // set initial theme button label
  if (themeBtn) themeBtn.textContent = document.documentElement.getAttribute('data-theme')==='dark' ? 'Dark' : 'Light';
  e('#search').addEventListener('input', ()=>{ if (!location.hash || location.hash==='#/') route(); });
  route();
});
