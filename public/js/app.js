const api = async (url, method='GET', body=null) => {
  const r = await fetch(url, { method, headers: body?{'Content-Type':'application/json'}:{}, body:body?JSON.stringify(body):null });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Serverfehler ' + r.status }));
    throw new Error(err.error || 'Fehler ' + r.status);
  }
  return r.json();
};

async function fetchWithTimeout(url, options={}, timeoutMs=90000) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(tid);
    return r;
  } catch(e) {
    clearTimeout(tid);
    if (e.name === 'AbortError') throw new Error('Timeout – Mistral hat zu lange gebraucht (>' + Math.round(timeoutMs/1000) + 's). Bitte nochmal versuchen.');
    throw e;
  }
}

const $ = id => document.getElementById(id);
const esc = s => (s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const today = () => new Date().toISOString().slice(0,10);

let state = { jobs:[], profil:{}, vorlagen:[], bewerbungen:[] };

// ── Ausgeblendet-Store ──
const HIDDEN_KEY = 'jobradar_hidden_jobs';
function hiddenJobs() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || {}; } catch(e) { return {}; }
}
function saveHidden(map) { localStorage.setItem(HIDDEN_KEY, JSON.stringify(map)); }
function jobKey(j) { return (j.firma||'') + '||' + (j.titel||''); }

window.hideJob = function(i, grund) {
  if (!grund) { toast('Bitte einen Grund wählen', 'warn'); return; }
  const j = state.jobs[i];
  const map = hiddenJobs();
  map[jobKey(j)] = { grund, titel: j.titel, firma: j.firma, ts: today() };
  saveHidden(map);
  toast('Ausgeblendet: ' + j.titel + ' (' + grund + ')');
  log('Ausgeblendet: ' + j.titel + ' – ' + grund);
  renderJobs();
};

window.unhideJob = function(key) {
  const map = hiddenJobs();
  const entry = map[key];
  delete map[key];
  saveHidden(map);
  toast('Wieder eingeblendet' + (entry ? ': ' + entry.titel : ''));
  renderJobs();
  renderHiddenList();
};

window.clearAllHidden = function() {
  if (!confirm('Alle ausgeblendeten Stellen zurücksetzen?')) return;
  localStorage.removeItem(HIDDEN_KEY);
  toast('Liste geleert');
  renderJobs();
  renderHiddenList();
};

