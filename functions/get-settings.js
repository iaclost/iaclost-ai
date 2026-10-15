// functions/get-settings.js
const { getSettings } = require('./supabase');

exports.handler = async (event) => {
  try{
    const cfg = await getSettings();
    return { statusCode: 200, body: JSON.stringify({ value: cfg }) };
  }catch(e){
    console.error(e);
    return { statusCode: 500, body: String(e) };
  }
};
