/* Krama — a goal → milestone → sprint → task planner for one person and one mentor.
   Vanilla JS, no build step. Data lives in localStorage, optionally mirrored to Supabase. */

const STORE_KEY='krama_v1', CFG_KEY='krama_sync', VIEW_KEY='krama_view', WHO_KEY='krama_who';
const MS=86400000;
const DEMO=new URLSearchParams(location.search).has('demo');

let S=null, sb=null, activity={}, view='today', dragId=null;
let me=localStorage.getItem(WHO_KEY)||'Shardul';
let reviewSprintId=null;

/* ---------------- small helpers ---------------- */
const $=id=>document.getElementById(id);
const esc=s=>(s==null?'':String(s)).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const uid=p=>p+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);
const parseD=s=>s?new Date(s+'T00:00:00'):null;
const toISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const daysBetween=(a,b)=>Math.round((b-a)/MS);
const fmtShort=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const fmtLong=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const num=v=>Number(v)||0;
const kindOf=e=>KIND[e&&e.kind]||KIND.project;
const epicOf=id=>S.epics.find(e=>e.id===id)||null;
const personHex=n=>(PEOPLE[n]||{}).hex||'#9a7b5f';

/* ---------------- persistence ---------------- */
function clone(o){return JSON.parse(JSON.stringify(o))}

function load(){
  if(DEMO)return demoData();
  const raw=localStorage.getItem(STORE_KEY);
  if(raw){try{return migrate(JSON.parse(raw))}catch(e){console.warn('Saved plan unreadable, falling back to seed',e)}}
  return clone(SEED);
}
/* Fill in anything a older save is missing, so a new field never crashes an old plan. */
function migrate(d){
  const base=clone(SEED);
  d.goal=Object.assign({},base.goal,d.goal||{});
  d.settings=Object.assign({},base.settings,d.settings||{});
  for(const k of ['epics','milestones','sprints','tasks','events','retros'])if(!Array.isArray(d[k]))d[k]=[];
  d.tasks.forEach(t=>{if(!Array.isArray(t.comments))t.comments=[]});
  return d;
}
function save(){
  if(!DEMO)localStorage.setItem(STORE_KEY,JSON.stringify(S));
  if(sb)push();
  render();
}
/* Save without re-rendering — for inline edits that manage their own DOM. */
function saveQuiet(){
  if(!DEMO)localStorage.setItem(STORE_KEY,JSON.stringify(S));
  if(sb)push();
}

function loadCfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY))}catch(e){return null}}
function chip(cls,txt){$('syncChip').className='sync '+cls;$('syncTxt').textContent=txt}
async function pull(){
  if(!sb)return false;
  try{
    const r=await fetch(`${sb.url}/rest/v1/plan?select=data&id=eq.main`,
      {headers:{apikey:sb.key,Authorization:'Bearer '+sb.key}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json();
    if(j[0]&&j[0].data&&j[0].data.tasks){S=migrate(j[0].data);localStorage.setItem(STORE_KEY,JSON.stringify(S))}
    chip('live','Live');return true;
  }catch(e){chip('err','Sync error');return false}
}
async function push(){
  if(!sb)return;
  try{
    const r=await fetch(`${sb.url}/rest/v1/plan?on_conflict=id`,{method:'POST',
      headers:{apikey:sb.key,Authorization:'Bearer '+sb.key,'Content-Type':'application/json',
               Prefer:'resolution=merge-duplicates'},
      body:JSON.stringify([{id:'main',data:S}])});
    if(!r.ok)throw new Error('HTTP '+r.status);
    chip('live','Live');
  }catch(e){chip('err','Sync error')}
}
/* Repo activity is written nightly by the GitHub Action; fall back to the seed snapshot. */
async function loadActivity(){
  activity=Object.assign({},SEED_ACTIVITY);
  try{
    const r=await fetch('activity.json',{cache:'no-store'});
    if(r.ok){const j=await r.json();if(j&&typeof j==='object')Object.assign(activity,j)}
  }catch(e){/* file is optional — the seed snapshot stands in */}
}

/* ---------------- derived ---------------- */
function activeSprint(){return S.sprints.find(s=>!s.closed)||S.sprints[S.sprints.length-1]||null}
function tasksIn(sid){return S.tasks.filter(t=>t.sprintId===sid)}
function committedHours(sid){return tasksIn(sid).reduce((n,t)=>n+num(t.est),0)}
function doneHours(sid){return tasksIn(sid).filter(t=>t.status==='done').reduce((n,t)=>n+num(t.est),0)}

/* Every occurrence of every commitment between two dates, repeats expanded. */
function eventsBetween(from,to){
  const out=[];
  for(const e of S.events){
    const anchor=parseD(e.date);if(!anchor)continue;
    const step=e.repeat==='weekly'?7:e.repeat==='fortnightly'?14:0;
    if(!step){if(anchor>=from&&anchor<=to)out.push(Object.assign({},e));continue}
    let d=new Date(anchor);
    while(d<from)d=addDays(d,step);
    for(;d<=to;d=addDays(d,step))out.push(Object.assign({},e,{date:toISO(d)}));
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));
}
function eventHours(from,to){return eventsBetween(from,to).reduce((n,e)=>n+num(e.hours),0)}

/* Capacity = working days x hours per day, minus the hours meetings already claim.
   Sundays are excluded; everything else counts, because he is not on a 5-day week. */
function workingDays(from,to){
  let n=0;for(let d=new Date(from);d<=to;d=addDays(d,1))if(d.getDay()!==0)n++;
  return n;
}
function capacityOf(sp){
  if(!sp)return {gross:0,meetings:0,net:0,days:0};
  const a=parseD(sp.start),b=parseD(sp.end);
  const days=workingDays(a,b);
  const gross=days*num(S.settings.hoursPerDay);
  const meetings=eventHours(a,b);
  return {gross,meetings,net:Math.max(0,gross-meetings),days};
}
function velocityHistory(){
  return S.sprints.filter(s=>s.closed).map(s=>({sprint:s,hours:doneHours(s.id)}));
}
function avgVelocity(){
  const h=velocityHistory();
  return h.length?h.reduce((n,x)=>n+x.hours,0)/h.length:0;
}
function dueClass(due,status){
  if(!due||status==='done')return '';
  const diff=daysBetween(today(),parseD(due));
  return diff<0?'over':diff<=7?'soon':'';
}
function repoAge(repo){
  if(!repo||!activity[repo])return null;
  return daysBetween(parseD(activity[repo]),today());
}

/* ---------------- generic UI bits ---------------- */
/* Native confirm()/alert() block the page, so Krama uses its own. */
function ask(message,confirmLabel){
  return new Promise(res=>{
    const o=document.createElement('div');o.className='overlay show';
    o.innerHTML=`<div class="modal" style="width:400px"><h2>Are you sure?</h2>
      <div class="body"><p class="help" style="font-size:13.5px">${esc(message)}</p></div>
      <div class="foot"><span></span><div class="right">
        <button class="btn" data-a="0">Cancel</button>
        <button class="btn primary" data-a="1">${esc(confirmLabel||'Yes')}</button></div></div></div>`;
    document.body.appendChild(o);
    o.addEventListener('click',e=>{
      const b=e.target.closest('[data-a]');
      if(!b&&e.target!==o)return;
      o.remove();res(b?b.dataset.a==='1':false);
    });
  });
}
let toastEl=null;
function toast(msg){
  if(!toastEl){toastEl=document.createElement('div');toastEl.className='tip';
    toastEl.style.cssText='left:50%;transform:translateX(-50%);bottom:26px;top:auto;max-width:420px;text-align:center';
    document.body.appendChild(toastEl)}
  toastEl.textContent=msg;toastEl.classList.add('show');
  clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),2600);
}
const tipEl=()=>$('tip');
function showTip(html,x,y){
  const t=tipEl();t.innerHTML=html;t.classList.add('show');
  const r=t.getBoundingClientRect();
  t.style.left=Math.max(8,Math.min(x+14,innerWidth-r.width-8))+'px';
  t.style.top=Math.max(8,y-r.height-12)+'px';
}
function hideTip(){tipEl().classList.remove('show')}

