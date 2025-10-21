
const { sbGet } = require('./db');
const { requireAdmin } = require('./auth');
function toMin(h){ const [H,M]=h.split(':').map(Number); return H*60+M } function fromMin(m){ const H=Math.floor(m/60), M=m%60; return `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}` }
function parseHours(dateStr){ const oh=process.env.OPEN_HOURS_JSON; if(!oh) return { open:'09:00', close:'19:00' }; const map=JSON.parse(oh); const d=new Date(`${dateStr}T00:00:00`); const wd=['sun','mon','tue','wed','thu','fri','sat'][d.getDay()]; const range=map[wd]||map['mon']||'09:00-19:00'; const [open,close]=range.split('-'); return {open,close}; }
exports.handler = async (event) => { const check=requireAdmin(event); if(!check.ok) return check.res; try{ const url=new URL(event.rawUrl); const date=url.searchParams.get('date'); const sid=url.searchParams.get('service_id'); if(!date||!sid) return {statusCode:400, body: JSON.stringify({error:'date y service_id requeridos'})}; const svc=(await sbGet('/services',{ select:'*', id:`eq.${sid}`, limit:'1'}))[0]; if(!svc) return {statusCode:400, body: JSON.stringify({error:'Servicio no encontrado'})}; const dur=svc.duration_minutes; const {open,close}=parseHours(date); const openM=toMin(open), closeM=toMin(close), step=parseInt(process.env.SLOT_STEP||'15',10);
  const appts=await sbGet('/appointments',{ select:'start_time,end_time,status', date:`eq.${date}`, 'status':'neq.cancelled' }); const blocked=appts.map(a=>({s:toMin(a.start_time), e:toMin(a.end_time)}));
  const slots=[]; for(let t=openM; t+dur<=closeM; t+=step){ const start=t, end=t+dur; const overlap=blocked.some(b=> start<b.e && end>b.s ); if(!overlap) slots.push(fromMin(start)); }
  return {statusCode:200, body: JSON.stringify({date, slots})}; }catch(err){ return {statusCode:500, body: JSON.stringify({error:err.message})} }
};