function renderHiddenList() {
  const el = $('hiddenList'); if (!el) return;
  const map = hiddenJobs();
  const entries = Object.entries(map);
  if (!entries.length) {
    el.innerHTML = '<p class="muted" style="font-size:14px">Keine ausgeblendeten Stellen.</p>';
    return;
  }
  el.innerHTML = entries.map(([key, v]) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:8px;margin-bottom:6px">
      <div>
        <strong>${esc(v.titel||'?')}</strong>
        <span class="muted" style="font-size:13px"> · ${esc(v.firma||'')} · <em>${esc(v.grund||'')}</em></span>
      </div>
      <button class="btn small" onclick="unhideJob('${esc(key)}')">Einblenden</button>
    </div>`
  ).join('') +
  `<div style="margin-top:10px"><button class="btn small" style="color:var(--error);border-color:var(--error)" onclick="clearAllHidden()">Alle zurücksetzen</button></div>`;
}

// ── Toast ──
let toastTimer;
function toast(msg, type='success') {
  const el = $('toast');
  if (!el) return;
  el.textContent = (type==='success'?'\u2713 ':type==='error'?'\u2717 ':'') + msg;
  el.style.background = type==='error'?'var(--error)':type==='warn'?'var(--warn)':'#1a1a1a';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}
window.toast = toast;

document.addEventListener('DOMContentLoaded', () => { init(); });

function showTab(id){
  document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tabpanel').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('[data-tab="'+id+'"]').forEach(el=>el.classList.add('active'));
  const panel = $(id);
  if(panel) panel.classList.add('active');
  if(id==='dashboard') loadStats();
  if(id==='verlauf') loadBewerbungen();
  if(id==='vorlagen') loadVorlagen();
  if(id==='erfahrungen') window.loadErfahrungen && window.loadErfahrungen();
  if(id==='profil') loadProfil();
  if(id==='anschreiben-verlauf') loadAnschreibenVerlauf();
  if(id==='suche') { loadQuellenStatus(); renderHiddenList(); }
  if(id==='einstellungen') { if(typeof window.initSettingsPage==='function') window.initSettingsPage(); }
}
document.addEventListener('click',e=>{ if(e.target.dataset.tab) showTab(e.target.dataset.tab); });

function log(msg){ const l=$('log'); if(!l) return; const ts='['+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+'] '; l.textContent=l.textContent?l.textContent+'\n\n'+ts+msg:ts+msg; l.scrollTop=l.scrollHeight; }
function setLoading(active){ const bar=$('loadingBar'); const sp=$('searchSpinner'); if(bar) bar.style.width=active?'70%':'0'; if(sp) sp.classList.toggle('active',active); }
function badge(status){ const L={beworben:'Beworben',interview:'Interview',angenommen:'Angenommen',abgelehnt:'Abgelehnt'}; return `<span class="badge badge-${esc(status||'beworben')}">${esc(L[status]||status||'beworben')}</span>`; }

// ── Score ──
function scoreJob(j){
  const kw=(state.profil.keywords||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const bl=(state.profil.blacklist||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const mySkills = (typeof window.getSkillsForScore === 'function') ? window.getSkillsForScore() : [];
  const allKw = [...new Set([...kw, ...mySkills])];
  const hay=(j.titel+' '+(j.firma||'')+' '+(j.beschreibung||'')+' '+(j.tags||[]).join(' ')).toLowerCase();
  let s=40;
  allKw.forEach(k=>{ if(hay.includes(k)) s+=10; });
  bl.forEach(b=>{ if(hay.includes(b)) s-=25; });
  if(j.remote) s+=8;
  return Math.max(0,Math.min(100,s));
}

function isBlacklisted(j){
  const bl=(state.profil.blacklist||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(!bl.length) return false;
  const hay=(j.titel+' '+(j.firma||'')+' '+(j.beschreibung||'')+' '+(j.tags||[]).join(' ')).toLowerCase();
  return bl.some(b => hay.includes(b));
}

function getMatch(firma,titel){ return state.bewerbungen.find(b=>b.firma.toLowerCase().trim()===(firma||'').toLowerCase().trim()&&b.titel.toLowerCase().trim()===(titel||'').toLowerCase().trim())||state.bewerbungen.find(b=>b.firma.toLowerCase().trim()===(firma||'').toLowerCase().trim()); }

async function requestNotifications(){ if(!('Notification' in window)) return; if(Notification.permission==='default') await Notification.requestPermission(); }
function checkFollowupNotifications(){ if(Notification.permission!=='granted') return; const t=today(); state.bewerbungen.filter(b=>b.followup_datum===t&&b.status!=='angenommen'&&!b.archiviert).forEach(b=>new Notification('JobRadar',{body:`Follow-up fällig: ${b.titel} bei ${b.firma}`})); }

async function loadStats(){
  try {
    const s=await api('/api/bewerbungen/stats/overview');
    const by=Object.fromEntries((s.byStatus||[]).map(x=>[x.status,x.c]));
    if($('statGesamt')) $('statGesamt').textContent=s.total;
    if($('statFaellig')) $('statFaellig').textContent=s.overdue;
    if($('statInterview')) $('statInterview').textContent=by.interview||0;
    if($('statAngenommen')) $('statAngenommen').textContent=by.angenommen||0;
    if($('statAbgelehnt')) $('statAbgelehnt').textContent=by.abgelehnt||0;
  } catch(e) { log('Stats-Fehler: '+e.message); }
}

async function loadBewerbungen(){
  try {
    const status=$('filterStatus')?.value||'';
    const firma=$('filterFirma')?.value||'';
    const archiviert=$('filterArchiv')?.value||'0';
    state.bewerbungen=await api('/api/bewerbungen?'+new URLSearchParams({status,firma,archiviert}));
    renderBewerbungen(); loadStats(); checkFollowupNotifications();
  } catch(e) { log('Bewerbungen-Fehler: '+e.message); }
}

function renderBewerbungen(){
  const el=$('bewerbungenList'); if(!el) return;
  const t=today();
  if(!state.bewerbungen.length){ el.innerHTML=`<div class="empty"><div class="empty-icon">\uD83D\uDCCB</div><h3>Noch keine Bewerbungen</h3><p>Füge deine erste Bewerbung manuell hinzu oder markiere eine Stelle aus der Suche.</p></div>`; return; }
  el.innerHTML=state.bewerbungen.map(b=>{
    const overdue=b.followup_datum&&b.followup_datum<t&&b.status!=='angenommen';
    const dueSoon=b.followup_datum&&b.followup_datum>=t&&b.followup_datum<=new Date(Date.now()+3*86400000).toISOString().slice(0,10)&&b.status!=='angenommen';
    return `<article class="job ${overdue?'overdue':dueSoon?'dueSoon':''}" id="job-${b.id}">
      <div class="jobhead">
        <div><strong>${esc(b.titel)}</strong><div class="muted" style="margin-top:4px">${esc(b.firma)} \u00b7 ${esc(b.ort||'')} \u00b7 <em>${esc(b.quelle||'manuell')}</em></div></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${badge(b.status)}${b.bewertung?`<span class="chip">\u2605 ${b.bewertung}/5</span>`:''}</div>
      </div>
      <div class="muted" style="margin-top:8px;font-size:14px">Beworben: ${esc(b.beworben_am||'-')}${b.followup_datum?' \u00b7 Follow-up: <strong>'+esc(b.followup_datum)+'</strong>':''}</div>
      ${b.notizen?`<div class="muted" style="margin-top:8px;font-size:14px;white-space:pre-wrap">${esc(b.notizen)}</div>`:''}
      <div class="chips">${overdue?'<span class="chip" style="border-color:var(--error);color:var(--error)">\u26a0 Überfällig</span>':''}${dueSoon?'<span class="chip" style="border-color:var(--warn);color:#8a6400">\u23f0 Fällig bald</span>':''}</div>
      <div class="inline-edit" id="edit-${b.id}">
        <textarea id="notiz-${b.id}" rows="3" placeholder="Notizen...">${esc(b.notizen||'')}</textarea>
        <input id="followup-${b.id}" type="date" value="${esc(b.followup_datum||today())}">
        <div class="row-btn">
          <select id="bewertung-${b.id}"><option value="">Bewertung</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${b.bewertung==n?'selected':''}>${'\u2605'.repeat(n)} (${n}/5)</option>`).join('')}</select>
          <button class="btn primary small" onclick="saveInlineEdit(${b.id})">Speichern</button>
          <button class="btn small" onclick="toggleEdit(${b.id})">Abbrechen</button>
        </div>
      </div>
      <div class="actions">
        <button class="btn small" onclick="setStatus(${b.id},'interview')">Interview</button>
        <button class="btn small" onclick="setStatus(${b.id},'abgelehnt')">Abgelehnt</button>
        <button class="btn small" onclick="setStatus(${b.id},'angenommen')">Angenommen</button>
        <button class="btn small" onclick="toggleEdit(${b.id})">&#9998; Bearbeiten</button>
        <button class="btn small" onclick="openTimeline(${b.id})">&#128203; Verlauf</button>
        <button class="btn small" onclick="archivieren(${b.id},${b.archiviert})">${b.archiviert?'Reaktivieren':'Archivieren'}</button>
        <button class="btn small" style="color:var(--error);border-color:var(--error)" onclick="loeschen(${b.id},'${esc(b.titel)}')">&#x1F5D1; Löschen</button>
        ${b.url?`<a href="${esc(b.url)}" target="_blank" rel="noopener" class="btn small">Stelle öffnen</a>`:''}
      </div>
    </article>`;
  }).join('');
}

