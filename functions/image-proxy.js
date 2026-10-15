// functions/image-proxy.js
const fetch = require('node-fetch');
const { getUsageForDay, incrementUsage, saveMessage } = require('./supabase');

exports.handler = async (event) => {
  try {
    if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const auth = event.headers.authorization || '';
    let userId = null;
    if(auth){
      const identityRes = await fetch(`${process.env.SITE_URL}/.netlify/identity/user`, { headers: { Authorization: auth } });
      if(!identityRes.ok) return { statusCode: 401, body: 'Invalid identity token' };
      const user = await identityRes.json();
      userId = user?.id;
    }

    const body = JSON.parse(event.body || '{}');
    const prompt = body.prompt || '';
    if(!prompt) return { statusCode: 400, body: 'No prompt provided' };

    if(userId){
      if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return { statusCode: 500, body: 'Supabase not configured' };
      const day = new Date().toISOString().slice(0,10);
      const usage = await (async()=>{ try { return await getUsageForDay(userId, day);} catch(e){ return null;} })();
      const limits = { images: 6 };
      const used = usage ? usage.images_used : 0;
      if(used >= limits.images){
        return { statusCode: 403, body: 'Límite de imágenes diario alcanzado. Vuelve mañana.' };
      }
    }

    const aiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ prompt, n:1, size:'1024x1024' })
    });
    if(!aiRes.ok){
      const t = await aiRes.text();
      return { statusCode: 502, body: `AI image error: ${t}` };
    }
    const data = await aiRes.json();

    if(userId){
      const day = new Date().toISOString().slice(0,10);
      try{
        await saveMessage(userId, 'image_prompt', prompt);
        await incrementUsage(userId, day, { chats: 0, images: 1 });
      }catch(e){
        console.error('Supabase save error', e);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ result: data }) };
  } catch(err){
    console.error(err);
    return { statusCode: 500, body: String(err) };
  }
};
