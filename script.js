
const API_BASE='/.netlify/functions';
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>Array.from(c.querySelectorAll(s));

/* Year */
$('#year').textContent = new Date().getFullYear();

/* Nav */
const toggle=$('.nav-toggle'), nav=$('.site-nav');
if(toggle&&nav){
  toggle.addEventListener('click',()=>{const opened=nav.classList.toggle('open');toggle.setAttribute('aria-expanded', opened?'true':'false')});
  nav.addEventListener('click',e=>{if(e.target.tagName==='A'&&nav.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}})
}

/* Scroll UI */
const onScrollUI=()=>{document.body.classList.toggle('scrolled', window.scrollY>10); const t=$('.to-top'); if(t) t.classList.toggle('show', window.scrollY>360); parallax(); reveal();};
window.addEventListener('scroll', onScrollUI); onScrollUI();
$('.to-top')?.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

/* Parallax */
function parallax(){ const p=document.querySelector('.parallax'); if(!p) return; const y=window.scrollY*0.25; p.style.transform=`translateY(${y}px) scale(1.1)`; }

/* Fade-in reveal */
const io=new IntersectionObserver((entries)=>{ entries.forEach(en=>{ if(en.isIntersecting) en.target.classList.add('in-view'); }); },{threshold:.18});
$$('.fade-in').forEach(el=>io.observe(el));
function reveal(){ /* fallback por scroll */ }