window.toggleEdit=(id)=>{ const el=$('edit-'+id); if(el) el.classList.toggle('open'); };
window.saveInlineEdit=async(id)=>{
  try {
    await api('/api/bewerbungen/'+id,'PUT',{notizen:$('notiz-'+id)?.value||'',followup_datum:$('followup-'+id)?.value||'',bewertung:$('bewertung-'+id)?.value?parseInt($('bewertung-'+id).value):null});
    loadBewerbungen(); toast('Gespeichert'); log('Gespeichert.');
  } catch(e) { toast('Fehler beim Speichern','error'); log('Fehler: '+e.message); }
};
async function setStatus(id,status){
  try { await api('/api/bewerbungen/'+id,'PUT',{status}); loadBewerbungen(); toast('Status \u2192 '+status); log('Status \u2192 '+status); }
  catch(e) { toast('Status-Fehler','error'); log('Status-Fehler: '+e.message); }
}
async function archivieren(id,ist){
  try { await api('/api/bewerbungen/'+id,'PUT',{archiviert:ist?0:1}); loadBewerbungen(); toast(ist?'Reaktiviert':'Archiviert'); }
  catch(e) { toast('Fehler','error'); log('Archiv-Fehler: '+e.message); }
}
async function loeschen(id, titel){
  if(!confirm('Bewerbung "'+titel+'" wirklich endgültig löschen?')) return;
  try { await api('/api/bewerbungen/'+id,'DELETE'); loadBewerbungen(); toast('Gelöscht'); log('Gelöscht: '+titel); }
  catch(e) { toast('Fehler beim Löschen','error'); log('Fehler: '+e.message); }
}
window.loeschen=loeschen;

