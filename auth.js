
function requireAdmin(event){ const h=event.headers||{}; const a=h.authorization||h.Authorization; if(!a) return { ok:false, res:{statusCode:401, body: JSON.stringify({error:'No auth'})}}; const token=a.replace(/^Bearer\s+/,'').trim(); if(!process.env.ADMIN_API_KEY||token!==process.env.ADMIN_API_KEY){ return {ok:false, res:{statusCode:403, body: JSON.stringify({error:'Forbidden'})}}; } return {ok:true}; }
module.exports = { requireAdmin };
