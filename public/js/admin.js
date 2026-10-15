// public/js/admin.js
(async function(){
  const netlifyIdentity = window.netlifyIdentity;
  const adminEmail = 'calafelloriol@gmail.com'; // you can change this

  function init(){
    if(!netlifyIdentity) return console.warn('Netlify Identity widget missing');
    netlifyIdentity.init();
    document.getElementById('login-btn').onclick = ()=> netlifyIdentity.open();
    document.getElementById('logout-btn').onclick = ()=> netlifyIdentity.logout();
    netlifyIdentity.on('login', ()=> window.location.reload());
    netlifyIdentity.on('logout', ()=> window.location.reload());
    checkAuth();
  }

  async function checkAuth(){
    const user = netlifyIdentity.currentUser();
    if(user){
      document.getElementById('user-email').innerText = user.email;
      document.getElementById('login-btn').style.display = 'none';
      document.getElementById('logout-btn').style.display = 'inline-block';
      if(user.email === adminEmail){
        document.getElementById('admin-section').style.display = 'block';
        loadSettings();
      } else {
        document.getElementById('not-admin').style.display = 'block';
      }
    } else {
      document.getElementById('login-btn').style.display = 'inline-block';
      document.getElementById('logout-btn').style.display = 'none';
      document.getElementById('not-admin').style.display = 'none';
    }
  }

  async function loadSettings(){
    try{
      const res = await fetch('/.netlify/functions/get-settings');
      if(!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const cfg = data.value;
      document.getElementById('cfg-primary').value = cfg.colors.primary || '#4f46e5';
      document.getElementById('cfg-bg').value = cfg.colors.background || '#f7f7f8';
      document.getElementById('cfg-anon-chats').value = cfg.limits.anon.chats || 5;
      document.getElementById('cfg-anon-img').value = cfg.limits.anon.images || 3;
      document.getElementById('cfg-auth-chats').value = cfg.limits.auth.chats || 10;
      document.getElementById('cfg-auth-img').value = cfg.limits.auth.images || 6;
    }catch(e){
      document.getElementById('save-result').innerText = 'Error cargando settings: '+e.message;
    }
  }

  document.getElementById('save-settings').onclick = async ()=>{
    const newCfg = {
      colors: { primary: document.getElementById('cfg-primary').value, background: document.getElementById('cfg-bg').value },
      limits: { anon: { chats: Number(document.getElementById('cfg-anon-chats').value), images: Number(document.getElementById('cfg-anon-img').value) }, auth: { chats: Number(document.getElementById('cfg-auth-chats').value), images: Number(document.getElementById('cfg-auth-img').value) }, bonus: { chats:10, images:3 } },
      view_images_limit: 10
    };
    try{
      const token = await netlifyIdentity.currentUser().jwt(true);
      const res = await fetch('/.netlify/functions/update-settings', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ value: newCfg }) });
      if(!res.ok) throw new Error(await res.text());
      document.getElementById('save-result').innerText = 'Configuración guardada';
    }catch(e){
      document.getElementById('save-result').innerText = 'Error guardando: '+e.message;
    }
  };

  init();
})();
