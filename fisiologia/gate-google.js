/* Porta no estilo Learning-lab / Modulo do Orientador. */
(function () {
  const firebaseConfig = {
    apiKey: 'AIzaSyCDpYpar6S9X1uQvjm8yf4WXJGxXHxZLNM',
    authDomain: 'atividades-extras-e40b6.firebaseapp.com',
    projectId: 'atividades-extras-e40b6',
    storageBucket: 'atividades-extras-e40b6.firebasestorage.app',
    messagingSenderId: '220943378937',
    appId: '1:220943378937:web:7c24574644d58a760bf528',
    measurementId: 'G-H82PTTM9GK'
  };
  function ensureApp() {
    if (typeof firebase === 'undefined') throw new Error('SDK Firebase nao carregou. Abra pelo site.');
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    return firebase.auth();
  }
  function styleOnce() {
    if (document.getElementById('ops-gate-css')) return;
    const s = document.createElement('style');
    s.id = 'ops-gate-css';
    s.textContent = '.modal-senha-backdrop{position:fixed;inset:0;background:rgba(7,14,21,.72);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}.modal-senha{background:linear-gradient(180deg,#fffdf6,#f4e8cc);color:#3d3224;border-radius:18px;padding:28px 24px;max-width:380px;width:100%;box-shadow:0 24px 60px #0008}.modal-senha h3{margin:0 0 8px;text-align:center;font-size:22px;font-weight:600}.modal-senha p{font-size:14px;color:#6a5840;text-align:center;margin:0 0 16px;line-height:1.5}.modal-senha .erro-senha{min-height:18px;color:#9e2b2e;font-size:13px;text-align:center;margin-bottom:8px}.modal-senha .btn-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.modal-senha .btn{min-height:42px;padding:0 16px;border-radius:12px;border:1px solid #d8c9a8;background:linear-gradient(#fff8ea,#f3e6c8);color:#5a4630;font-weight:700;cursor:pointer}';
    document.head.appendChild(s);
  }
  let pending = null;
  function fecharModal() {
    const el = document.getElementById('modalSenhaGoogle');
    if (el) el.remove();
    if (pending && pending.reject) { const r = pending.reject; pending = null; r(new Error('Login cancelado.')); }
  }
  function abrirModal() {
    styleOnce();
    if (document.getElementById('modalSenhaGoogle')) return;
    const wrap = document.createElement('div');
    wrap.id = 'modalSenhaGoogle';
    wrap.className = 'modal-senha-backdrop';
    wrap.innerHTML = '<div class="modal-senha" role="dialog"><h3>\uD83D\uDD12 Area restrita</h3><p>Como no Laboratorio do Pesquisador, so entra quem autentica. Aqui a chave e a conta Google.</p><div class="erro-senha" id="erroSenhaGoogle"></div><div class="btn-row"><button class="btn" type="button" id="ops-gate-cancel">Cancelar</button><button class="btn" type="button" id="ops-gate-ok">\uD83D\uDD12 Entrar com Google</button></div></div>';
    wrap.addEventListener('click', (e) => { if (e.target === wrap) fecharModal(); });
    document.body.appendChild(wrap);
    document.getElementById('ops-gate-cancel').onclick = fecharModal;
    document.getElementById('ops-gate-ok').onclick = async () => {
      const err = document.getElementById('erroSenhaGoogle');
      try {
        const user = await signPopup();
        const resolve = pending && pending.resolve;
        pending = null;
        wrap.remove();
        if (resolve) resolve(user);
      } catch (e) { if (err) err.textContent = e.message || String(e); }
    };
  }
  async function signPopup() {
    const auth = ensureApp();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await auth.signInWithPopup(provider);
    return cred.user;
  }
  function ensureAuth() {
    const auth = ensureApp();
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve, reject) => { pending = { resolve, reject }; abrirModal(); });
  }
  window.OpsGate = {
    ensureAuth,
    currentUser() { try { return ensureApp().currentUser; } catch (e) { return null; } }
  };
})();
