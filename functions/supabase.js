// functions/supabase.js
// Minimal Supabase helper using REST API for server-side Netlify Functions

const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL; // e.g. https://xyz.supabase.co
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key
if(!SUPABASE_URL || !SUPABASE_KEY){
  // functions using this module should check existence and fail gracefully
}

async function supabaseFetch(path, opts={}){
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: opts.prefer || 'return=representation'
  }, opts.headers || {});
  const res = await fetch(url + (opts.query || ''), {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let data;
  try{ data = text ? JSON.parse(text) : null; } catch(e){ data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function getUsageForDay(user_id, day){
  // day in ISO date YYYY-MM-DD
  const q = `?user_id=eq.${user_id}&day=eq.${day}`;
  const r = await supabaseFetch('usage_counters', { query: q });
  if(!r.ok) throw new Error(`Supabase error getUsage: ${JSON.stringify(r.data)}`);
  return (r.data && r.data.length) ? r.data[0] : null;
}

async function incrementUsage(user_id, day, {chats=0, images=0}){
  // try get, then patch or insert
  const existing = await getUsageForDay(user_id, day);
  if(existing){
    const updated = { chats_used: existing.chats_used + chats, images_used: existing.images_used + images };
    const res = await supabaseFetch(`usage_counters?id=eq.${existing.id}`, { method: 'PATCH', body: updated });
    if(!res.ok) throw new Error(`Supabase error updateUsage: ${JSON.stringify(res.data)}`);
    return res.data[0];
  } else {
    const payload = { user_id, day, chats_used: chats, images_used: images };
    const res = await supabaseFetch('usage_counters', { method: 'POST', body: payload });
    if(!res.ok) throw new Error(`Supabase error insertUsage: ${JSON.stringify(res.data)}`);
    return res.data[0];
  }
}

async function saveMessage(user_id, role, content){
  const payload = { user_id, role, content };
  const res = await supabaseFetch('messages', { method: 'POST', body: payload });
  if(!res.ok) throw new Error(`Supabase error saveMessage: ${JSON.stringify(res.data)}`);
  return res.data[0];
}

async function getMessages(user_id, limit=200){
  const q = `?user_id=eq.${user_id}&order=created_at.asc&limit=${limit}`;
  const res = await supabaseFetch('messages', { query: q });
  if(!res.ok) throw new Error(`Supabase error getMessages: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function getSettings(){
  const q = `?key=eq.site_config`;
  const res = await supabaseFetch('settings', { query: q });
  if(!res.ok) throw new Error(`Supabase error getSettings: ${JSON.stringify(res.data)}`);
  return (res.data && res.data[0]) ? res.data[0].value : null;
}

async function updateSettings(newValue){
  // upsert by key
  const payload = { key: 'site_config', value: newValue };
  const res = await supabaseFetch('settings', { method: 'POST', body: payload });
  if(!res.ok) throw new Error(`Supabase error updateSettings: ${JSON.stringify(res.data)}`);
  return res.data[0];
}

module.exports = { getUsageForDay, incrementUsage, saveMessage, getMessages, getSettings, updateSettings };