function epicPill(t){
  const e=epicOf(t.epicId);if(!e)return '';
  return `<span class="pill epic"><span class="sw" style="background:${kindOf(e).hex}"></span>${esc(e.title)}</span>`;
}
function taskMeta(t){
  let m=epicPill(t);
  if(num(t.est))m+=`<span class="pill est">${num(t.est)}h</span>`;
  if(t.due)m+=`<span class="pill date ${dueClass(t.due,t.status)}">${fmtShort(parseD(t.due))}</span>`;
  if(t.who&&t.who!=='Shardul')m+=`<span class="pill who">${esc(t.who)}</span>`;
  if(t.comments&&t.comments.length)m+=`<span class="pill cmt">${t.comments.length} 🗩</span>`;
  return m;
}

/* ---------------- charts ----------------
   Thin marks, one axis, recessive grid, legend for two series, hover tooltip.
   Palette is the validated categorical ramp in style.css — never an invented hue. */
function lineChart(el,series,opts){
  /* The SVG scales to its container width and keeps its aspect ratio, so the viewBox
     is chosen to match the shape of the card it sits in — not a fixed pixel size. */
  const W=opts.width||1000,H=opts.height||250,P={t:14,r:20,b:30,l:44};
  const iw=W-P.l-P.r, ih=H-P.t-P.b;
  const maxY=Math.max(1,...series.flatMap(s=>s.points.map(p=>p.y)));
  const n=opts.labels.length;
  const X=i=>P.l+(n<2?iw/2:i*iw/(n-1));
  const Y=v=>P.t+ih-(v/maxY)*ih;
  const ticks=4;
  let g='';
  for(let i=0;i<=ticks;i++){
    const v=maxY*i/ticks,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}"/>`;
    g+=`<text class="axlbl" x="${P.l-7}" y="${y+3.5}" text-anchor="end">${Math.round(v)}</text>`;
  }
  opts.labels.forEach((lb,i)=>{
    if(n>10&&i%2)return;
    g+=`<text class="axlbl" x="${X(i)}" y="${H-8}" text-anchor="middle">${esc(lb)}</text>`;
  });
  let paths='';
  series.forEach(s=>{
    const pts=s.points.filter(p=>p.y!=null);
    if(!pts.length)return;
    const d=pts.map((p,i)=>`${i?'L':'M'}${X(p.x)} ${Y(p.y)}`).join(' ');
    paths+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"
      stroke-linecap="round" ${s.dash?'stroke-dasharray="5 4"':''}/>`;
    if(s.marker){
      const last=pts[pts.length-1];
      paths+=`<circle cx="${X(last.x)}" cy="${Y(last.y)}" r="4.5" fill="${s.color}" stroke="var(--panel)" stroke-width="2"/>`;
    }
  });
  /* One hit column per x, so the tooltip works anywhere in the band. */
  let hits='';
  opts.labels.forEach((lb,i)=>{
    const w=n<2?iw:iw/(n-1), x=X(i)-w/2;
    /* data-tip holds markup. esc() applies exactly once here: the browser decodes the
       entities back when we read dataset.tip, so never pre-escape the pieces. */
    const vals=series.map(s=>{const p=s.points.find(p=>p.x===i);
      return p&&p.y!=null?`${s.name} <b>${Math.round(p.y*10)/10}h</b>`:null}).filter(Boolean);
    hits+=`<rect class="hit" x="${x}" y="${P.t}" width="${w}" height="${ih}"
      data-tip="${esc('<b>'+lb+'</b><br>'+vals.join('<br>'))}"/>`;
  });
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img"
      aria-label="${esc(opts.aria||'')}">
    ${g}<line class="axis" x1="${P.l}" y1="${P.t+ih}" x2="${W-P.r}" y2="${P.t+ih}"/>${paths}${hits}</svg>`;
  wireTips(el);
}
function barChart(el,bars,opts){
  const W=opts.width||620,H=opts.height||240,P={t:22,r:16,b:30,l:42};
  const iw=W-P.l-P.r, ih=H-P.t-P.b;
  const maxY=Math.max(1,...bars.map(b=>b.v),opts.refLine||0);
  const step=iw/Math.max(1,bars.length);
  const bw=Math.min(52,step-10);            /* 2px+ of surface between adjacent bars */
  const Y=v=>P.t+ih-(v/maxY)*ih;
  let g='';
  for(let i=0;i<=4;i++){
    const v=maxY*i/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}"/>`;
    g+=`<text class="axlbl" x="${P.l-7}" y="${y+3.5}" text-anchor="end">${Math.round(v)}</text>`;
  }
  let marks='';
  bars.forEach((b,i)=>{
    const x=P.l+i*step+(step-bw)/2, y=Y(b.v), h=P.t+ih-y;
    marks+=`<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h,2)}" rx="4"
      fill="${b.color||'#9b2c2c'}" ${b.faint?'opacity=".45"':''}/>`;
    marks+=`<text class="vlbl" x="${x+bw/2}" y="${y-7}" text-anchor="middle">${Math.round(b.v)}</text>`;
    marks+=`<text class="axlbl" x="${x+bw/2}" y="${H-9}" text-anchor="middle">${esc(b.label)}</text>`;
    marks+=`<rect class="hit" x="${P.l+i*step}" y="${P.t}" width="${step}" height="${ih}"
      data-tip="${esc('<b>'+b.label+'</b><br>'+(b.tip||b.v+'h finished'))}"/>`;
  });
  let ref='';
  if(opts.refLine){
    const y=Y(opts.refLine);
    ref=`<line x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}" stroke="var(--faint)" stroke-width="2" stroke-dasharray="5 4"/>
      <text class="axlbl" x="${W-P.r}" y="${y-6}" text-anchor="end">average ${Math.round(opts.refLine)}h</text>`;
  }
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img"
      aria-label="${esc(opts.aria||'')}">
    ${g}<line class="axis" x1="${P.l}" y1="${P.t+ih}" x2="${W-P.r}" y2="${P.t+ih}"/>${ref}${marks}</svg>`;
  wireTips(el);
}
function wireTips(el){
  el.querySelectorAll('[data-tip]').forEach(r=>{
    r.addEventListener('mousemove',e=>showTip(r.dataset.tip,e.clientX,e.clientY));
    r.addEventListener('mouseleave',hideTip);
  });
}

/* ---------------- sprint strip (shared by Today and Sprint) ---------------- */
function stripHTML(sp){
  if(!sp)return `<div class="sprint-strip"><div class="goal">No sprint yet — open Settings to start one.</div></div>`;
  const a=parseD(sp.start),b=parseD(sp.end),t=today();
  const left=Math.max(0,daysBetween(t,b)+1);
  const cap=capacityOf(sp);
  const committed=committedHours(sp.id), done=doneHours(sp.id);
  const pctDone=Math.min(100,cap.net?done/cap.net*100:0);
  const pctRest=Math.min(100-pctDone,cap.net?(committed-done)/cap.net*100:0);
  const over=committed>cap.net;
  const spare=Math.round((cap.net-committed)*10)/10;
  const note=over
    ? `Over-committed by ${Math.round((committed-cap.net)*10)/10}h — take something out`
    : spare>cap.net*0.35
      ? `${spare}h still unplanned — pull more in`
      : `${spare}h spare — a realistic sprint`;
  return `<div class="sprint-strip">
    <div class="daysleft"><div class="d">${left}</div><div class="l">days left</div></div>
    <div class="goal"><span>${esc(sp.name)} · ${fmtShort(a)} – ${fmtShort(b)}</span>${esc(sp.goal||'No sprint goal set')}</div>
    <div class="meter">
      <div class="lbl"><span>Committed</span><b>${committed}h of ${Math.round(cap.net)}h</b></div>
      <div class="track">
        <i style="width:${pctDone}%;background:var(--s-done)"></i>
        <i style="width:${Math.max(0,pctRest)}%;background:var(--brand)"></i>
      </div>
      <div class="note ${over?'over':spare>cap.net*0.35?'warn':'ok'}">${note}</div>
    </div>
    <div class="meter" style="min-width:170px">
      <div class="lbl"><span>Capacity</span><b>${Math.round(cap.net)}h</b></div>
      <div class="note" style="color:var(--muted);font-weight:600">
        ${cap.days} working days × ${S.settings.hoursPerDay}h − ${Math.round(cap.meetings*10)/10}h of meetings
      </div>
    </div>
  </div>`;
}

/* ---------------- Today ---------------- */
function renderToday(){
  const sp=activeSprint();
  $('t_strip').innerHTML=stripHTML(sp);

  const inSprint=sp?tasksIn(sp.id):[];
  const focus=inSprint.filter(t=>t.status==='doing'||t.status==='todo')
    .sort((a,b)=>(a.status==='doing'?-1:1)-(b.status==='doing'?-1:1)
      ||(a.due||'9999').localeCompare(b.due||'9999'));
  const doneToday=inSprint.filter(t=>t.doneAt===toISO(today()));
  $('t_focusCount').textContent=focus.length?`${focus.length} open`:'all clear';
  $('t_focus').innerHTML=(focus.length||doneToday.length)
    ? [...focus,...doneToday].map(t=>focusRow(t)).join('')
    : `<p class="empty">Nothing in this sprint yet. Pull work in from the Backlog.</p>`;
  wireFocus($('t_focus'));

  const waiting=inSprint.filter(t=>t.status==='review');
  $('t_review').innerHTML=waiting.length
    ? waiting.map(t=>focusRow(t)).join('')
    : `<p class="empty">Nothing waiting on anyone.</p>`;
  wireFocus($('t_review'));

  const t0=today(),t7=addDays(t0,7);
  const evs=eventsBetween(t0,t7);
  $('t_events').innerHTML=evs.length?evs.map(e=>{
    const d=parseD(e.date), isToday=e.date===toISO(t0);
    return `<div class="ev-row" data-id="${e.id}" style="cursor:pointer">
      <div class="tm">${isToday?'Today':fmtShort(d)}</div>
      <div class="et">${esc(e.title)}${e.time?` <span class="ew">· ${esc(e.time)}</span>`:''}
        ${e.who?`<div class="ew">with ${esc(e.who)}</div>`:''}</div>
      <div class="ew">${num(e.hours)?num(e.hours)+'h':''}</div>
    </div>`}).join('')
    :`<p class="empty">Nothing in the next seven days.</p>`;
  $('t_events').querySelectorAll('.ev-row').forEach(r=>r.onclick=()=>openEvent(r.dataset.id));

  const ms=S.milestones.filter(m=>!m.doneAt).sort((a,b)=>(a.due||'').localeCompare(b.due||'')).slice(0,5);
  $('t_miles').innerHTML=ms.length?ms.map(m=>mileRow(m)).join('')
    :`<p class="empty">No milestones left. Time to set the next ones.</p>`;
  $('t_miles').querySelectorAll('.dl').forEach(r=>r.onclick=()=>openMile(r.dataset.id));
}
function focusRow(t){
  const on=t.status==='done';
  return `<div class="focus-row ${on?'done':''}" data-id="${t.id}">
    <div class="chk ${on?'on':''}" title="Mark done">✓</div>
    <div class="ft">${esc(t.title)}<div class="meta" style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap">${taskMeta(t)}</div></div>
  </div>`;
}
function wireFocus(root){
  root.querySelectorAll('.focus-row').forEach(r=>{
    const t=S.tasks.find(x=>x.id===r.dataset.id);if(!t)return;
    r.querySelector('.chk').onclick=e=>{e.stopPropagation();toggleDone(t)};
    r.querySelector('.ft').onclick=()=>openTask(t.id);
  });
}
function toggleDone(t){
  if(t.status==='done'){t.status='todo';t.doneAt=''}
  else{t.status='done';t.doneAt=toISO(today())}
  save();
}
function mileRow(m){
  const d=parseD(m.due);if(!d)return '';
  const diff=daysBetween(today(),d);
  const cls=m.doneAt?'done':diff<0?'over':diff<=21?'soon':'ok';
  const cd=m.doneAt?'reached':diff<0?Math.abs(diff)+'d late':diff===0?'today':'in '+diff+'d';
  const e=epicOf(m.epicId);
  return `<div class="dl" data-id="${m.id}">
    <div class="date"><div class="d">${d.getDate()}</div><div class="m">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
    <div class="dlt">${esc(m.title)}${e?`<div class="ew" style="font-size:11.5px;color:var(--muted);font-weight:600">${esc(e.title)}</div>`:''}</div>
    <span class="cd ${cls}">${cd}</span></div>`;
}

/* ---------------- Sprint ---------------- */
const COLS=[['todo','To Do'],['doing','In Progress'],['review','For Review'],['done','Done']];
function renderSprint(){
  const sp=activeSprint();
  $('s_strip').innerHTML=stripHTML(sp);
  if(!sp){$('s_board').innerHTML='';$('s_kpis').innerHTML='';$('s_burn').innerHTML='';return}

  const items=tasksIn(sp.id), cap=capacityOf(sp);
  const done=items.filter(t=>t.status==='done').length;
  const doing=items.filter(t=>t.status==='doing').length;
  const left=Math.max(0,daysBetween(today(),parseD(sp.end))+1);
  const avg=avgVelocity();
  $('s_kpis').innerHTML=`
    <div class="kpi"><div class="ico" style="background:#f6e7e1;color:#9b2c2c">◱</div>
      <div class="n">${items.length}</div><div class="l">Tasks committed</div>
      <div class="sub">${committedHours(sp.id)}h of work</div></div>
    <div class="kpi"><div class="ico" style="background:#eaf0e0;color:#5f7a3a">✓</div>
      <div class="n">${done}</div><div class="l">Finished</div>
      <div class="sub">${doneHours(sp.id)}h banked</div></div>
    <div class="kpi"><div class="ico" style="background:#fbedd6;color:#c2710c">◐</div>
      <div class="n" style="${doing>S.settings.wipLimit?'color:var(--danger)':''}">${doing}</div>
      <div class="l">In progress</div><div class="sub">WIP limit is ${S.settings.wipLimit}</div></div>
    <div class="kpi"><div class="ico" style="background:#e2eef7;color:#0072b2">◷</div>
      <div class="n">${left}</div><div class="l">Days remaining</div>
      <div class="sub">${avg?`you average ${Math.round(avg)}h a sprint`:'no history yet'}</div></div>`;

  const board=$('s_board');board.innerHTML='';
  COLS.forEach(([key,label])=>{
    const list=items.filter(t=>(t.status||'todo')===key);
    const over=key==='doing'&&list.length>S.settings.wipLimit;
    const col=document.createElement('div');col.className='col';
    col.innerHTML=`<div class="col-head">
        <span class="swatch" style="background:${STATUS[key].hex}"></span>
        <h3>${label}</h3><span class="count ${over?'over':''}">${list.length}</span></div>
      ${over?`<div class="wip-warn">⚠ Over the WIP limit — finish something before starting more.</div>`:''}
      <div class="col-body" data-col="${key}"></div>`;
    const body=col.querySelector('.col-body');
    list.forEach(t=>body.appendChild(taskCard(t)));
    const add=document.createElement('button');
    add.className='add-card';add.textContent='+ Add';
    add.onclick=()=>openTask(null,{status:key,sprintId:sp.id});
    body.appendChild(add);
    body.addEventListener('dragover',e=>{e.preventDefault();body.classList.add('drop')});
    body.addEventListener('dragleave',()=>body.classList.remove('drop'));
    body.addEventListener('drop',e=>{
      e.preventDefault();body.classList.remove('drop');
      const t=S.tasks.find(x=>x.id===dragId);if(!t)return;
      t.status=key;
      t.doneAt=key==='done'?(t.doneAt||toISO(today())):'';
      save();
    });
    board.appendChild(col);
  });

  renderBurndown(sp);
}
function taskCard(t){
  const c=document.createElement('div');
  c.className='tcard'+(t.status==='done'?' done':'');
  c.draggable=true;
  const e=epicOf(t.epicId);
  c.style.borderLeftColor=e?kindOf(e).hex:'var(--line)';
  c.innerHTML=`<div class="title">${esc(t.title)}</div><div class="meta">${taskMeta(t)}</div>`;
  c.onclick=()=>openTask(t.id);
  c.addEventListener('dragstart',()=>{dragId=t.id;c.classList.add('dragging')});
  c.addEventListener('dragend',()=>{dragId=null;c.classList.remove('dragging')});
  return c;
}
function renderBurndown(sp){
  const a=parseD(sp.start),b=parseD(sp.end),t=today();
  const total=committedHours(sp.id);
  const n=daysBetween(a,b)+1;
  const denom=Math.max(1,n-1);
  const labels=[],ideal=[],actual=[];
  for(let i=0;i<n;i++){
    const d=addDays(a,i);
    labels.push(fmtShort(d));
    ideal.push({x:i,y:total*(1-i/denom)});
    if(d<=t){
      const burned=tasksIn(sp.id)
        .filter(x=>x.doneAt&&parseD(x.doneAt)<=d)
        .reduce((s,x)=>s+num(x.est),0);
      actual.push({x:i,y:Math.max(0,total-burned)});
    }
  }
  lineChart($('s_burn'),[
    {name:'Ideal pace',color:'#c4ad93',points:ideal,dash:true},
    {name:'Actual remaining',color:'#9b2c2c',points:actual,marker:true},
  ],{labels,aria:'Burndown of remaining hours across the sprint'});

  const last=actual[actual.length-1];
  const idealNow=ideal[Math.min(actual.length-1,n-1)];
  let verdict;
  if(!last)verdict='The sprint has not started yet.';
  else if(last.y<=0)verdict='Everything committed is finished. Pull the next thing in.';
  else if(last.y>idealNow.y+num(S.settings.hoursPerDay))
    verdict=`Behind the ideal pace by about ${Math.round(last.y-idealNow.y)}h. Either cut something now or accept it moves to the next sprint — do not just hope.`;
  else verdict='Tracking close to the ideal pace.';
  $('s_burnCap').textContent=`${total}h committed, ${Math.round((last?last.y:total))}h remaining. ${verdict}`;
}

/* ---------------- Backlog ---------------- */
function renderBacklog(){
  const q=$('b_search').value.trim().toLowerCase();
  const kf=$('b_kind').value;
  const wrap=$('b_list');wrap.innerHTML='';
  const sp=activeSprint();

  const epics=S.epics.filter(e=>!kf||e.kind===kf);
  let shown=0;
  epics.forEach(e=>{
    const tasks=S.tasks.filter(t=>t.epicId===e.id&&!t.sprintId
      &&(!q||t.title.toLowerCase().includes(q)));
    const miles=S.milestones.filter(m=>m.epicId===e.id&&(!q||m.title.toLowerCase().includes(q)));
    if(!tasks.length&&!miles.length&&q)return;
    shown++;
    const age=repoAge(e.repo);
    const block=document.createElement('div');block.className='epic-block';
    const rows=[
      ...miles.sort((a,b)=>(a.due||'').localeCompare(b.due||'')).map(m=>`
        <div class="brow ms" data-mile="${m.id}">
          <span style="color:var(--muted);font-size:12px">${m.hard?'●':'◆'}</span>
          <div class="bt">${esc(m.title)}</div>
          <span class="pill date ${m.doneAt?'':dueClass(m.due,'')}">${m.due?fmtShort(parseD(m.due)):'no date'}</span>
        </div>`),
      ...tasks.map(t=>`
        <div class="brow" data-task="${t.id}">
          <div class="bt">${esc(t.title)}</div>
          <div class="meta" style="display:flex;gap:5px;flex-wrap:wrap">${num(t.est)?`<span class="pill est">${num(t.est)}h</span>`:''}
            ${t.due?`<span class="pill date ${dueClass(t.due,t.status)}">${fmtShort(parseD(t.due))}</span>`:''}</div>
          <button class="btn small" data-pull="${t.id}" ${sp?'':'disabled'}>Pull into sprint</button>
        </div>`),
    ].join('');
    block.innerHTML=`<div class="epic-head">
        <span class="sw" style="background:${kindOf(e).hex}"></span>
        <h4>${esc(e.title)}</h4>
        ${e.repo?`<span class="repo">${esc(e.repo)}</span>`:''}
        <button class="btn small" data-epic="${e.id}">Edit</button>
        ${age!=null?`<span class="act ${age>30?'stale':''}">last commit ${age}d ago</span>`:''}
      </div>
      <div class="epic-list">${rows||'<div class="brow"><div class="bt" style="color:var(--muted);font-weight:500">Nothing in the backlog for this epic.</div></div>'}</div>`;
    wrap.appendChild(block);
  });
  if(!shown)wrap.innerHTML='<p class="empty">Nothing matches that search.</p>';

  wrap.querySelectorAll('[data-pull]').forEach(b=>b.onclick=ev=>{
    ev.stopPropagation();
    const t=S.tasks.find(x=>x.id===b.dataset.pull);
    if(t&&sp){t.sprintId=sp.id;t.status='todo';save();toast(`Pulled into ${sp.name}`)}
  });
  wrap.querySelectorAll('[data-epic]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();openEpic(b.dataset.epic)});
  wrap.querySelectorAll('[data-task] .bt').forEach(b=>b.onclick=()=>openTask(b.closest('[data-task]').dataset.task));
  wrap.querySelectorAll('[data-mile] .bt').forEach(b=>b.onclick=()=>openMile(b.closest('[data-mile]').dataset.mile));
}

/* ---------------- Roadmap ---------------- */
function renderRoadmap(){
  const t=today();
  const dates=[...S.milestones.map(m=>m.due),...S.sprints.map(s=>s.end),S.goal.target]
    .filter(Boolean).map(parseD);
  const last=dates.length?new Date(Math.max(...dates)):addDays(t,180);
  const from=new Date(t.getFullYear(),t.getMonth(),1);
  const to=new Date(last.getFullYear(),last.getMonth()+1,0);
  const span=daysBetween(from,to)||1;
  const pct=d=>Math.max(0,Math.min(100,daysBetween(from,d)/span*100));

  const months=[];
  for(let d=new Date(from);d<=to;d=new Date(d.getFullYear(),d.getMonth()+1,1))months.push(new Date(d));

  const grid=$('r_grid');
  let html=`<div class="rm-months">${months.map(m=>
    `<div>${m.toLocaleDateString('en-GB',{month:'short'})} ${String(m.getFullYear()).slice(2)}</div>`).join('')}</div>`;

  const sp=activeSprint();
  const sprintBand=sp?`<div class="rm-sprint" style="left:${pct(parseD(sp.start))}%;
    width:${pct(parseD(sp.end))-pct(parseD(sp.start))}%"></div>`:'';
  const todayLine=`<div class="rm-today" style="left:${pct(t)}%"></div>`;
  const monthLines=months.map((m,i)=>i?`<div class="mgrid" style="left:${pct(m)}%"></div>`:'').join('');

  S.epics.forEach(e=>{
    const ms=S.milestones.filter(m=>m.epicId===e.id&&m.due);
    const ts=S.tasks.filter(x=>x.epicId===e.id&&x.due);
    const all=[...ms.map(m=>parseD(m.due)),...ts.map(x=>parseD(x.due))];
    const hex=kindOf(e).hex;
    let bar='';
    if(all.length){
      const s=new Date(Math.min(...all,t)),en=new Date(Math.max(...all));
      bar=`<div class="rm-bar" style="left:${pct(s)}%;width:${Math.max(1.2,pct(en)-pct(s))}%;background:${hex}"></div>`;
    }
    const marks=ms.map(m=>{
      const d=parseD(m.due);
      const tip=`<b>${m.title}</b><br>${e.title}<br>${fmtLong(d)}${m.hard?' · hard deadline':''}${m.doneAt?' · reached':''}`;
      return `<div class="rm-ms ${m.hard?'hard':''} ${m.doneAt?'done':''}" data-mile="${m.id}"
        style="left:${pct(d)}%;background:${hex}" data-tip="${esc(tip)}"></div>`;
    }).join('');
    html+=`<div class="rm-row">
      <div class="rm-lbl"><span class="sw" style="background:${hex}"></span><span>${esc(e.title)}</span></div>
      <div class="rm-track">${monthLines}${sprintBand}${bar}${marks}${todayLine}</div></div>`;
  });
  grid.innerHTML=html;
  grid.querySelectorAll('[data-mile]').forEach(el=>{
    el.onclick=()=>openMile(el.dataset.mile);
    el.addEventListener('mousemove',e=>showTip(el.dataset.tip,e.clientX,e.clientY));
    el.addEventListener('mouseleave',hideTip);
  });

  const gt=parseD(S.goal.target);
  $('r_goalTarget').textContent=gt?`by ${fmtLong(gt)} · ${daysBetween(today(),gt)} days`:'';
  const total=S.milestones.length, reached=S.milestones.filter(m=>m.doneAt).length;
  $('r_goal').innerHTML=`
    <p style="font-family:Marcellus,serif;font-size:20px;color:#7a1f1f;margin:0 0 8px">${esc(S.goal.title)}</p>
    <p class="help" style="font-size:13.5px;margin:0 0 14px">${esc(S.goal.why)}</p>
    <div class="meter" style="min-width:0">
      <div class="lbl"><span>Milestones reached</span><b>${reached} of ${total}</b></div>
      <div class="track"><i style="width:${total?reached/total*100:0}%;background:var(--s-done)"></i></div>
    </div>`;
}

