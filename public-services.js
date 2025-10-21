
const { sbGet } = require('./db');
exports.handler = async () => { try{ const rows=await sbGet('/services',{ select:'*', order:'name.asc' }); return {statusCode:200, body: JSON.stringify(rows)} }catch(err){ return {statusCode:500, body: JSON.stringify({error:err.message})} }
};
