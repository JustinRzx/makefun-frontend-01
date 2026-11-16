export async function renderBounty(slug, container){
  // If no container provided, render full view as before
  window.__shotReady = false;
  const API=(new URLSearchParams(location.search)).get('api')||'https://make.fun/api';
  const e=(s,r=document)=>r.querySelector(s);
  const cg=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
  const cp=(k,v)=>{try{const s=JSON.stringify(v); if(s.length>1000000) return false; localStorage.setItem(k,s);return true}catch{return false}}
  async function fetchWithEtag(path){const k='etag:'+path;const prev=cg(k);const headers=prev?.etag?{'If-None-Match':prev.etag}:{ };const res=await fetch(path,{headers});if(res.status===304) return prev.data;const data=await res.json();const et=res.headers.get('etag');if(et) cp(k,{etag:et,data});return data}
  try{
    const target = container || e('#view');
    if(!container) target.innerHTML='';
    const b = await fetchWithEtag(API+'/competitions/'+encodeURIComponent(slug));
    if(!b){ if(!container) target.textContent='not found'; return }

    function trunc(s, n){ if(!s) return ''; if(s.length<=n) return s; const t=s.substring(0,n); const i=t.lastIndexOf(' '); return (i>0?t.substring(0,i):t) + '…' }

    // Header
    const h=document.createElement('div');
    h.innerHTML=`<h2>${b.title}</h2><div class="meta">${trunc(b.description,200)}</div>`;

    // Info and Dates
    const info=document.createElement('div'); info.className='meta';
    const pot = (typeof b.potUsd==='string')?Number(b.potUsd):b.potUsd||0; const fee=b.entryFeeUsd||0; const rows=b.submissionCount||0;
    let datesHtml='';
    const fmt = d=>{try{return new Date(d).toISOString().replace('T',' ').replace(/:\d{2}\.\d+Z$/,'Z')}catch{return ''}};
    if(b.opensAt||b.publishedAt||b.deadline){
      datesHtml += '<h4>Dates</h4><div class="meta">';
      if(b.publishedAt) datesHtml += 'Published: '+fmt(b.publishedAt)+' • ';
      if(b.opensAt) datesHtml += 'Opens: '+fmt(b.opensAt)+' • ';
      if(b.deadline) datesHtml += 'Deadline: '+fmt(b.deadline)+' • ';
      // results time: from phases if present
      let resTxt='after judging';
      if(Array.isArray(b.phases)){
        const resPhase=b.phases.find(p=>/result|judg/i.test(p.name));
        if(resPhase && resPhase.endsAt) resTxt=new Date(resPhase.endsAt).toISOString().replace('T',' ').replace(/:\d{2}\.\d+Z$/,'Z');
      }
      datesHtml += 'Results: '+resTxt;
      datesHtml += '</div>';
    }

    info.innerHTML=`Pot: ${pot?('$'+pot.toFixed(2)):'—'} • Fee: ${fee?('$'+fee):'Free'} • Entries: ${rows} ${datesHtml}`;

    // Rewards table
    const rewardsSrc = b.rewardsNow || b.rewards || {};
    // rewardsSrc expected to map place->base amount, and sum to 500 (or rewardAmount)
    const rewardTotal = Number(b.rewardAmount||0) || Object.values(rewardsSrc||{}).reduce((s,x)=>s+Number(x||0),0) || 0;
    const feePool = (Number(pot)||0) - rewardTotal; // may be negative
    function dollar(n){return '$'+Number(n||0).toFixed(2)}

    const table=document.createElement('table');
    table.innerHTML=`<thead><tr><th>Place</th><th>Base</th><th>Fee share</th><th>Pays now</th></tr></thead>`;
    const body=document.createElement('tbody');
    const groups = [[1],[2],[3],[4,10],[11,20]];
    for(const g of groups){
      let label=''; let start=g[0], end=(g[1]||g[0]);
      label = (start===end)?String(start):`${start}th–${end}th`;
      // If a range, assume same base for each place inside; pick first place base
      const place = start;
      const base = Number(rewardsSrc[String(place)]||0);
      const feeShare = rewardTotal>0? (feePool * (base / (rewardTotal||500)) ) : 0;
      const pays = base + feeShare;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${label}</td><td>${dollar(base)}</td><td>${dollar(feeShare)}</td><td>${dollar(pays)}</td>`;
      body.append(tr);
    }
    table.append(body);

    // Top 5 now
    const lb=await fetchWithEtag(API+'/competitions/'+encodeURIComponent(slug)+'/leaderboard?phase=dev');
    const now=(lb && lb.entries)?lb.entries.slice(0,5):[];
    const strip=document.createElement('div'); strip.innerHTML='<h3>Top 5 now</h3>' + now.map(x=>`<div class="row"><div><a href="#/u/${x.handle}">${x.handle}</a></div><div class="meta">${((Number(x.values?.judge)||0)/10000).toFixed(2)}%</div></div>`).join('');

    if(!container) target.append(h,info,table,strip); else target.innerHTML=''; target.append(h,info,table,strip);

    if(!container) window.__shotReady = true;
  }catch(e){ if(container) container.textContent='Failed to load bounty'; else document.querySelector('#view').textContent='Failed to load bounty' }
}
