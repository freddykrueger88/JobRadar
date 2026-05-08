const api = async (url, method='GET', body=null) => {
  const r = await fetch(url, { method, headers: body?{'Content-Type':'application/json'}:{}, body:body?JSON.stringify(body):null });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Serverfehler ' + r.status }));
    throw new Error(err.error || 'Fehler ' + r.status);
  }
  return r.json();
};
const $ = id => document.getElementById(id);
const esc = s => (s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const today = () => new Date().toISOString().slice(0,10);

let state = { jobs:[], profil:{}, vorlagen:[], bewerbungen:[] };

function setTheme(t){ document.documentElement.dataset.theme=t; localStorage.setItem('theme',t); $('themeBtn').textContent=t==='dark'?'Light Mode':'Dark Mode'; }
document.addEventListener('DOMContentLoaded',()=>{ setTheme(localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')); init(); });
document.addEventListener('click',e=>{ if(e.target.id==='themeBtn') setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'); });

function showTab(id){
  document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tabpanel').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('[data-tab="'+id+'"]').forEach(el=>el.classList.add('active'));
  const panel = $(id);
  if(panel) panel.classList.add('active');
  if(id==='dashboard') loadStats();
  if(id==='verlauf') loadBewerbungen();
  if(id==='vorlagen') loadVorlagen();
  if(id==='profil') loadProfil();
  if(id==='suche') loadQuellenStatus();
}
document.addEventListener('click',e=>{ if(e.target.dataset.tab) showTab(e.target.dataset.tab); });

function log(msg){ const l=$('log'); if(!l) return; const ts='['+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+'] '; l.textContent=l.textContent?l.textContent+'\n\n'+ts+msg:ts+msg; l.scrollTop=l.scrollHeight; }

function setLoading(active){ const bar=$('loadingBar'); const sp=$('searchSpinner'); if(bar) bar.style.width=active?'70%':'0'; if(sp) sp.classList.toggle('active',active); }

function badge(status){ const L={beworben:'Beworben',interview:'Interview',angenommen:'Angenommen',abgelehnt:'Abgelehnt'}; return `<span class="badge badge-${esc(status||'beworben')}">${esc(L[status]||status||'beworben')}</span>`; }

function scoreJob(j){
  const kw=(state.profil.keywords||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const bl=(state.profil.blacklist||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const hay=(j.titel+' '+(j.firma||'')+' '+(j.beschreibung||'')+' '+(j.tags||[]).join(' ')).toLowerCase();
  let s=40; kw.forEach(k=>{if(hay.includes(k))s+=10;}); bl.forEach(b=>{if(hay.includes(b))s-=25;}); if(j.remote) s+=8;
  return Math.max(0,Math.min(100,s));
}

function getMatch(firma,titel){ return state.bewerbungen.find(b=>b.firma.toLowerCase().trim()===(firma||'').toLowerCase().trim()&&b.titel.toLowerCase().trim()===(titel||'').toLowerCase().trim())||state.bewerbungen.find(b=>b.firma.toLowerCase().trim()===(firma||'').toLowerCase().trim()); }

async function requestNotifications(){ if(!('Notification' in window)) return; if(Notification.permission==='default') await Notification.requestPermission(); }
function checkFollowupNotifications(){ if(Notification.permission!=='granted') return; const t=today(); state.bewerbungen.filter(b=>b.followup_datum===t&&b.status!=='angenommen'&&!b.archiviert).forEach(b=>new Notification('JobRadar',{body:`Follow-up f\u00e4llig: ${b.titel} bei ${b.firma}`})); }

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
    renderBewerbungen();
    loadStats();
    checkFollowupNotifications();
  } catch(e) { log('Bewerbungen-Fehler: '+e.message); }
}

function renderBewerbungen(){
  const el=$('bewerbungenList'); if(!el) return;
  const t=today();
  if(!state.bewerbungen.length){ el.innerHTML=`<div class="empty"><div class="empty-icon">\uD83D\uDCCB</div><h3>Noch keine Bewerbungen</h3><p>F\u00fcge deine erste Bewerbung manuell hinzu oder markiere eine Stelle aus der Suche.</p></div>`; return; }
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
      <div class="chips">${overdue?'<span class="chip" style="border-color:var(--error);color:var(--error)">\u26a0 \u00dcberf\u00e4llig</span>':''}${dueSoon?'<span class="chip" style="border-color:var(--warn);color:#8a6400">\u23f0 F\u00e4llig bald</span>':''}</div>
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
        ${b.url?`<a href="${esc(b.url)}" target="_blank" rel="noopener" class="btn small">Stelle \u00f6ffnen</a>`:''}
      </div>
    </article>`;
  }).join('');
}

window.toggleEdit=(id)=>{ const el=$('edit-'+id); if(el) el.classList.toggle('open'); };
window.saveInlineEdit=async(id)=>{
  try {
    await api('/api/bewerbungen/'+id,'PUT',{notizen:$('notiz-'+id)?.value||'',followup_datum:$('followup-'+id)?.value||'',bewertung:$('bewertung-'+id)?.value?parseInt($('bewertung-'+id).value):null});
    loadBewerbungen(); log('Gespeichert.');
  } catch(e) { log('Fehler beim Speichern: '+e.message); }
};
async function setStatus(id,status){
  try { await api('/api/bewerbungen/'+id,'PUT',{status}); loadBewerbungen(); log('Status \u2192 '+status); }
  catch(e) { log('Status-Fehler: '+e.message); }
}
async function archivieren(id,ist){
  try { await api('/api/bewerbungen/'+id,'PUT',{archiviert:ist?0:1}); loadBewerbungen(); }
  catch(e) { log('Archiv-Fehler: '+e.message); }
}
async function manuellHinzufuegen(){
  const titel=prompt('Stelle (z. B. IT Support):'); if(!titel) return;
  const firma=prompt('Firma:'); if(!firma) return;
  const status=prompt('Status (beworben / interview / angenommen / abgelehnt):','beworben')||'beworben';
  try {
    await api('/api/bewerbungen','POST',{titel,firma,status,beworben_am:today(),followup_datum:new Date(Date.now()+14*86400000).toISOString().slice(0,10)});
    loadBewerbungen(); log('Manuell gespeichert: '+titel+' bei '+firma);
  } catch(e) { log('Fehler: '+e.message); }
}
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
      <input id="ci-${id}" placeholder="Kommentar hinzuf\u00fcgen\u2026" onkeydown="if(event.key==='Enter') addKommentar(${id})">
      <button class="btn primary small" onclick="addKommentar(${id})">+</button>
    </div>
    <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn small" onclick="mailModal(${id},'${esc(b.titel)}')">\u2709 E-Mail vorbereiten</button>
      ${b.url?`<a href="${esc(b.url)}" target="_blank" rel="noopener" class="btn small">Stelle \u00f6ffnen</a>`:''}
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(id); });
}
function renderKommentare(list,id){ return list.length?list.map(k=>`<li><div>${esc(k.text)}<button class="del-comment" onclick="delKommentar(${id},${k.id})" title="L\u00f6schen">\u00d7</button></div><div class="ts">${esc(k.erstellt_am?.replace('T',' ').slice(0,16)||'')}</div></li>`).join(''):'<li style="color:var(--muted);padding-left:0">Noch keine Eintr\u00e4ge.</li>'; }
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
  // Umkreissuche: Ort aus Suchfeld (Vorrang) oder Profil, plus Umkreis in km
  const ortInput=$('sucheOrt')?.value.trim();
  const ort=ortInput||profil.ort||'Remote';
  const umkreis=$('sucheUmkreis')?.value||'0';
  setLoading(true);
  log('Suche l\u00e4uft: '+quelle+(umkreis>0?' \u2022 '+ort+' ('+umkreis+' km)':' \u2022 '+ort));
  try{
    const data=await api('/api/suche?'+new URLSearchParams({quelle,rolle:profil.rollen||'Linux Administrator',ort,count,umkreis}));
    if((data.errors||[]).length) data.errors.forEach(e=>log('Fehler: '+e));
    const rollen=(profil.rollen||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    state.jobs=(data.results||[]).filter(j=>{ const hay=(j.titel+' '+(j.firma||'')+' '+(j.beschreibung||'')+' '+(j.ort||'')+' '+(j.tags||[]).join(' ')).toLowerCase(); return rollen.length===0||rollen.some(r=>hay.includes(r.split(' ')[0])); }).map(j=>({...j,score:scoreJob(j)})).sort((a,b)=>b.score-a.score).slice(0,parseInt(count,10)||15);
    renderJobs(); log(state.jobs.length+' Treffer nach Filter.');
  }catch(e){ log('Fehler bei Suche: '+e.message); }
  setLoading(false);
}

function renderJobs(){
  const el=$('jobsList'); if(!el) return;
  if(!state.jobs.length){ el.innerHTML=`<div class="empty"><div class="empty-icon">\uD83D\uDD0D</div><h3>Keine Treffer</h3><p>Passe deine Rollen im Profil an und starte eine neue Suche.</p></div>`; return; }
  el.innerHTML=state.jobs.map((j,i)=>{ const match=getMatch(j.firma,j.titel); return `<article class="job"><div class="jobhead"><div><strong>${esc(j.titel)}</strong><div class="muted" style="margin-top:4px">${esc(j.firma)} \u00b7 ${esc(j.ort||'')} \u00b7 <em>${esc(j.quelle||'')}</em></div></div><div class="score">${j.score}%</div></div>${match?`<div style="margin-top:10px">${badge(match.status)} <span class="muted" style="font-size:14px">Bereits beworben</span></div>`:''}<div class="chips">${(j.tags||[]).slice(0,6).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div><div class="actions"><button class="btn primary small" onclick="kiAnschreibenErzeugen(${i})">&#x2728; KI-Anschreiben</button><button class="btn small" onclick="anschreibenErzeugen(${i})">Vorlage</button><button class="btn small" onclick="alsBeworben(${i})">Als beworben markieren</button>${j.url?`<a href="${esc(j.url)}" target="_blank" rel="noopener" class="btn small">Stelle \u00f6ffnen</a>`:''}</div></article>`; }).join('');
}

window.anschreibenErzeugen=(i)=>{
  const j=state.jobs[i]; const p=state.profil;
  const vorlagenSelect=$('vorlagenSelect'); const tplId=vorlagenSelect?parseInt(vorlagenSelect.value)||0:0;
  const tpl=state.vorlagen.find(v=>v.id===tplId)||state.vorlagen[0]||{};
  const text=`Bewerbung als ${j.titel}\n\nSehr geehrte Damen und Herren,\n\n${tpl.einleitung||''}\n\nIch bewerbe mich auf die Position ${j.titel} bei ${j.firma}. ${p.kurzprofil||''}\n\nBesonders relevant: ${p.staerken||''}. ${(j.tags||[]).length?'Ihre Themen ('+j.tags.slice(0,4).join(', ')+') passen sehr gut zu meinem Profil.':''}\n\n${tpl.schluss||''}\n\nMit freundlichen Gr\u00fc\u00dfen\n${p.name||''}`;
  $('letterPreview').value=text; $('letterSubject').value='Bewerbung als '+j.titel;
  showTab('anschreiben'); log('Anschreiben erzeugt: '+j.titel);
};
window.alsBeworben=async(i)=>{
  const j=state.jobs[i];
  if(getMatch(j.firma,j.titel)){log('Hinweis: Bereits beworben bei '+j.firma);return;}
  try {
    await api('/api/bewerbungen','POST',{titel:j.titel,firma:j.firma,ort:j.ort||'',quelle:j.quelle||'',url:j.url||'',beworben_am:today(),followup_datum:new Date(Date.now()+14*86400000).toISOString().slice(0,10),status:'beworben'});
    await loadBewerbungen(); renderJobs(); log('Beworben gespeichert: '+j.titel);
    if(Notification.permission!=='granted') requestNotifications();
  } catch(e) { log('Fehler: '+e.message); }
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
    await api('/api/profil','PUT',body); state.profil={...state.profil,...body}; log('Profil gespeichert.');
  } catch(e) { log('Profil-Fehler: '+e.message); }
}

async function loadVorlagen(){
  try {
    state.vorlagen=await api('/api/vorlagen');
    const el=$('vorlagenList');
    if(el){
      if(!state.vorlagen.length){ el.innerHTML=`<div class="empty"><div class="empty-icon">\uD83D\uDCDD</div><h3>Keine Vorlagen</h3><p>Erstelle deine erste Vorlage.</p></div>`; }
      else { el.innerHTML=state.vorlagen.map((v,i)=>`<div class="card"><strong>${esc(v.name)}</strong><div class="muted" style="margin-top:6px;font-size:14px">${esc((v.einleitung||'').slice(0,80))}\u2026</div><div class="actions"><button class="btn small" onclick="loadVorlage(${i})">Laden</button><button class="btn small" onclick="deleteVorlage(${v.id})">L\u00f6schen</button></div></div>`).join(''); }
    }
    const sel=$('vorlagenSelect'); if(sel){ sel.innerHTML=state.vorlagen.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join(''); }
  } catch(e) { log('Vorlagen-Fehler: '+e.message); }
}
window.loadVorlage=(i)=>{const v=state.vorlagen[i];$('vorlageName').value=v.name;$('vorlageEinleitung').value=v.einleitung;$('vorlageSchluss').value=v.schluss;};
window.deleteVorlage=async(id)=>{ try{await api('/api/vorlagen/'+id,'DELETE');loadVorlagen();}catch(e){log('Fehler: '+e.message);} };
async function saveVorlage(){
  try { await api('/api/vorlagen','POST',{name:$('vorlageName').value,einleitung:$('vorlageEinleitung').value,schluss:$('vorlageSchluss').value}); loadVorlagen(); log('Vorlage gespeichert.'); }
  catch(e) { log('Fehler: '+e.message); }
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
    sel.innerHTML = (data.models || ['mistral']).map(m => `<option value="${m}" ${m === data.active ? 'selected' : ''}>${m}</option>`).join('');
  } catch(e) { console.warn('Ollama nicht erreichbar'); }
}

async function kiAnschreibenErzeugen(jobIndex) {
  const j = jobIndex !== undefined ? state.jobs[jobIndex] : null;
  const titel = j?.titel || $('letterSubject')?.value?.replace('Bewerbung als ','') || '';
  const firma = j?.firma || '';
  const gen = $('kiGenerating'); const preview = $('letterPreview');
  const model = $('kiModel')?.value || 'mistral';
  if (!titel) { log('Bitte zuerst eine Stelle aus der Suche w\u00e4hlen.'); return; }
  if (gen) gen.classList.add('active');
  if (preview) preview.value = '';
  log('KI generiert Anschreiben f\u00fcr: ' + titel + ' bei ' + firma + ' \u2026');
  try {
    const res = await fetch('/api/ki/anschreiben', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({titel,firma,ort:j?.ort||'',beschreibung:j?.beschreibung||'',tags:j?.tags||[],profil:state.profil,model}) });
    const data = await res.json();
    if (data.error) { log('Fehler: ' + data.error); return; }
    if (preview) preview.value = `Bewerbung als ${titel} bei ${firma}\n\n${data.text}`;
    if ($('letterSubject')) $('letterSubject').value = 'Bewerbung als ' + titel;
    log('KI-Anschreiben fertig (' + (data.model||model) + ')');
    showTab('anschreiben');
  } catch(e) { log('KI-Fehler: ' + e.message); }
  finally { if (gen) gen.classList.remove('active'); }
}
window.kiAnschreibenErzeugen = kiAnschreibenErzeugen;

async function kiFeedback() {
  const text = $('letterPreview')?.value || '';
  if (!text.trim()) { log('Kein Anschreiben vorhanden.'); return; }
  const box = $('feedbackBox'); const gen = $('kiGenerating');
  if (gen) gen.classList.add('active');
  if (box) { box.classList.remove('visible'); box.textContent = ''; }
  log('KI analysiert Anschreiben \u2026');
  try {
    const res = await fetch('/api/ki/feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({anschreiben:text,stelle:$('letterSubject')?.value||''}) });
    const data = await res.json();
    if (data.error) { log('Fehler: ' + data.error); return; }
    if (box) { box.textContent = data.feedback; box.classList.add('visible'); }
    log('KI-Feedback erhalten.');
  } catch(e) { log('KI-Fehler: ' + e.message); }
  finally { if (gen) gen.classList.remove('active'); }
}

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
  } catch(e) { console.warn('Quellen-Status nicht verf\u00fcgbar'); }
}

async function init(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  await loadProfil();
  await loadVorlagen();
  await loadBewerbungen();
  await loadStats();
  $('filterStatus')?.addEventListener('change', loadBewerbungen);
  $('filterArchiv')?.addEventListener('change', loadBewerbungen);
  $('filterFirma')?.addEventListener('input', loadBewerbungen);
  requestNotifications();
  loadKiModels();
  loadQuellenStatus();
  setInterval(()=>{ loadBewerbungen(); loadStats(); }, 5*60*1000);
  log('JobRadar bereit.');
}