/* ---------------- Review ---------------- */
function renderReview(){
  const sel=$('v_sprint');
  const cur=reviewSprintId||(activeSprint()||{}).id||(S.sprints[0]||{}).id;
  sel.innerHTML=S.sprints.slice().reverse().map(s=>
    `<option value="${s.id}" ${s.id===cur?'selected':''}>${esc(s.name)} · ${fmtShort(parseD(s.start))}–${fmtShort(parseD(s.end))}${s.closed?'':' (open)'}</option>`).join('');
  reviewSprintId=cur;
  const sp=S.sprints.find(s=>s.id===cur);
  if(!sp)return;

  const items=tasksIn(sp.id);
  const shipped=items.filter(t=>t.status==='done');
  const missed=items.filter(t=>t.status!=='done');
  const cap=capacityOf(sp);
  const planned=committedHours(sp.id), delivered=doneHours(sp.id);
  const hit=planned?Math.round(delivered/planned*100):0;

  $('v_kpis').innerHTML=`
    <div class="kpi"><div class="ico" style="background:#eaf0e0;color:#5f7a3a">✓</div>
      <div class="n">${shipped.length}</div><div class="l">Finished</div>
      <div class="sub">of ${items.length} committed</div></div>
    <div class="kpi"><div class="ico" style="background:#f6e7e1;color:#9b2c2c">Σ</div>
      <div class="n">${delivered}h</div><div class="l">Delivered</div>
      <div class="sub">${planned}h was planned</div></div>
    <div class="kpi"><div class="ico" style="background:#fbedd6;color:#c2710c">%</div>
      <div class="n" style="${sp.closed&&hit<70?'color:var(--warn)':''}">${hit}%</div><div class="l">Of the commitment met</div>
      <div class="sub">${!sp.closed?'sprint still open — not a verdict yet'
        :hit<70?'the plan was too big':'a realistic plan'}</div></div>
    <div class="kpi"><div class="ico" style="background:#e2eef7;color:#0072b2">◷</div>
      <div class="n">${Math.round(cap.net)}h</div><div class="l">Capacity was</div>
      <div class="sub">${Math.round(cap.meetings)}h went to meetings</div></div>`;

  $('v_shipCount').textContent=`${delivered}h`;
  $('v_shipped').innerHTML=shipped.length?shipped.map(t=>`
    <div class="shipped" data-id="${t.id}"><span class="tick">✓</span>
      <span class="st">${esc(t.title)}</span>
      <div class="meta" style="display:flex;gap:5px">${epicPill(t)}${num(t.est)?`<span class="pill est">${num(t.est)}h</span>`:''}</div>
    </div>`).join(''):'<p class="empty">Nothing finished in this sprint.</p>';
  $('v_missed').innerHTML=missed.length?missed.map(t=>`
    <div class="shipped" data-id="${t.id}"><span class="tick" style="color:var(--faint)">○</span>
      <span class="st" style="color:var(--muted)">${esc(t.title)}</span>
      <div class="meta" style="display:flex;gap:5px">${num(t.est)?`<span class="pill est">${num(t.est)}h</span>`:''}</div>
    </div>`).join(''):'<p class="empty">Everything committed was finished.</p>';
  document.querySelectorAll('#v_shipped .shipped,#v_missed .shipped')
    .forEach(r=>r.onclick=()=>openTask(r.dataset.id));

  const hist=velocityHistory();
  const bars=hist.map(h=>({label:h.sprint.name.replace('Sprint ','S'),v:h.hours,color:'#9b2c2c',
    tip:`${h.hours}h finished<br>${h.sprint.goal||''}`}));
  if(!sp.closed)bars.push({label:sp.name.replace('Sprint ','S'),v:doneHours(sp.id),color:'#9b2c2c',faint:true,
    tip:`${doneHours(sp.id)}h so far — sprint still open`});
  if(bars.length){
    barChart($('v_vel'),bars,{refLine:avgVelocity(),
      aria:'Hours of work finished in each completed sprint'});
    const avg=avgVelocity();
    $('v_velCap').textContent=hist.length<3
      ? `Only ${hist.length} closed sprint${hist.length===1?'':'s'} so far. After three, this average becomes the number to plan against — it is more honest than any estimate.`
      : `You finish about ${Math.round(avg)}h a sprint. Plan the next one against that, not against what you hope.`;
  }else{
    $('v_vel').innerHTML='<p class="empty">No closed sprints yet.</p>';$('v_velCap').textContent='';
  }

  const retros=S.retros.filter(r=>r.sprintId===sp.id).sort((a,b)=>b.at.localeCompare(a.at));
  $('v_retro').innerHTML=retros.length?retros.map(r=>cmtHTML(r)).join('')
    :'<p class="empty">Nothing written yet. What should change next sprint?</p>';

  const all=[];
  S.tasks.forEach(t=>(t.comments||[]).forEach(c=>all.push({c,t})));
  all.sort((a,b)=>b.c.at.localeCompare(a.c.at));
  $('v_comments').innerHTML=all.length?all.slice(0,25).map(({c,t})=>
    cmtHTML(c,`on “${t.title}”`,t.id)).join(''):'<p class="empty">No comments yet.</p>';
  $('v_comments').querySelectorAll('[data-open]')
    .forEach(el=>el.onclick=()=>openTask(el.dataset.open));
}
function cmtHTML(c,on,openId){
  const at=new Date(c.at);
  return `<div class="cmt">
    <div class="av" style="background:${personHex(c.who)}">${esc((c.who||'?')[0])}</div>
    <div class="bd">
      <div class="hd">${esc(c.who)}<time>${at.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</time></div>
      ${on?`<div class="on" ${openId?`data-open="${openId}"`:''}>${esc(on)}</div>`:''}
      <div class="tx">${esc(c.text)}</div>
    </div></div>`;
}