function manuellHinzufuegenModal(){
  const m = $('modalManuell');
  $('mTitel').value=''; $('mFirma').value=''; $('mOrt').value='';
  $('mStatus').value='beworben'; $('mUrl').value=''; $('mNotizen').value='';
  $('mBeworbenAm').value=today();
  // Follow-up aus Einstellung
  const followupDays = (typeof window.getSetting === 'function') ? parseInt(window.getSetting('followupDays', 14)) : 14;
  $('mFollowup').value=new Date(Date.now()+followupDays*86400000).toISOString().slice(0,10);
  m.style.display='flex';
  setTimeout(()=>$('mTitel').focus(),50);
}
window.manuellHinzufuegenModal=manuellHinzufuegenModal;

async function manuellSpeichern(){
  const titel=$('mTitel').value.trim();
  const firma=$('mFirma').value.trim();
  if(!titel||!firma){ toast('Titel und Firma sind Pflichtfelder','error'); return; }
  try {
    await api('/api/bewerbungen','POST',{
      titel, firma,
      ort:$('mOrt').value.trim(),
      status:$('mStatus').value,
      beworben_am:$('mBeworbenAm').value||today(),
      followup_datum:$('mFollowup').value||'',
      url:$('mUrl').value.trim(),
      notizen:$('mNotizen').value.trim()
    });
    $('modalManuell').style.display='none';
    loadBewerbungen();
    toast('Bewerbung gespeichert \u2013 '+titel+' bei '+firma);
    log('Manuell gespeichert: '+titel+' bei '+firma);
  } catch(e) { toast('Fehler: '+e.message,'error'); }
}
window.manuellSpeichern=manuellSpeichern;
$('modalManuell')?.addEventListener('click', e=>{ if(e.target.id==='modalManuell') $('modalManuell').style.display='none'; });
window.setStatus=setStatus; window.archivieren=archivieren;

