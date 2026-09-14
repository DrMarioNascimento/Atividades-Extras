/* Sala compartilhada das operações de grupo.
   Projeto Firebase: atividades-extras-e40b6
   Coleção: atividadesExtras/{CODIGO}
*/
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
  const mission = document.querySelector('meta[name="sim-category"]')?.content || (document.title || 'operacao').slice(0, 40);
  const state = { ready: false, err: '', db: null, uid: null, code: '', unsub: null, applying: false };
  function markSolved(key, fromNet) {
    const form = document.querySelector('[data-station="' + key + '"]');
    const station = document.getElementById('station' + key);
    if (!form || !station || station.classList.contains('solved')) return;
    if (typeof solved !== 'undefined') solved.add(key);
    station.classList.add('solved');
    const status = station.querySelector('.station-status');
    if (status) status.textContent = fromNet ? '✓ SALA' : '✓ VERIFICADA';
    const input = document.getElementById('code' + key);
    if (input) input.readOnly = true;
    const btn = form.querySelector('button');
    if (btn) btn.disabled = true;
    const fb = document.getElementById('feedback' + key);
    if (fb) { fb.classList.remove('error'); fb.textContent = fromNet ? 'Outro aparelho da sala validou esta chave.' : 'Chave validada.'; }
    if (typeof updateProgress === 'function') updateProgress();
  }
  function collectSolved() {
    const out = {};
    if (typeof solved === 'undefined') return out;
    solved.forEach((k) => { out[k] = true; });
    return out;
  }
  async function publish(extra) {
    if (!state.db || !state.code || state.applying) return;
    const payload = Object.assign({ mission, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), solved: collectSolved(), complete: typeof complete !== 'undefined' ? !!complete : false }, extra || {});
    await state.db.collection('atividadesExtras').doc(state.code).set(payload, { merge: true });
  }
  function applyRemote(data) {
    if (!data) return;
    state.applying = true;
    const remote = data.solved || {};
    Object.keys(remote).forEach((key) => { if (remote[key]) markSolved(key, true); });
    if (data.complete && typeof complete !== 'undefined' && !complete) {
      complete = true;
      if (typeof finishTimer === 'function') try { finishTimer(); } catch (e) {}
      if (typeof updateProgress === 'function') updateProgress();
      const dialog = document.getElementById('success-dialog');
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    }
    const n = Object.keys(data.membros || {}).length;
    const meta = document.getElementById('ops-fb-meta');
    if (meta) meta.textContent = n ? n + ' aparelho(s) na sala' : 'Sala ' + state.code;
    state.applying = false;
  }
  function codeOf(raw) { return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); }
  function randomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }
  async function join(code, isHost) {
    code = codeOf(code);
    if (code.length < 3) throw new Error('Use um código de 3 a 5 letras.');
    if (!state.db || !state.uid) throw new Error(state.err || 'Firebase ainda não conectou.');
    const ref = state.db.collection('atividadesExtras').doc(code);
    const snap = await ref.get();
    if (!snap.exists) {
      if (!isHost) throw new Error('Essa sala não existe. Peça o código ao professor.');
      await ref.set({ mission, createdAt: firebase.firestore.FieldValue.serverTimestamp(), host: state.uid, solved: {}, complete: false, membros: { [state.uid]: Date.now() } });
    } else {
      const data = snap.data() || {};
      if (data.mission && data.mission !== mission) throw new Error('Esse código é de outra operação (' + data.mission + ').');
      await ref.set({ membros: { [state.uid]: Date.now() } }, { merge: true });
    }
    if (state.unsub) state.unsub();
    state.code = code;
    state.unsub = ref.onSnapshot((doc) => applyRemote(doc.data()));
    await publish();
    const input = document.getElementById('ops-fb-code');
    if (input) input.value = code;
    const meta = document.getElementById('ops-fb-meta');
    if (meta) meta.textContent = 'Sala ' + code + ' conectada';
    showQr(code);
  }
  function pageUrl(code) { const url = new URL(location.href); url.searchParams.set('sala', code); return url.toString(); }
  function showQr(code) {
    let box = document.getElementById('ops-fb-qr');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ops-fb-qr';
      box.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%';
      const bar = document.getElementById('ops-fb-bar');
      if (bar) bar.appendChild(box);
    }
    const link = pageUrl(code);
    box.innerHTML = '<img alt="QR da sala ' + code + '" width="96" height="96" style="border-radius:8px;background:#fff;padding:6px" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(link) + '"><p class="ops-fb-msg">QR da sala ' + code + '. O celular abre esta missão e entra sozinho.</p>';
  }
  function hookLocalSolves() {
    document.querySelectorAll('[data-station]').forEach((form) => {
      form.addEventListener('submit', () => { setTimeout(() => { if (!state.applying) publish(); }, 40); });
    });
    const finalForm = document.getElementById('final-form');
    if (finalForm) finalForm.addEventListener('submit', () => { setTimeout(() => { if (!state.applying) publish({ complete: typeof complete !== 'undefined' ? !!complete : false }); }, 40); });
  }
  function mountBar() {
    if (document.getElementById('ops-fb-bar')) return;
    const bar = document.createElement('section');
    bar.id = 'ops-fb-bar';
    bar.className = 'panel';
    bar.innerHTML = '<style>#ops-fb-bar{margin:0 0 16px;padding:14px 16px;display:flex;gap:10px;align-items:end;flex-wrap:wrap}#ops-fb-bar .ops-fb-title{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);width:100%}#ops-fb-bar input{width:110px;border:1px solid #44606d;border-radius:7px;background:#07131b;padding:10px;color:var(--text);font:14px Consolas,monospace;letter-spacing:2px;text-transform:uppercase}#ops-fb-bar .ops-fb-msg{font-size:11px;color:var(--muted);flex:1;min-width:160px}</style><div class="ops-fb-title">Sala da equipe · Firebase</div><label class="duration-label">Código<input id="ops-fb-code" maxlength="5" placeholder="K7P2" autocomplete="off"></label><button type="button" class="primary" id="ops-fb-create">Criar sala</button><button type="button" class="ghost" id="ops-fb-join">Entrar</button><p class="ops-fb-msg" id="ops-fb-meta">Um aparelho cria o código. Os outros entram no mesmo.</p>';
    const consoleEl = document.getElementById('mission-console');
    if (consoleEl && consoleEl.parentNode) consoleEl.parentNode.insertBefore(bar, consoleEl);
    else document.body.insertBefore(bar, document.body.firstChild);
    document.getElementById('ops-fb-create').onclick = async () => {
      const meta = document.getElementById('ops-fb-meta');
      try { await join(codeOf(document.getElementById('ops-fb-code').value) || randomCode(), true); }
      catch (e) { meta.textContent = e.message || String(e); }
    };
    document.getElementById('ops-fb-join').onclick = async () => {
      const meta = document.getElementById('ops-fb-meta');
      try { await join(document.getElementById('ops-fb-code').value, false); }
      catch (e) { meta.textContent = e.message || String(e); }
    };
  }
  function boot() {
    mountBar();
    hookLocalSolves();
    const meta = document.getElementById('ops-fb-meta');
    try {
      if (typeof firebase === 'undefined') { state.err = 'SDK Firebase não carregou. Use a versão online.'; if (meta) meta.textContent = state.err; return; }
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      state.db = firebase.firestore();
      firebase.auth().signInAnonymously().then((cred) => {
        state.uid = cred.user.uid;
        state.ready = true;
        if (meta) meta.textContent = 'Firebase pronto. Crie ou entre numa sala.';
        const sala = codeOf(new URLSearchParams(location.search).get('sala'));
        if (sala) join(sala, true).catch((e) => { if (meta) meta.textContent = e.message || String(e); });
      }).catch((e) => {
        state.err = 'Ative Authentication > Anônimo. ' + (e.code || '');
        if (meta) meta.textContent = state.err;
      });
    } catch (e) {
      state.err = String(e && e.message ? e.message : e);
      if (meta) meta.textContent = state.err;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