/* ---------------- modals ---------------- */
function fillSelect(sel,opts,val){
  sel.innerHTML=opts.map(([v,l])=>`<option value="${esc(v)}" ${String(val)===String(v)?'selected':''}>${esc(l)}</option>`).join('');
}
let editTaskId=null;
function openTask(id,preset){
  editTaskId=id;
  const t=id?S.tasks.find(x=>x.id===id):null;
  $('taskTitle').textContent=id?'Task':'New task';
  $('taskDelete').style.display=id?'inline-flex':'none';
  $('f_title').value=t?t.title:'';
  fillSelect($('f_epic'),S.epics.map(e=>[e.id,e.title]),t?t.epicId:(preset&&preset.epicId)||(S.epics[0]||{}).id);
  fillSelect($('f_sprint'),[['','Backlog — not scheduled'],...S.sprints.map(s=>[s.id,s.name+(s.closed?' (closed)':'')])],
    t?t.sprintId:(preset&&preset.sprintId)||'');
  fillSelect($('f_status'),Object.entries(STATUS).map(([k,v])=>[k,v.label]),t?t.status:(preset&&preset.status)||'todo');
  fillSelect($('f_who'),Object.keys(PEOPLE).map(p=>[p,p]),t?t.who:me);
  $('f_est').value=t?t.est:'';
  $('f_due').value=t?t.due:'';
  $('f_note').value=t?t.note:'';
  renderTaskComments(t);
  $('taskOverlay').classList.add('show');
  $('f_title').focus();
}
function renderTaskComments(t){
  const box=$('f_comments');
  const cs=(t&&t.comments)||[];
  box.innerHTML=cs.length?cs.slice().sort((a,b)=>a.at.localeCompare(b.at)).map(c=>cmtHTML(c)).join('')
    :'<p class="empty" style="padding:0">No comments yet.</p>';
  $('f_cmtIn').disabled=!t;
  $('f_cmtBtn').disabled=!t;
  $('f_cmtIn').placeholder=t?'Leave a comment…':'Save the task first, then you can comment';
}
function saveTask(){
  const title=$('f_title').value.trim();
  if(!title){toast('Give the task a name first');return}
  const o={title,epicId:$('f_epic').value,sprintId:$('f_sprint').value,status:$('f_status').value,
    est:num($('f_est').value),due:$('f_due').value,who:$('f_who').value,note:$('f_note').value.trim()};
  if(o.status==='done'){
    const ex=editTaskId&&S.tasks.find(x=>x.id===editTaskId);
    o.doneAt=(ex&&ex.doneAt)||toISO(today());
  }else o.doneAt='';
  if(editTaskId)Object.assign(S.tasks.find(x=>x.id===editTaskId),o);
  else S.tasks.unshift(Object.assign({id:uid('t'),comments:[]},o));
  closeAll();save();
}
function postComment(){
  const t=S.tasks.find(x=>x.id===editTaskId);if(!t)return;
  const txt=$('f_cmtIn').value.trim();if(!txt)return;
  t.comments.push({who:me,text:txt,at:new Date().toISOString()});
  $('f_cmtIn').value='';
  renderTaskComments(t);
  saveQuiet();
}

