
const { sbGet, sbPost, sbPatch } = require('./db');
const { requireAdmin } = require('./auth');
exports.handler = async (event) => {
  const check=requireAdmin(event); if(!check.ok) return check.res;
  try{
    if(event.httpMethod==='GET'){
      const url=new URL(event.rawUrl); const date=url.searchParams.get('date'); let qp={ select:'*', order:'date.asc' }; if(date) qp.date=`eq.${date}`; const rows=await sbGet('/appointments', qp); return {statusCode:200, body: JSON.stringify(rows)};
    }
    if(event.httpMethod==='POST'){
      const b=JSON.parse(event.body||'{}'); const { customer_name, phone, service_id, date, start_time, comments='' }=b; if(!customer_name||!phone||!service_id||!date||!start_time) return {statusCode:400, body: JSON.stringify({error:'Campos incompletos'})};
      const svc= (await sbGet('/services',{ select:'*', id:`eq.${service_id}`, limit:'1' }))[0]; if(!svc) return {statusCode:400, body: JSON.stringify({error:'Servicio no encontrado'})};
      const start=new Date(`${date}T${start_time}:00`); const end=new Date(start.getTime()+svc.duration_minutes*60000); const end_time=`${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
      const overlaps=await sbGet('/appointments',{ select:'id', date:`eq.${date}`, 'start_time':`lt.${end_time}`, 'end_time':`gt.${start_time}`, 'status':`neq.cancelled` }); if(overlaps.length) return {statusCode:409, body: JSON.stringify({error:'Horario ocupado'})};
      const ins=await sbPost('/appointments', [{ customer_name, phone, service_id, service_name: svc.name, date, start_time, end_time, comments, status:'pending' }]);
      return {statusCode:201, body: JSON.stringify(ins[0])};
    }
    if(event.httpMethod==='PUT'){
      const b=JSON.parse(event.body||'{}'); const { id, status, start_time }=b; if(!id) return {statusCode:400, body: JSON.stringify({error:'Falta id'})};
      const a=(await sbGet('/appointments',{ select:'*', id:`eq.${id}`, limit:'1'}))[0]; if(!a) return {statusCode:404, body: JSON.stringify({error:'No existe'})};
      const update={};
      if(status) update.status=status;
      if(start_time){ const svc=(await sbGet('/services',{ select:'*', id:`eq.${a.service_id}`, limit:'1'}))[0]; const start=new Date(`${a.date}T${start_time}:00`); const end=new Date(start.getTime()+svc.duration_minutes*60000); const end_time=`${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`; const overlaps=await sbGet('/appointments',{ select:'id', date:`eq.${a.date}`, 'start_time':`lt.${end_time}`, 'end_time':`gt.${start_time}`, 'status':`neq.cancelled`, 'id':`neq.${a.id}`}); if(overlaps.length) return {statusCode:409, body: JSON.stringify({error:'Horario ocupado'})}; update.start_time=start_time; update.end_time=end_time; }
      const upd=(await sbPatch('/appointments', update, { id:`eq.${id}` }))[0]; return {statusCode:200, body: JSON.stringify(upd)};
    }
    if(event.httpMethod==='DELETE'){
      const b=JSON.parse(event.body||'{}'); const { id }=b; if(!id) return {statusCode:400, body: JSON.stringify({error:'Falta id'})}; const upd=(await sbPatch('/appointments', {status:'cancelled'}, { id:`eq.${id}` }))[0]; return {statusCode:200, body: JSON.stringify(upd)};
    }
    return {statusCode:405, body: JSON.stringify({error:'Method not allowed'})};
  }catch(err){ return {statusCode:500, body: JSON.stringify({error: err.message})}; }
};
