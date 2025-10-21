
const { sbGet } = require('./db');
const { requireAdmin } = require('./auth');
function between(date, from, to){ if(from && date<from) return false; if(to && date>to) return false; return true; }
exports.handler = async (event) => { const check=requireAdmin(event); if(!check.ok) return check.res; try{ const url=new URL(event.rawUrl); const from=url.searchParams.get('from')||''; const to=url.searchParams.get('to')||''; const rows=await sbGet('/appointments',{ select:'*' }); const services=await sbGet('/services',{ select:'*' }); const svcMap=new Map(services.map(s=>[s.id, s])); const data=rows.filter(a=> between(a.date, from, to) && a.status!=='cancelled');
  const by_service={}; let total=0; let revenue=0; const by_hour={};
  for(const a of data){ total++; const svc=svcMap.get(a.service_id); const price=svc? Number(svc.price):0; revenue+=price; by_service[a.service_name]=by_service[a.service_name]||{service_name:a.service_name,count:0,revenue:0}; by_service[a.service_name].count++; by_service[a.service_name].revenue+=price; const h=Number(String(a.start_time).slice(0,2)); by_hour[h]= (by_hour[h]||0)+1; }
  const by_service_arr=Object.values(by_service).sort((x,y)=> y.count-x.count);
  const by_hour_arr=Object.entries(by_hour).map(([h,c])=>({hour:Number(h), count:c})).sort((a,b)=>a.hour-b.hour);
  const max= Math.max(0, ...by_hour_arr.map(x=>x.count)); const peaks=by_hour_arr.filter(x=>x.count===max).map(x=>String(x.hour).padStart(2,'0'));
  return {statusCode:200, body: JSON.stringify({ kpis:{ total_appointments: total, estimated_revenue: revenue, peak_hours: peaks }, by_service: by_service_arr, by_hour: by_hour_arr }) };
 }catch(err){ return {statusCode:500, body: JSON.stringify({error:err.message})} }
};