let editEpicId=null;
function openEpic(id){
  editEpicId=id;
  const e=id?epicOf(id):null;
  $('epicTitle').textContent=id?'Epic':'New epic';
  $('epicDelete').style.display=id?'inline-flex':'none';
  $('e_title').value=e?e.title:'';
  fillSelect($('e_kind'),Object.entries(KIND).map(([k,v])=>[k,v.label]),e?e.kind:'project');
  $('e_repo').value=e?e.repo:'';
  $('e_note').value=e?e.note:'';
  $('epicOverlay').classList.add('show');
}
function saveEpic(){
  const title=$('e_title').value.trim();
  if(!title){toast('Give the epic a name first');return}
  const o={title,kind:$('e_kind').value,repo:$('e_repo').value.trim(),note:$('e_note').value.trim()};
  if(editEpicId)Object.assign(epicOf(editEpicId),o);
  else S.epics.push(Object.assign({id:uid('e')},o));
  closeAll();save();
}

let editMileId=null;
function openMile(id){
  editMileId=id;
  const m=id?S.milestones.find(x=>x.id===id):null;
  $('mileTitle').textContent=id?'Milestone':'New milestone';
  $('mileDelete').style.display=id?'inline-flex':'none';
  $('m_title').value=m?m.title:'';
  fillSelect($('m_epic'),S.epics.map(e=>[e.id,e.title]),m?m.epicId:(S.epics[0]||{}).id);
  $('m_due').value=m?m.due:'';
  $('m_hard').value=m&&m.hard?'1':'';
  $('m_done').value=m?m.doneAt:'';
  $('mileOverlay').classList.add('show');
}
function saveMile(){
  const title=$('m_title').value.trim();
  if(!title){toast('Give the milestone a name first');return}
  const o={title,epicId:$('m_epic').value,due:$('m_due').value,hard:$('m_hard').value==='1',doneAt:$('m_done').value};
  if(editMileId)Object.assign(S.milestones.find(x=>x.id===editMileId),o);
  else S.milestones.push(Object.assign({id:uid('m')},o));
  closeAll();save();
}