/* Contact data (edit) */
const BUSINESS_WHATSAPP='51987654321';
const BUSINESS_EMAIL='tucorreo@dominio.com';
$('#display-whatsapp') && ($('#display-whatsapp').textContent = `+${BUSINESS_WHATSAPP}`);
$('#display-email') && ($('#display-email').textContent = BUSINESS_EMAIL);
$('#whatsapp-button') && ($('#whatsapp-button').href = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent('Hola, quiero reservar una cita.')}`);

/* PUBLIC: services & availability */
async function j(url,opts){ const r=await fetch(url,opts); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function loadServices(){ const services=await j(`${API_BASE}/public-services`); const sel=$('#service-select'); sel.innerHTML=''; sel.insertAdjacentHTML('beforeend','<option disabled selected>Selecciona un servicio</option>'); services.filter(s=>s.active).forEach(s=>{ const o=document.createElement('option'); o.value=s.id; o.textContent=`${s.name} — ${s.duration_minutes} min — S/ ${s.price}`; o.dataset.name=s.name; sel.appendChild(o); }); return services; }
async function loadAvailability(){ const d=$('#date').value, sid=$('#service-select').value; const timeSel=$('#time-select'); timeSel.innerHTML=''; if(!d||!sid){ timeSel.insertAdjacentHTML('beforeend','<option disabled selected>Elige una fecha y servicio</option>'); return; } const r=await j(`${API_BASE}/public-availability?date=${d}&service_id=${sid}`); if(r.slots.length===0){ timeSel.insertAdjacentHTML('beforeend','<option disabled selected>Sin horarios disponibles</option>'); return; } timeSel.insertAdjacentHTML('beforeend','<option disabled selected>Selecciona una hora</option>'); r.slots.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; timeSel.appendChild(o); }); }
$('#date')?.addEventListener('change',loadAvailability); $('#service-select')?.addEventListener('change',loadAvailability);

/* Fecha mínima hoy */
const inputFecha=$('#date'); if(inputFecha){ const today=new Date(); today.setHours(0,0,0,0); inputFecha.min=today.toISOString().slice(0,10); }

/* Booking submit (automático) */
const form=$('#booking-form'); const statusEl=$('#form-status'); const submitBtn=$('#submit-btn');
function fmt(d){const [y,m,dd]=d.split('-');return `${dd}/${m}/${y}`}
function summary(fd, svcName){ return `Nueva reserva:
- Nombre: ${fd.nombre}
- Teléfono: ${fd.telefono}
- Servicio: ${svcName}
- Fecha/Hora: ${fmt(fd.fecha)} ${fd.hora}
- Comentarios: ${fd.comentarios||'—'}` }
form?.addEventListener('submit', async (e)=>{
  e.preventDefault(); statusEl.textContent=''; submitBtn.classList.add('loading'); submitBtn.disabled=true;
  const fd=Object.fromEntries(new FormData(form).entries()); if(fd.website){ submitBtn.classList.remove('loading'); submitBtn.disabled=false; return; }
  try{
    const opt=$('#service-select').selectedOptions[0]; const service_id=opt.value; const svcName=opt.dataset.name||opt.textContent.split(' — ')[0];
    const payload={ nombre:fd.nombre.trim(), telefono:fd.telefono.trim(), service_id, fecha:fd.fecha, hora:fd.hora, comentarios:fd.comentarios||'', notificarPor:fd.notificarPor };
    const r=await j(`${API_BASE}/public-booking`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    statusEl.textContent='Reserva registrada. Te contactaremos para confirmar. ¡Gracias!'; statusEl.style.color='#22c55e'; form.reset(); $('#time-select').innerHTML='<option disabled selected>Elige una fecha y servicio</option>';
  }catch(err){ statusEl.textContent='No se pudo registrar: '+err.message; statusEl.style.color='#ef4444'; }
  finally{ submitBtn.classList.remove('loading'); submitBtn.disabled=false; }
});

/* Services carousel -> auto-select */
function normalizeStr(s=''){ return s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim(); }
function selectServiceByName(name){ const sel=$('#service-select'); if(!sel) return false; const n=normalizeStr(name); const opts=Array.from(sel.options); const m=opts.find(o=>normalizeStr(o.textContent).startsWith(n)); if(m){ sel.value=m.value; sel.dispatchEvent(new Event('change', {bubbles:true})); document.getElementById('reserva').scrollIntoView({behavior:'smooth'}); sel.style.boxShadow='0 0 0 3px var(--ring)'; setTimeout(()=> sel.style.boxShadow='', 700); return true; } return false; }
function waitThenSelect(name, tries=12){ if(selectServiceByName(name)) return; if(tries>0) setTimeout(()=> waitThenSelect(name, tries-1), 150); }

document.addEventListener('click', (e)=>{ const btn=e.target.closest('.service-slide'); if(!btn) return; waitThenSelect(btn.dataset.serviceName); });
(function initCarousel(){ const track=document.getElementById('car-track'); if(!track) return; const prev=document.querySelector('.car-prev'); const next=document.querySelector('.car-next'); const dots=document.querySelector('.car-dots'); const slides=Array.from(track.querySelectorAll('.car-slide'));
  slides.forEach((_,i)=>{ const b=document.createElement('button'); b.type='button'; b.addEventListener('click', ()=> track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior:'smooth' })); dots.appendChild(b); });
  function updateDots(){ const mid=track.scrollLeft + track.clientWidth/2; let idx=0, min=Infinity; slides.forEach((sl,i)=>{ const c=sl.offsetLeft+sl.clientWidth/2; const d=Math.abs(c-mid); if(d<min){min=d; idx=i;} }); dots.querySelectorAll('button').forEach((b,i)=> b.classList.toggle('active', i===idx)); }
  prev?.addEventListener('click', ()=> track.scrollBy({ left: -track.clientWidth*0.9, behavior:'smooth' }));
  next?.addEventListener('click', ()=> track.scrollBy({ left: track.clientWidth*0.9, behavior:'smooth' }));
  track.addEventListener('scroll', ()=> requestAnimationFrame(updateDots)); updateDots(); })();

/* Before/After slider */
(function initBA(){ const wrap=document.querySelector('.ba-slider'); if(!wrap) return; const after=wrap.querySelector('.ba-after'); const handle=wrap.querySelector('.ba-handle'); let dragging=false;
  function setPos(px){ const r=wrap.getBoundingClientRect(); const x=Math.min(Math.max(px - r.left,0), r.width); const pct = (x/r.width)*100; after.style.clipPath=`inset(0 0 0 ${pct}%)`; handle.style.left=`${pct}%`; handle.setAttribute('aria-valuenow', Math.round(pct)); }
  wrap.addEventListener('mousedown', e=>{ dragging=true; setPos(e.clientX); });
  window.addEventListener('mousemove', e=>{ if(dragging) setPos(e.clientX); });
  window.addEventListener('mouseup', ()=> dragging=false);
  handle.addEventListener('keydown', e=>{ const step=5; const r=wrap.getBoundingClientRect(); const current=parseFloat(handle.style.left||'50%'); const c=current + (e.key==='ArrowRight'? step : e.key==='ArrowLeft'? -step : 0); if(c!==current){ const px = r.left + (c/100)*r.width; setPos(px); } });
})();

/* Testimonials carousel */
(function initTesti(){ const track=document.getElementById('testi-track'); if(!track) return; const prev=document.querySelector('.testi-prev'); const next=document.querySelector('.testi-next'); const dots=document.getElementById('testi-dots'); const slides=Array.from(track.querySelectorAll('.testi-item'));
  slides.forEach((_,i)=>{ const b=document.createElement('button'); b.addEventListener('click',()=> track.scrollTo({left: slides[i].offsetLeft - track.offsetLeft, behavior:'smooth'})); dots.appendChild(b); });
  function update(){ const mid=track.scrollLeft+track.clientWidth/2; let idx=0,min=1e9; slides.forEach((sl,i)=>{ const c=sl.offsetLeft+sl.clientWidth/2; const d=Math.abs(c-mid); if(d<min){min=d; idx=i;} }); dots.querySelectorAll('button').forEach((b,i)=> b.classList.toggle('active', i===idx)); }
  prev?.addEventListener('click', ()=> track.scrollBy({left:-track.clientWidth*0.9,behavior:'smooth'}));
  next?.addEventListener('click', ()=> track.scrollBy({left: track.clientWidth*0.9,behavior:'smooth'}));
  track.addEventListener('scroll', ()=> requestAnimationFrame(update)); update();})();

/* Boot */
(async function(){ await loadServices(); })();
