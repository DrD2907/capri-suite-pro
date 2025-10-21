
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
function env(name){ const v = process.env[name]; if(!v) throw new Error(`Falta env ${name}`); return v; }
const base = () => env('SUPABASE_URL').replace(/\/$/, '') + '/rest/v1';
const headers = () => ({ 'apikey': env('SUPABASE_SERVICE_KEY'), 'Authorization': `Bearer ${env('SUPABASE_SERVICE_KEY')}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' });
async function sbGet(path, qp){ const url=new URL(base()+path); if(qp) Object.entries(qp).forEach(([k,v])=> url.searchParams.set(k,v)); const r=await fetch(url,{headers:headers()}); if(!r.ok) throw new Error(`GET ${path} ${r.status}: ${await r.text()}`); return r.json(); }
async function sbPost(path, body){ const r=await fetch(base()+path,{method:'POST', headers:headers(), body: JSON.stringify(body)}); if(!r.ok) throw new Error(`POST ${path} ${r.status}: ${await r.text()}`); return r.json(); }
async function sbPatch(path, body, qp){ const url=new URL(base()+path); if(qp) Object.entries(qp).forEach(([k,v])=> url.searchParams.set(k,v)); const r=await fetch(url,{method:'PATCH', headers:headers(), body: JSON.stringify(body)}); if(!r.ok) throw new Error(`PATCH ${path} ${r.status}: ${await r.text()}`); return r.json(); }
module.exports = { sbGet, sbPost, sbPatch };