let editEventId=null;
function openEvent(id){
  editEventId=id;
  const e=id?S.events.find(x=>x.id===id):null;
  $('evTitle').textContent=id?'Commitment':'New commitment';
  $('evDelete').style.display=id?'inline-flex':'none';
  $('v_title').value=e?e.title:'';
  $('v_date').value=e?e.date:toISO(today());
  $('v_time').value=e?e.time:'';
  $('v_hours').value=e?e.hours:1;
  $('v_repeat').value=e?e.repeat:'';
  $('v_who').value=e?e.who:'';
  $('v_note').value=e?e.note:'';
  $('evOverlay').classList.add('show');
}
function saveEvent(){
  const title=$('v_title').value.trim();
  if(!title){toast('Give the commitment a name first');return}
  const o={title,date:$('v_date').value,time:$('v_time').value.trim(),hours:num($('v_hours').value),
    repeat:$('v_repeat').value,who:$('v_who').value.trim(),note:$('v_note').value.trim(),kind:'commitment'};
  if(!o.date){toast('A commitment needs a date');return}
  if(editEventId)Object.assign(S.events.find(x=>x.id===editEventId),o);
  else S.events.push(Object.assign({id:uid('ev')},o));
  closeAll();save();
}

/* ---------------- sprint lifecycle ---------------- */
async function closeSprint(){
  const sp=activeSprint();
  if(!sp||sp.closed){toast('No open sprint to close');return}
  const unfinished=tasksIn(sp.id).filter(t=>t.status!=='done');
  const ok=await ask(
    `${sp.name} will be closed and its ${doneHours(sp.id)}h of finished work recorded as velocity. `+
    `${unfinished.length} unfinished task${unfinished.length===1?'':'s'} will go back to the backlog, `+
    `and a new sprint will start the day after this one ends.`,'Close the sprint');
  if(!ok)return;
  unfinished.forEach(t=>{t.sprintId='';t.status='todo'});
  sp.closed=true;
  const start=addDays(parseD(sp.end),1);
  const end=addDays(start,num(S.settings.sprintDays)-1);
  const n=Math.max(...S.sprints.map(s=>num(s.n)),0)+1;
  S.sprints.push({id:uid('s'),n,name:'Sprint '+n,start:toISO(start),end:toISO(end),goal:'',closed:false});
  reviewSprintId=sp.id;
  save();
  toast(`${sp.name} closed. Sprint ${n} starts ${fmtShort(start)} — set its goal in planning.`);
}

