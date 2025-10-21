
const { sbGet } = require('./db');
const { requireAdmin } = require('./auth');
exports.handler = async (event) => { const check=requireAdmin(event); if(!check.ok) return check.res; try{ const rows=await sbGet('/services',{ select:'*', order:'name.asc' }); return {statusCode:200, body: JSON.stringify(rows)} }catch(err){ return {statusCode:500, body: JSON.stringify({error:err.message})} }
};
