// functions/update-settings.js
const { updateSettings } = require('./supabase');

exports.handler = async (event) => {
  try{
    if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const auth = event.headers.authorization || '';
    if(!auth) return { statusCode: 401, body: 'Unauthorized' };
    // basic: allow only admin email (configured in env)
    const identityRes = await require('node-fetch')(`${process.env.SITE_URL}/.netlify/identity/user`, { headers: { Authorization: auth } });
    if(!identityRes.ok) return { statusCode: 401, body: 'Invalid token' };
    const user = await identityRes.json();
    const adminEmail = process.env.ADMIN_EMAIL || 'calafelloriol@gmail.com';
    if(user.email !== adminEmail) return { statusCode: 403, body: 'Forbidden' };

    const body = JSON.parse(event.body || '{}');
    const value = body.value;
    if(!value) return { statusCode: 400, body: 'No value' };
    const res = await updateSettings(value);
    return { statusCode: 200, body: JSON.stringify(res) };
  }catch(e){
    console.error(e);
    return { statusCode: 500, body: String(e) };
  }
};