/* ---------------- settings, backup, sync ---------------- */
function openSettings(){
  $('g_title').value=S.goal.title;$('g_why').value=S.goal.why;$('g_target').value=S.goal.target;
  $('g_len').value=S.settings.sprintDays;$('g_hpd').value=S.settings.hoursPerDay;$('g_wip').value=S.settings.wipLimit;
  $('setOverlay').classList.add('show');
}
function saveSettings(){
  S.goal={title:$('g_title').value.trim(),why:$('g_why').value.trim(),target:$('g_target').value};
  S.settings={sprintDays:num($('g_len').value)||14,hoursPerDay:num($('g_hpd').value)||5,wipLimit:num($('g_wip').value)||3};
  closeAll();save();
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='krama-'+toISO(today())+'.json';a.click();
  URL.revokeObjectURL(a.href);
}
function importJSON(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(!d||!Array.isArray(d.tasks))throw new Error('not a Krama backup');
      S=migrate(d);closeAll();save();toast('Backup restored');
    }catch(e){toast('That file is not a Krama backup')}
  };
  r.readAsText(file);
}
async function resetSeed(){
  if(await ask('This wipes your plan in this browser and puts back the starting seed data.','Reset everything')){
    S=clone(SEED);closeAll();save();toast('Reset to seed');
  }
}
function openSync(){
  if(sb){$('s_url').value=sb.url;$('s_key').value=sb.key}
  $('syncStatus').textContent=sb?'Connected — the plan is live.':'';
  $('syncOverlay').classList.add('show');
}
async function connectSync(){
  const url=$('s_url').value.trim().replace(/\/$/,''),key=$('s_key').value.trim();
  if(!url||!key){toast('Both the URL and the key are needed');return}
  sb={url,key};localStorage.setItem(CFG_KEY,JSON.stringify(sb));
  $('syncStatus').textContent='Connecting…';
  if(await pull()){await push();render();$('syncStatus').textContent='Connected — the plan is live on every device you connect.'}
  else $('syncStatus').textContent='Could not connect. Check the URL and key, and that you ran supabase-schema.sql.';
}
function disconnectSync(){
  sb=null;localStorage.removeItem(CFG_KEY);chip('local','Local');
  $('syncStatus').textContent='Disconnected — saving in this browser only.';
}

