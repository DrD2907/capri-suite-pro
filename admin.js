
const API='/.netlify/functions';
const STORE='ADMIN_API_KEY';
const $=(s,c=document)=>c.querySelector(s); const $$=(s,c=document)=>Array.from(c.querySelectorAll(s));
function setKey(k){localStorage.setItem(STORE,k)} function getKey(){return localStorage.getItem(STORE)||''}
function auth(){ const k=getKey(); return k? {'Authorization':`Bearer ${k}`} : {} }
async function api(path,opts={}){ const r=await fetch(`${API}${path}`, { ...opts, headers:{ 'Content-Type':'application/json', ...(opts.headers||{}), ...auth() } }); if(!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`); return r.json(); }

$('#btn-login').addEventListener('click',()=>{const k=$('#admin-key').value.trim(); if(!k){alert('Pega ADMIN_API_KEY');return} setKey(k); location.reload();});
$('#btn-logout').addEventListener('click',()=>{localStorage.removeItem(STORE); location.reload();});

async function loadServices(){ const services=await api('/services'); const sel=$('#service-select'); sel.innerHTML=''; services.filter(s=>s.active).forEach(s=>{ const o=document.createElement('option'); o.value=s.id; o.textContent=`${s.name} — ${s.duration_minutes} min — S/ ${s.price}`; sel.appendChild(o); }); return services; }
async function loadAvailability(){ const d=$('#date').value, sid=$('#service-select').value; if(!d||!sid) return; const r=await api(`/availability?date=${d}&service_id=${sid}`); const sel=$('#start-time'); sel.innerHTML=''; r.slots.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); }); }
$('#date').addEventListener('change', loadAvailability); $('#service-select').addEventListener('change', loadAvailability);

$('#form-create').addEventListener('submit', async (e)=>{ e.preventDefault(); const st=$('#create-status'); st.textContent='Creando...'; st.style.color=''; const fd=Object.fromEntries(new FormData(e.target).entries()); const payload={ customer_name:fd.customer_name, phone:fd.phone, service_id:fd.service_id, date:fd.date, start_time:fd.start_time, comments:fd.comments||'' };
  try{ await api('/appointments', { method:'POST', body: JSON.stringify(payload) }); st.textContent='Cita creada'; st.style.color='#22c55e'; e.target.reset(); await refreshAll(); }catch(err){ st.textContent=err.message; st.style.color='#ef4444'; }
});

let calendar;
async function renderCalendar(events){ const el=$('#calendar'); if(calendar) calendar.destroy(); calendar=new FullCalendar.Calendar(el, { initialView:'timeGridWeek', locale:'es', headerToolbar:{ left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay' }, slotMinTime:'09:00:00', slotMaxTime:'20:00:00', events: events.map(a=>({ id:a.id, title:`${a.customer_name} — ${a.service_name}`, start:a.start_iso, end:a.end_iso, color: a.status==='cancelled'? '#6b7280': (a.status==='confirmed'? '#22c55e':'#e879f9') })), eventClick:(info)=> openRowActions(info.event.id) }); calendar.render(); }

function renderTable(rows){ const tb=$('#tbl-appointments tbody'); tb.innerHTML=''; rows.forEach(a=>{ const dt=new Date(a.start_iso); const tr=document.createElement('tr'); tr.innerHTML=`<td>${a.date}</td><td>${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}</td><td>${a.customer_name}</td><td>${a.service_name}</td><td>${a.phone}</td><td>${a.status}</td><td><button class='btn-outline' data-act='confirm' data-id='${a.id}'>Confirmar</button> <button class='btn-outline' data-act='edit' data-id='${a.id}'>Editar</button> <button class='btn-danger' data-act='cancel' data-id='${a.id}'>Cancelar</button></td>`; tb.appendChild(tr); }); }

$('#tbl-appointments').addEventListener('click', async (e)=>{ const b=e.target.closest('button'); if(!b) return; const id=b.dataset.id; const act=b.dataset.act; if(act==='cancel'){ if(!confirm('¿Cancelar la cita?')) return; await api('/appointments',{method:'DELETE', body: JSON.stringify({id})}); }
  if(act==='confirm'){ await api('/appointments',{method:'PUT', body: JSON.stringify({id, status:'confirmed'})}); }
  if(act==='edit'){ const newTime=prompt('Nueva hora (HH:MM):'); if(!newTime) return; await api('/appointments',{method:'PUT', body: JSON.stringify({id, start_time:newTime})}); }
  await refreshAll(); });

$('#btn-refresh').addEventListener('click', refreshAll); $('#btn-today').addEventListener('click', ()=>{ const t=new Date().toISOString().slice(0,10); $('#from').value=t; $('#to').value=t; refreshAll(); }); $('#btn-apply').addEventListener('click', refreshAll);

/* Stats & KPIs */
let chartServices, chartHours;
async function loadStats(){ const from=$('#from').value||''; const to=$('#to').value||''; const q=`?from=${from}&to=${to}`; const data=await api('/stats'+q);
  // KPIs
  $('#kpi-appointments').textContent = data.kpis.total_appointments;
  $('#kpi-revenue').textContent = 'S/ ' + data.kpis.estimated_revenue.toFixed(2);
  $('#kpi-peak').textContent = data.kpis.peak_hours.join(', ');
  // Charts
  const svcLabels=data.by_service.map(x=>x.service_name), svcCounts=data.by_service.map(x=>x.count), svcRevenue=data.by_service.map(x=>x.revenue);
  const ctx1=document.getElementById('chart-services');
  chartServices?.destroy(); chartServices=new Chart(ctx1,{ type:'bar', data:{ labels:svcLabels, datasets:[{ label:'Citas', data:svcCounts, backgroundColor:'#e879f9' }, { label:'Ingresos (S/)', data:svcRevenue, backgroundColor:'#22d3ee' }] }, options:{ responsive:true, scales:{ y:{ beginAtZero:true }}} });
  const hLabels=data.by_hour.map(x=>x.hour+':00'), hCounts=data.by_hour.map(x=>x.count);
  const ctx2=document.getElementById('chart-hours'); chartHours?.destroy(); chartHours=new Chart(ctx2,{ type:'line', data:{ labels:hLabels, datasets:[{ label:'Citas por hora', data:hCounts, borderColor:'#e879f9', backgroundColor:'rgba(232,121,249,.25)' }] }, options:{ responsive:true, tension:.35, fill:true } });
}

/* Appointments list & calendar */
async function loadAppointments(){ const from=$('#from').value||new Date().toISOString().slice(0,10); const list=await api(`/appointments?date=${from}`); const events=list.map(a=> ({ ...a, start_iso:`${a.date}T${a.start_time}:00`, end_iso:`${a.date}T${a.end_time}:00` })); await renderCalendar(events); renderTable(events); return events; }

/* Export Excel */
$('#btn-export').addEventListener('click', async ()=>{ const from=$('#from').value||new Date().toISOString().slice(0,10); const list=await api(`/appointments?date=${from}`); const rows=list.map(r=>({Fecha:r.date,Hora:r.start_time,Cliente:r.customer_name,Servicio:r.service_name,Tel:r.phone,Estado:r.status})); const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Citas'); XLSX.writeFile(wb, `citas_${from}.xlsx`); });

async function refreshAll(){ try{ await loadServices(); await loadStats(); const e=await loadAppointments(); await loadAvailability(); }catch(err){ console.error(err); alert('Error: '+err.message); } }

if(getKey()) refreshAll();
