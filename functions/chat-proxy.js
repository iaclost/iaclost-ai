// functions/chat-proxy.js
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

    // If user is authenticated, check usage counters in Supabase
    if(userId){
      if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return { statusCode: 500, body: 'Supabase not configured' };
      const day = new Date().toISOString().slice(0,10);
      const usage = await (async()=>{ try { return await getUsageForDay(userId, day);} catch(e){ return null;} })();
      const limits = { chats: 10 }; // default
      // If settings table exists, could fetch settings; simplified here
      const used = usage ? usage.chats_used : 0;
      if(used >= limits.chats){
        return { statusCode: 403, body: 'Límite de chats diario alcanzado. Vuelve mañana.' };
      }
    }

    // Forward request to OpenAI
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un asistente útil y conciso.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600
      })
    });

    if(!aiRes.ok){
      const t = await aiRes.text();
      return { statusCode: 502, body: `AI error: ${t}` };
    }
    const data = await aiRes.json();

    // Save messages and increment counter if user is authenticated
    if(userId){
      const day = new Date().toISOString().slice(0,10);
      try{
        await saveMessage(userId, 'user', prompt);
        const assistantText = data?.choices?.[0]?.message?.content || (data?.choices?.[0] && data.choices[0].text) || JSON.stringify(data);
        await saveMessage(userId, 'assistant', assistantText);
        await incrementUsage(userId, day, { chats: 1, images: 0 });
      }catch(e){
        // log but don't fail the response
        console.error('Supabase save error', e);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ result: data }) };
  } catch(err){
    console.error(err);
    return { statusCode: 500, body: String(err) };
  }
};