/* ---------------- demo ---------------- */
/* The public preview: same structure, none of his actual life. */
function demoData(){
  const d=clone(SEED);
  d.goal={title:'Ship a product people pay for',why:'Sample goal for the public preview.',target:'2027-03-31'};
  const names=['Website rebuild','Mobile app','Data pipeline','Learning — Rust','Career','Team commitments'];
  d.epics=d.epics.slice(0,6).map((e,i)=>Object.assign({},e,{title:names[i],repo:i<3?'example/repo-'+(i+1):'',note:''}));
  const keep=new Set(d.epics.map(e=>e.id));
  d.tasks=d.tasks.filter(t=>keep.has(t.epicId)).map((t,i)=>Object.assign({},t,{
    title:'Sample task '+(i+1),note:'',
    comments:t.comments.length?[{who:'Papa',text:'Sample review comment.',at:t.comments[0].at}]:[]}));
  d.milestones=d.milestones.filter(m=>keep.has(m.epicId)).map((m,i)=>Object.assign({},m,{title:'Milestone '+(i+1)}));
  d.retros=d.retros.map((r,i)=>Object.assign({},r,{text:'Sample retrospective note '+(i+1)+'.'}));
  d.events=d.events.map(e=>Object.assign({},e,{who:'Mentor'}));
  return d;
}

/* ---------------- shell ---------------- */
function closeAll(){document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show'))}
function render(){
  if(view==='today')renderToday();
  else if(view==='sprint')renderSprint();
  else if(view==='backlog')renderBacklog();
  else if(view==='roadmap')renderRoadmap();
  else renderReview();
  const sp=activeSprint();
  $('brandSub').textContent=sp?`${sp.name} · ${fmtShort(parseD(sp.start))} – ${fmtShort(parseD(sp.end))}`:'Goal · Milestones · Sprints';
}
function switchView(v){
  view=v;localStorage.setItem(VIEW_KEY,v);
  document.querySelectorAll('#viewSeg button').forEach(b=>b.classList.toggle('active',b.dataset.v===v));
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('active',s.id==='view-'+v));
  render();
}
function setWho(n){
  me=n;localStorage.setItem(WHO_KEY,n);
  $('whoBtn').innerHTML=`<span class="av" style="background:${personHex(n)}">${esc((PEOPLE[n]||{}).initial||n[0])}</span>${esc(n)}`;
}

async function init(){
  S=load();
  sb=DEMO?null:loadCfg();
  view=localStorage.getItem(VIEW_KEY)||'today';
  if(DEMO)$('demoBanner').style.display='block';
  setWho(PEOPLE[me]?me:'Shardul');
  fillSelect($('b_kind'),[['','All kinds'],...Object.entries(KIND).map(([k,v])=>[k,v.label])],'');

  $('whoBtn').onclick=()=>{
    const names=Object.keys(PEOPLE);
    setWho(names[(names.indexOf(me)+1)%names.length]);
    toast(`Now editing as ${me}`);
    render();
  };
  document.querySelectorAll('#viewSeg button').forEach(b=>b.onclick=()=>switchView(b.dataset.v));
  $('addBtn').onclick=()=>openTask(null,{sprintId:(activeSprint()||{}).id||''});
  $('helpBtn').onclick=()=>$('helpOverlay').classList.add('show');
  $('helpClose').onclick=closeAll;
  $('setBtn').onclick=openSettings;
  $('setCancel').onclick=closeAll;
  $('setSave').onclick=saveSettings;
  $('syncChip').onclick=openSync;
  $('syncClose').onclick=closeAll;
  $('syncSave').onclick=connectSync;
  $('syncDisconnect').onclick=disconnectSync;

  $('taskCancel').onclick=closeAll;
  $('taskSave').onclick=saveTask;
  $('f_cmtBtn').onclick=postComment;
  $('f_cmtIn').onkeydown=e=>{if(e.key==='Enter')postComment()};
  $('taskDelete').onclick=async()=>{
    if(await ask('Delete this task for good?','Delete')){
      S.tasks=S.tasks.filter(x=>x.id!==editTaskId);closeAll();save();
    }
  };
  $('epicCancel').onclick=closeAll;
  $('epicSave').onclick=saveEpic;
  $('epicDelete').onclick=async()=>{
    const n=S.tasks.filter(t=>t.epicId===editEpicId).length;
    if(await ask(`Delete this epic? ${n} task${n===1?'':'s'} and its milestones go with it.`,'Delete')){
      S.tasks=S.tasks.filter(t=>t.epicId!==editEpicId);
      S.milestones=S.milestones.filter(m=>m.epicId!==editEpicId);
      S.epics=S.epics.filter(e=>e.id!==editEpicId);
      closeAll();save();
    }
  };
  $('mileCancel').onclick=closeAll;
  $('mileSave').onclick=saveMile;
  $('mileDelete').onclick=async()=>{
    if(await ask('Delete this milestone?','Delete')){
      S.milestones=S.milestones.filter(m=>m.id!==editMileId);closeAll();save();
    }
  };
  $('evCancel').onclick=closeAll;
  $('evSave').onclick=saveEvent;
  $('evDelete').onclick=async()=>{
    if(await ask('Delete this commitment? Its hours go back into your capacity.','Delete')){
      S.events=S.events.filter(x=>x.id!==editEventId);closeAll();save();
    }
  };
  $('t_addEvent').onclick=e=>{e.stopPropagation();openEvent(null)};
  $('b_addEpic').onclick=()=>openEpic(null);
  $('b_addMile').onclick=()=>openMile(null);
  $('b_search').oninput=renderBacklog;
  $('b_kind').onchange=renderBacklog;

  $('t_quickBtn').onclick=quickAdd;
  $('t_quick').onkeydown=e=>{if(e.key==='Enter')quickAdd()};
  $('v_sprint').onchange=e=>{reviewSprintId=e.target.value;renderReview()};
  $('v_close').onclick=closeSprint;
  $('v_retroBtn').onclick=addRetro;
  $('v_retroIn').onkeydown=e=>{if(e.key==='Enter')addRetro()};

  $('expBtn').onclick=exportJSON;
  $('impBtn').onclick=()=>$('fileInput').click();
  $('fileInput').onchange=e=>{if(e.target.files[0])importJSON(e.target.files[0])};
  $('resetBtn').onclick=resetSeed;

  document.querySelectorAll('.overlay').forEach(o=>o.onclick=e=>{if(e.target===o)closeAll()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});

  await loadActivity();
  switchView(view);
  if(sb){chip('live','Connecting…');pull().then(ok=>{if(ok)render()})}
}
function quickAdd(){
  const v=$('t_quick').value.trim();if(!v)return;
  const sp=activeSprint();
  S.tasks.unshift({id:uid('t'),epicId:(S.epics[0]||{}).id||'',sprintId:sp?sp.id:'',title:v,
    est:0,status:'todo',due:'',doneAt:'',who:me,note:'',comments:[]});
  $('t_quick').value='';save();
}
function addRetro(){
  const v=$('v_retroIn').value.trim();if(!v)return;
  S.retros.push({id:uid('r'),sprintId:reviewSprintId,who:me,at:new Date().toISOString(),text:v});
  $('v_retroIn').value='';save();
}

init();