async function openTimeline(id){
  const b=state.bewerbungen.find(x=>x.id===id); if(!b) return;
  const kommentare=await api('/api/bewerbungen/'+id+'/kommentare').catch(()=>[]);
  const modal=document.createElement('div'); modal.className='modal-backdrop'; modal.id='modal-'+id;
  modal.innerHTML=`<div class="modal">
    <button class="modal-close" onclick="closeModal(${id})">&#x2715;</button>
    <h2>${esc(b.titel)} <span style="font-weight:400;font-size:16px">bei ${esc(b.firma)}</span></h2>
    <div style="margin-bottom:16px">${badge(b.status)}${b.bewertung?` <span class="chip">\u2605 ${b.bewertung}/5</span>`:''}</div>
    <ul class="timeline" id="tl-${id}">${renderKommentare(kommentare,id)}</ul>
    <div class="comment-input">
      <input id="ci-${id}" placeholder="Kommentar hinzufügen\u2026" onkeydown="if(event.key==='Enter') addKommentar(${id})">
      <button class="btn primary small" onclick="addKommentar(${id})">+</button>
    </div>
    <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn small" onclick="mailModal(${id},'${esc(b.titel)}')">\u2709 E-Mail vorbereiten</button>
      ${b.url?`<a href="${esc(b.url)}" target="_blank" rel="noopener" class="btn small">Stelle öffnen</a>`:''}
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(id); });
}
function renderKommentare(list,id){ return list.length?list.map(k=>`<li><div>${esc(k.text)}<button class="del-comment" onclick="delKommentar(${id},${k.id})" title="Löschen">\u00d7</button></div><div class="ts">${esc(k.erstellt_am?.replace('T',' ').slice(0,16)||'')}</div></li>`).join(''):'<li style="color:var(--muted);padding-left:0">Noch keine Einträge.</li>'; }
async function addKommentar(id){ const inp=$('ci-'+id); if(!inp||!inp.value.trim()) return; await api('/api/bewerbungen/'+id+'/kommentare','POST',{text:inp.value.trim()}); inp.value=''; const list=await api('/api/bewerbungen/'+id+'/kommentare'); $('tl-'+id).innerHTML=renderKommentare(list,id); }
async function delKommentar(bewId,id){ await api('/api/bewerbungen/'+bewId+'/kommentare/'+id,'DELETE'); const list=await api('/api/bewerbungen/'+bewId+'/kommentare'); $('tl-'+bewId).innerHTML=renderKommentare(list,bewId); }
function closeModal(id){ const m=$('modal-'+id); if(m) m.remove(); }
window.openTimeline=openTimeline; window.addKommentar=addKommentar; window.delKommentar=delKommentar; window.closeModal=closeModal;

function mailModal(id,titel){ const profil=state.profil; const sub=encodeURIComponent('Bewerbung als '+titel); const body=encodeURIComponent('Sehr geehrte Damen und Herren,\n\n'+titel+'\n\n'+profil.name); window.open('mailto:?subject='+sub+'&body='+body); }
window.mailModal=mailModal;

async function suche(){
  const profil=state.profil;
  const quelle=$('sucheQuelle')?.value||'all';
  const count=$('sucheCount')?.value||'15';
  const ortInput=$('sucheOrt')?.value.trim();
  const ort=ortInput||profil.ort||'Remote';
  const umkreis=$('sucheUmkreis')?.value||'0';
  setLoading(true);
  log('Suche läuft: '+quelle+(umkreis>0?' \u2022 '+ort+' ('+umkreis+' km)':' \u2022 '+ort));
  try{
    const data=await api('/api/suche?'+new URLSearchParams({quelle,rolle:profil.rollen||'Linux Administrator',ort,count,umkreis}));
    if((data.errors||[]).length) data.errors.forEach(e=>log('Fehler: '+e));
    const rollen=(profil.rollen||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    state.jobs=(data.results||[])
      .filter(j=>{ const hay=(j.titel+' '+(j.firma||'')+' '+(j.beschreibung||'')+' '+(j.ort||'')+' '+(j.tags||[]).join(' ')).toLowerCase(); return rollen.length===0||rollen.some(r=>hay.includes(r.split(' ')[0])); })
      .filter(j => !isBlacklisted(j))
      .map(j=>({...j,score:scoreJob(j)}))
      .sort((a,b)=>b.score-a.score)
      .slice(0,parseInt(count,10)||15);
    renderJobs(); renderHiddenList(); log(state.jobs.length+' Treffer nach Filter.');
  }catch(e){ log('Fehler bei Suche: '+e.message); }
  setLoading(false);
}

const HIDE_GRUENDE = [
  'Ausbildung / Lehrstelle',
  'Studium erforderlich',
  'Kein Homeoffice',
  'Zu weit entfernt',
  'Gehalt zu niedrig',
  'Falsche Branche',
  'Bereits bekannt',
  'Sonstiges'
];

function renderJobs(){
  const el=$('jobsList'); if(!el) return;
  const map = hiddenJobs();
  const showHidden = $('toggleHidden')?.checked;
  const visible = state.jobs.filter(j => showHidden || !map[jobKey(j)]);
  const hiddenCount = state.jobs.filter(j => map[jobKey(j)]).length;
  const hint = $('hiddenHint');
  if (hint) hint.textContent = hiddenCount > 0 ? hiddenCount + ' Stelle' + (hiddenCount>1?'n':'') + ' ausgeblendet' : '';
  if(!visible.length){
    el.innerHTML = hiddenCount
      ? `<div class="empty"><div class="empty-icon">🙈</div><h3>${hiddenCount} Stelle${hiddenCount>1?'n':''} ausgeblendet</h3><p>Aktiviere "Ausgeblendete anzeigen" um sie wieder zu sehen.</p></div>`
      : `<div class="empty"><div class="empty-icon">\uD83D\uDD0D</div><h3>Keine Treffer</h3><p>Passe deine Rollen im Profil an und starte eine neue Suche.</p></div>`;
    return;
  }
  el.innerHTML = visible.map((j) => {
    const origIdx = state.jobs.indexOf(j);
    const isHidden = !!map[jobKey(j)];
    const match = getMatch(j.firma, j.titel);
    const grundOptions = HIDE_GRUENDE.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
    return `<article class="job${isHidden?' job-hidden':''}">
      <div class="jobhead">
        <div>
          <strong>${esc(j.titel)}</strong>
          ${isHidden?`<span class="chip" style="margin-left:8px;border-color:var(--muted);color:var(--muted);font-size:11px">🙈 ${esc(map[jobKey(j)].grund)}</span>`:''}
          <div class="muted" style="margin-top:4px">${esc(j.firma)} \u00b7 ${esc(j.ort||'')} \u00b7 <em>${esc(j.quelle||'')}</em></div>
        </div>
        <div class="score">${j.score}%</div>
      </div>
      ${match?`<div style="margin-top:10px">${badge(match.status)} <span class="muted" style="font-size:14px">Bereits beworben</span></div>`:''}
      <div class="chips">${(j.tags||[]).slice(0,6).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>
      <div class="actions">
        ${!isHidden ? `
          <button class="btn primary small" onclick="kiAnschreibenErzeugen(${origIdx})">&#x2728; KI-Anschreiben</button>
          <button class="btn small" onclick="alsBeworben(${origIdx})">Als beworben markieren</button>
          <div class="hide-row">
            <select id="hideGrund-${origIdx}" class="hide-select">
              <option value="">Grund wählen…</option>
              ${grundOptions}
            </select>
            <button class="btn small" style="color:var(--muted);border-color:var(--muted)" onclick="hideJob(${origIdx}, document.getElementById('hideGrund-${origIdx}').value)">🙈 Ausblenden</button>
          </div>
        ` : `
          <button class="btn small" onclick="unhideJob('${esc(jobKey(j))}')">&#128065; Wieder einblenden</button>
        `}
        ${j.url?`<a href="${esc(j.url)}" target="_blank" rel="noopener" class="btn small">Stelle öffnen</a>`:''}
      </div>
    </article>`;
  }).join('');
}

window.alsBeworben=async(i)=>{
  const j=state.jobs[i];
  if(getMatch(j.firma,j.titel)){toast('Bereits beworben bei '+j.firma,'warn');log('Hinweis: Bereits beworben bei '+j.firma);return;}
  try {
    await api('/api/bewerbungen','POST',{titel:j.titel,firma:j.firma,ort:j.ort||'',quelle:j.quelle||'',url:j.url||'',beworben_am:today(),followup_datum:new Date(Date.now()+14*86400000).toISOString().slice(0,10),status:'beworben'});
    await loadBewerbungen(); renderJobs(); toast('Beworben: '+j.titel); log('Beworben gespeichert: '+j.titel);
    if(Notification.permission!=='granted') requestNotifications();
  } catch(e) { toast('Fehler','error'); log('Fehler: '+e.message); }
};

async function loadProfil(){
  try {
    state.profil=await api('/api/profil');
    const p=state.profil;
    ['name','email','rollen','ort','keywords','blacklist','kurzprofil','staerken'].forEach(k=>{const el=$(k);if(el) el.value=p[k]||'';});
  } catch(e) { log('Profil-Fehler: '+e.message); }
}
async function saveProfil(){
  try {
    const body={}; ['name','email','rollen','ort','keywords','blacklist','kurzprofil','staerken'].forEach(k=>{const el=$(k);if(el) body[k]=el.value;});
    await api('/api/profil','PUT',body); state.profil={...state.profil,...body};
    toast('Profil gespeichert'); log('Profil gespeichert.');
  } catch(e) { toast('Fehler','error'); log('Profil-Fehler: '+e.message); }
}

async function loadVorlagen(){
  try {
    state.vorlagen = await api('/api/vorlagen');
    const el = $('vorlagenList');
    if (el) {
      if (!state.vorlagen.length) {
        el.innerHTML = `<div class="empty"><div class="empty-icon">\uD83C\uDFA8</div><h3>Keine Stile</h3><p>Erstelle deinen ersten KI-Stil.</p></div>`;
      } else {
        const tonLabel = { formell:'Formell', modern:'Modern', kreativ:'Kreativ', kurz:'Kurz' };
        const laengeLabel = { kurz:'~120 W', mittel:'~220 W', lang:'~350 W' };
        el.innerHTML = state.vorlagen.map(v => `<div class="card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${esc(v.name)}</strong>
            <button class="btn small" style="color:var(--error);border-color:var(--error)" onclick="deleteVorlage(${v.id})">\uD83D\uDDD1 Löschen</button>
          </div>
          <div class="chips" style="margin-top:8px">
            <span class="chip">${esc(tonLabel[v.ton]||v.ton||'formell')}</span>
            <span class="chip">${esc(laengeLabel[v.laenge]||v.laenge||'mittel')}</span>
            <span class="chip">${esc(v.sprache||'deutsch')}</span>
          </div>
          ${v.hinweise?`<div class="muted" style="font-size:13px;margin-top:8px">${esc(v.hinweise.slice(0,100))}${v.hinweise.length>100?'\u2026':''}</div>`:''}
        </div>`).join('');
      }
    }
    const sel = $('vorlagenSelect');
    if (sel) {
      sel.innerHTML = '<option value="">Kein Stil (Standard)</option>' +
        state.vorlagen.map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
    }
  } catch(e) { log('Stile-Fehler: '+e.message); }
}

window.deleteVorlage = async(id) => {
  try { await api('/api/vorlagen/'+id,'DELETE'); loadVorlagen(); toast('Stil gelöscht'); }
  catch(e) { toast('Fehler','error'); log('Fehler: '+e.message); }
};

async function saveVorlage(){
  const name = $('vorlageName')?.value.trim();
  if (!name) { toast('Name ist Pflichtfeld','error'); return; }
  try {
    await api('/api/vorlagen','POST',{
      name,
      ton: $('vorlageTon')?.value || 'formell',
      sprache: $('vorlageSprache')?.value || 'deutsch',
      laenge: $('vorlageLaenge')?.value || 'mittel',
      hinweise: $('vorlageHinweise')?.value.trim() || ''
    });
    if($('vorlageName')) $('vorlageName').value='';
    if($('vorlageHinweise')) $('vorlageHinweise').value='';
    loadVorlagen();
    toast('KI-Stil gespeichert \u2713');
    log('KI-Stil gespeichert: '+name);
  } catch(e) { toast('Fehler: '+e.message,'error'); log('Fehler: '+e.message); }
}

function exportPdf(){
  const text=$('letterPreview').value||''; const lines=text.split('\n'); const escT=s=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  let content='BT\n/F1 11 Tf\n50 800 Td\n'; for(const l of lines) content+='('+escT(l)+') Tj\n0 -16 Td\n';
  const pdf=`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length ${content.length+3}>>stream\n${content}ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000063 00000 n \n0000000122 00000 n \n0000000248 00000 n \n0000000318 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n${318+String(content.length+3).length}\n%%EOF`;
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})); a.download='anschreiben.pdf'; a.click();
}

function sendMail(){ const sub=encodeURIComponent($('letterSubject').value||'Bewerbung'); const body=encodeURIComponent($('letterPreview').value||''); window.open('mailto:?subject='+sub+'&body='+body); }

async function loadKiModels() {
  try {
    const data = await api('/api/ki/models');
    const sel = $('kiModel'); if (!sel) return;
    if (data.error) { sel.innerHTML = '<option value="mistral">mistral (Standard)</option>'; return; }
    const savedModel = (typeof window.getSetting === 'function') ? window.getSetting('defaultKiModel', '') : '';
    sel.innerHTML = (data.models || ['mistral']).map(m => `<option value="${m}" ${(savedModel||data.active)===m ? 'selected' : ''}>${m}</option>`).join('');
  } catch(e) { console.warn('Ollama nicht erreichbar'); }
}

async function kiAnschreibenErzeugen(jobIndex) {
  const j = jobIndex !== undefined ? state.jobs[jobIndex] : null;
  const titel = j?.titel || $('letterSubject')?.value?.replace('Bewerbung als ','') || '';
  const firma = j?.firma || '';
  const gen = $('kiGenerating'); const preview = $('letterPreview');
  const model = $('kiModel')?.value || 'mistral';
  const stilId = $('vorlagenSelect')?.value ? parseInt($('vorlagenSelect').value) : null;
  const erfahrungenKontext = (typeof window.getErfahrungenKontext === 'function') ? await window.getErfahrungenKontext() : '';
  if (!titel) { toast('Bitte zuerst eine Stelle aus der Suche wählen','warn'); return; }
  if (gen) gen.classList.add('active');
  if (preview) preview.value = '';
  const stilName = stilId ? (state.vorlagen.find(v=>v.id===stilId)?.name || '') : '';
  log('KI generiert Anschreiben für: ' + titel + (stilName?' [Stil: '+stilName+']':'') + (erfahrungenKontext?' [+Erfahrungen]':'') + ' \u2026');
  toast('KI arbeitet \u2026 bitte warten (bis zu 2 Min beim Kaltstart)', 'warn');
  try {
    const res = await fetchWithTimeout('/api/ki/anschreiben', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ titel, firma, ort: j?.ort||'', beschreibung: j?.beschreibung||'', tags: j?.tags||[], profil: state.profil, model, stilId, erfahrungenKontext })
    }, 195000);
    const data = await res.json();
    if (data.error) { toast('KI-Fehler: '+data.error,'error'); log('Fehler: ' + data.error); return; }
    if (preview) preview.value = `Bewerbung als ${titel} bei ${firma}\n\n${data.text}`;
    if ($('letterSubject')) $('letterSubject').value = 'Bewerbung als ' + titel;
    toast('KI-Anschreiben fertig \u2713');
    log('KI-Anschreiben fertig (' + (data.model||model) + (stilName?' | Stil: '+stilName:'') + ')');
    showTab('anschreiben');
  } catch(e) { toast('KI-Fehler: '+e.message,'error'); log('KI-Fehler: ' + e.message); }
  finally { if (gen) gen.classList.remove('active'); }
}
window.kiAnschreibenErzeugen = kiAnschreibenErzeugen;

async function kiFeedback() {
  const text = $('letterPreview')?.value || '';
  if (!text.trim()) { toast('Kein Anschreiben vorhanden','warn'); return; }
  const box = $('feedbackBox'); const gen = $('kiGenerating');
  if (gen) gen.classList.add('active');
  if (box) { box.classList.remove('visible'); box.textContent = ''; }
  log('KI analysiert Anschreiben \u2026');
  toast('KI analysiert \u2026 bitte warten', 'warn');
  try {
    const res = await fetchWithTimeout('/api/ki/feedback', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({anschreiben:text,stelle:$('letterSubject')?.value||''})
    }, 195000);
    const data = await res.json();
    if (data.error) { toast('KI-Fehler','error'); log('Fehler: ' + data.error); return; }
    if (box) { box.textContent = data.feedback; box.classList.add('visible'); }
    toast('KI-Feedback erhalten \u2713'); log('KI-Feedback erhalten.');
  } catch(e) { toast('KI-Fehler: '+e.message,'error'); log('KI-Fehler: ' + e.message); }
  finally { if (gen) gen.classList.remove('active'); }
}

async function loadAnschreibenVerlauf() {
  const el = $('anschreibenVerlaufList'); if (!el) return;
  el.innerHTML = '<p class="muted">Lade...</p>';
  try {
    const list = await api('/api/ki/verlauf');
    if (!list.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📝</div><h3>Noch kein Verlauf</h3><p>Generierte Anschreiben werden hier gespeichert.</p></div>';
      return;
    }
    el.innerHTML = list.map(v => `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <strong>${esc(v.titel)}</strong>
            <span class="muted" style="font-size:13px"> · ${esc(v.firma||'')}${v.stil?' · <em>'+esc(v.stil)+'</em>':''}</span>
            <div class="muted" style="font-size:12px;margin-top:2px">${esc(v.erstellt_am?.slice(0,16)||'')} · <em>${esc(v.model||'')}</em></div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn small" onclick="verlaufLaden(${v.id})">Laden</button>
            <button class="btn small" style="color:var(--error);border-color:var(--error)" onclick="verlaufLoeschen(${v.id})">&#x1F5D1;</button>
          </div>
        </div>
        <div class="muted" style="font-size:13px;margin-top:10px;white-space:pre-wrap">${esc((v.text||'').slice(0,180))}${(v.text||'').length>180?'\u2026':''}</div>
      </div>`
    ).join('');
  } catch(e) { el.innerHTML = '<p class="muted">Fehler beim Laden.</p>'; }
}

window.verlaufLaden = async function(id) {
  try {
    const list = await api('/api/ki/verlauf');
    const v = list.find(x => x.id === id);
    if (!v) return;
    if ($('letterPreview')) $('letterPreview').value = v.text;
    if ($('letterSubject')) $('letterSubject').value = 'Bewerbung als ' + v.titel;
    showTab('anschreiben');
    toast('Anschreiben geladen \u2713');
  } catch(e) { toast('Fehler beim Laden','error'); }
};

window.verlaufLoeschen = async function(id) {
  if (!confirm('Eintrag löschen?')) return;
  try {
    await api('/api/ki/verlauf/'+id,'DELETE');
    loadAnschreibenVerlauf();
    toast('Gelöscht');
  } catch(e) { toast('Fehler','error'); }
};

async function loadQuellenStatus() {
  try {
    const quellen = await api('/api/suche/quellen');
    const el = $('quellenStatus'); if (!el) return;
    el.innerHTML = '<div class="chips">' + quellen.map(q => {
      const ok = !q.keyRequired || q.configured;
      const color = ok ? 'var(--success)' : 'var(--warn)';
      const hint = q.keyRequired && !q.configured ? ' (Key fehlt)' : '';
      return `<span class="chip" style="border-color:${color};color:${color}">${esc(q.name)}${hint}</span>`;
    }).join('') + '</div>';
  } catch(e) { console.warn('Quellen-Status nicht verfügbar'); }
}

async function init(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  // Settings zuerst anwenden
  if (typeof window.applySearchDefaults === 'function') window.applySearchDefaults();
  if (typeof window.applyKiDefaults === 'function') window.applyKiDefaults();
  if (typeof window.applyUiSettings === 'function') window.applyUiSettings();
  if (typeof window.runAutoArchive === 'function') window.runAutoArchive(true);
  await loadProfil();
  await loadVorlagen();
  await loadBewerbungen();
  await loadStats();
  if (typeof window.loadErfahrungen === 'function') window.loadErfahrungen();
  $('filterStatus')?.addEventListener('change', loadBewerbungen);
  $('filterArchiv')?.addEventListener('change', loadBewerbungen);
  $('filterFirma')?.addEventListener('input', loadBewerbungen);
  $('toggleHidden')?.addEventListener('change', renderJobs);
  requestNotifications();
  loadKiModels();
  loadQuellenStatus();
  setInterval(()=>{ loadBewerbungen(); loadStats(); }, 5*60*1000);
  log('JobRadar bereit.');
}
