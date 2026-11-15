window.__shotReady = false;
const API = 'https://make.fun/api';
const qs = (o) => new URLSearchParams(o).toString();
const e = (sel, root=document) => root.querySelector(sel);
const fmtH = (ms) => {
  if (ms<=0) return 'ended';
  const h = Math.floor(ms/3600000); const m = Math.floor(ms%3600000/60000);
  return h+'h '+String(m).padStart(2,'0')+'m';
}

const cacheGet = (key) => {
  try { return JSON.parse(localStorage.getItem(key)||'null'); } catch { return null }
}
const cachePut = (key, val) => localStorage.setItem(key, JSON.stringify(val));

async function fetchWithEtag(path){
  const k = 'etag:'+path; const v = cacheGet(k);
  const headers = v?.etag ? {'If-None-Match': v.etag} : {};
  const res = await fetch(path, {headers});
  if (res.status===304) return v.data;
  const data = await res.json();
  const etag = res.headers.get('etag');
  if (etag) cachePut(k,{etag,data});
  return data;
}

async function loadBoard(q=''){
  const list = await fetchWithEtag(API + '/competitions?status=open&activity=times');
  let items = list || [];
  if (q) q=q.toLowerCase(), items = items.filter(x=> (x.title||'').toLowerCase().includes(q) || (x.slug||'').toLowerCase().includes(q));
  items.sort((a,b)=> new Date(a.deadline) - new Date(b.deadline));
  return items;
}

function nav(hash){
  location.hash = hash;
}

async function renderBoard(q){
  const app = e('#view');
  app.innerHTML = '';
  const items = await loadBoard(q||'');
  const strip = e('#strip');
  const soon = items.filter(it => new Date(it.deadline) - Date.now() < 24*3600*1000);
  strip.textContent = soon.length ? `Closing soon: ${soon.map(s=>s.title).join(' • ')}` : '';
  items.forEach(it => {
    const row = document.createElement('div'); row.className='row';
    const left = document.createElement('div');
    left.innerHTML = `<div class="title"><a href="#/bounty/${it.slug}">${it.title}</a></div><div class="meta">${it.entryFeeUsd?('$'+it.entryFeeUsd):''} • ${it.submissionCount||0} entries</div>`;
    const right = document.createElement('div');
    const cd = document.createElement('div'); cd.className='countdown'; cd.dataset.deadline = it.deadline;
    const valueDensity = document.createElement('div'); valueDensity.className='meta';
    row.append(left,right);
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
}

async function renderBounty(slug){
  const app = e('#view'); app.innerHTML = 'Loading bounty…';
  const b = await fetchWithEtag(API + '/competitions/' + encodeURIComponent(slug));
  if (!b) return app.textContent='not found';
  app.innerHTML = `<h2>${b.title}</h2><div class="meta">deadline: ${new Date(b.deadline).toLocaleString()}</div><p>${b.description||b.summary||''}</p><p><a href="#/leaderboard/${slug}">View leaderboard</a></p>`;
}

async function renderLeaderboard(slug){
  const app = e('#view'); app.innerHTML = 'Loading leaderboard…';
  const lb = await fetchWithEtag(API + '/competitions/' + encodeURIComponent(slug) + '/leaderboard?phase=dev');
  if (!lb) return app.textContent='no leaderboard';
  const ul = document.createElement('div');
  lb.forEach(r=>{ const row = document.createElement('div'); row.className='row'; row.innerHTML = `<div><a href="#/u/${r.handle}">${r.handle}</a></div><div class="meta">${r.rank} • ${r.bytes||0} bytes</div>`; ul.append(row) });
  app.innerHTML = `<h2>Leaderboard: ${slug}</h2>`; app.append(ul);
}

async function renderProfile(handle){
  const app = e('#view'); app.innerHTML = 'Loading profile…';
  const p = await fetchWithEtag(API + '/profiles/' + encodeURIComponent(handle));
  if (!p) return app.textContent='no profile';
  app.innerHTML = `<h2>${p.display_name||p.handle}</h2><div class="meta">${p.bio||''}</div><p>GitHub: ${p.github_login||'—'}</p>`;
}

function route(){
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  const view = parts[0] || '';
  const arg = parts[1] || '';
  const q = e('#search').value;
  if (!view) { renderBoard(q).then(()=> window.__shotReady = true); return }
  if (view==='bounty') renderBounty(arg).then(()=> window.__shotReady = true);
  else if (view==='leaderboard') renderLeaderboard(arg).then(()=> window.__shotReady = true);
  else if (view==='u') renderProfile(arg).then(()=> window.__shotReady = true);
}

window.addEventListener('hashchange', route);
window.addEventListener('load', ()=>{
  const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t);
  e('#theme').addEventListener('click', ()=>{ const cur = document.documentElement.getAttribute('data-theme'); const next = cur==='dark'?'':'dark'; document.documentElement.setAttribute('data-theme', next); localStorage.setItem('theme', next); });
  e('#search').addEventListener('input', ()=>{ if (!location.hash || location.hash==='#/') route(); });
  route();
});
