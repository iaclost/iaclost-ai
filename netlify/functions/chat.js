const OPENAI_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body || '{}');
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta message' }) };
    }

    if (!OPENAI_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          reply: `Modo local activo: he recibido "${message}". Añade OPENAI_API_KEY en Netlify para activar la IA real.`
        })
      };
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        max_tokens: 800,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { statusCode: resp.status, body: JSON.stringify({ error: text }) };
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? 'Sin respuesta';
    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) })
    };
  }
};
