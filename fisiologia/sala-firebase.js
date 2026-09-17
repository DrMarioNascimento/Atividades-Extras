import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

/* Sala dos laboratórios de Fisiologia — mesmo desenho da Mesa do MOSAICO.
   O professor abre a sala com o Google (conta conferida em config/mestres),
   projeta código e QR, e as equipes entram pelo celular sem conta nenhuma
   (autenticação anônima). Cada equipe grava só o próprio progresso; o painel
   do professor lê todas.

   Nenhum laboratório foi reescrito para isto: o progresso é lido da tela que
   eles já pintam (cadeados, status da missão, modal de falha). Os sete usam
   os mesmos ids, e é esse o contrato. */

const CONFIG = {
  apiKey: 'AIzaSyCDpYpar6S9X1uQvjm8yf4WXJGxXHxZLNM',
  authDomain: 'atividades-extras-e40b6.firebaseapp.com',
  projectId: 'atividades-extras-e40b6',
  storageBucket: 'atividades-extras-e40b6.firebasestorage.app',
  messagingSenderId: '220943378937',
  appId: '1:220943378937:web:7c24574644d58a760bf528'
};
const app = getApps().find(a => a.name === 'ae-salas') || initializeApp(CONFIG, 'ae-salas');
const auth = getAuth(app), db = getFirestore(app);

const LAB = decodeURIComponent(location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
const TITULO = (document.querySelector('header h1')?.textContent || document.title).replace(/^Operação:\s*/, '').trim();
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GUARDA = 'ae.sala.' + LAB;

let code = '', role = '', room = null, equipes = [], unsubRoom = null, unsubEquipes = null;
let tentativas = 0, inicioMs = 0, ultimoEnvio = '', envioTimer = null;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const salaRef = c => doc(db, 'salas', c);
const equipeRef = (c, uid) => doc(db, 'salas', c, 'equipes', uid);
function gerar() { let s = ''; for (let i = 0; i < 6; i++) s += ALFA[Math.floor(Math.random() * ALFA.length)]; return s; }
function linkDe(c, lab = LAB) { const u = new URL(lab + '.html', location.href); u.searchParams.set('sala', c); return u.toString(); }
function guardar(c) { try { c ? localStorage.setItem(GUARDA, c) : localStorage.removeItem(GUARDA); } catch {} }
function guardado() { try { return localStorage.getItem(GUARDA) || ''; } catch { return ''; } }

function css() {
  const st = document.createElement('style');
  st.textContent = `
#aeGate{position:fixed;inset:0;z-index:2000;overflow:auto;background:radial-gradient(900px 560px at 50% -10%,#15233a 0,transparent 60%),#080c14;color:#f3f4f6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
#aeGate[hidden]{display:none}
.ae-shell{width:min(640px,calc(100% - 32px));margin:0 auto;padding:max(28px,env(safe-area-inset-top)) 0 max(40px,env(safe-area-inset-bottom))}
.ae-brand{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#93c5fd;font-weight:700}
.ae-card{margin-top:16px;padding:22px;border:1px solid #1f2937;border-radius:14px;background:#111827;box-shadow:0 18px 50px rgba(0,0,0,.5)}
.ae-card h1{font-size:clamp(28px,7vw,40px);line-height:1.08;margin:.2rem 0 .7rem}
.ae-card h2{font-size:22px;margin:0 0 .6rem}
.ae-card p{color:#c3c9d3;line-height:1.55;font-size:16px;margin:.4rem 0}
.ae-btn{display:block;width:100%;min-height:52px;margin-top:12px;border:0;border-radius:10px;padding:12px 16px;font:700 16px system-ui,sans-serif;cursor:pointer;background:#3b82f6;color:#fff}
.ae-btn:hover{background:#2563eb}
.ae-btn.sec{background:#1f2937;color:#e5e7eb;border:1px solid #374151}
.ae-btn.perigo{background:#991b1b}
.ae-link{display:block;margin:18px auto 0;background:none;border:0;color:#9ca3af;font-size:14px;text-decoration:underline;cursor:pointer}
.ae-label{display:block;margin-top:14px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#9ca3af}
.ae-input,.ae-select{width:100%;min-height:50px;margin-top:6px;border-radius:9px;border:1px solid #374151;background:#030712;color:#fff;padding:10px 12px;font-size:17px;box-sizing:border-box}
.ae-code{font:800 clamp(44px,13vw,76px)/1 ui-monospace,Consolas,monospace;letter-spacing:.14em;color:#fbbf24;text-align:center;margin:10px 0}
.ae-qr{width:min(320px,78vw);margin:12px auto;background:#fff;padding:10px;border-radius:12px}
.ae-qr svg{display:block;width:100%;height:auto}
.ae-url{font-size:12px;color:#9ca3af;text-align:center;word-break:break-all}
.ae-erro{margin-top:12px;padding:10px 12px;border-left:3px solid #ef4444;background:#2a1111;color:#fecaca;border-radius:0 8px 8px 0}
.ae-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ae-resumo{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.ae-chip{font-size:13px;padding:4px 10px;border-radius:999px;background:#1f2937;color:#e5e7eb}
.ae-lista{margin-top:10px;border:1px solid #1f2937;border-radius:10px;overflow:hidden}
.ae-eq{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:12px 14px;border-bottom:1px solid #1f2937;background:#0b1220}
.ae-eq:last-child{border-bottom:0}
.ae-eq b{font-size:17px}
.ae-eq small{grid-column:1/-1;color:#9ca3af;font-size:13px}
.ae-st{font-size:13px;font-weight:700;padding:3px 9px;border-radius:6px;align-self:start}
.ae-st.aguardando{background:#374151;color:#e5e7eb}.ae-st.andamento{background:#78350f;color:#fde68a}.ae-st.falhou{background:#7f1d1d;color:#fecaca}.ae-st.concluiu{background:#065f46;color:#a7f3d0}
.ae-sec{margin-top:18px;padding-top:14px;border-top:1px solid #1f2937}
.ae-sec h3{margin:0 0 4px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd}
#aeSalaBtn{position:fixed;z-index:1500;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));min-height:48px;padding:0 16px;border:1px solid #374151;border-radius:10px;background:#111827;color:#bfdbfe;font:700 14px system-ui,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.5);cursor:pointer}
#aeSalaBtn.erro{border-color:#ef4444;color:#fecaca}
.ae-fixo{outline:2px solid #fbbf24;outline-offset:1px}
@media (max-width:520px){.ae-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
}
function gate() {
  let el = $('aeGate');
  if (!el) { el = document.createElement('div'); el.id = 'aeGate'; document.body.appendChild(el); }
  el.hidden = false;
  return el;
}
function fecharGate() { const el = $('aeGate'); if (el) el.hidden = true; }
function erro(msg) { return msg ? `<div class="ae-erro">${esc(msg)}</div>` : ''; }

/* ---------- Telas de entrada ---------- */
function menu(msg = '') {
  role = ''; code = '';
  gate().innerHTML = `<div class="ae-shell"><div class="ae-brand">Fisiologia · Operações de sala</div><div class="ae-card">
<h1>${esc(TITULO)}</h1>
<p>O professor abre a sala neste aparelho e projeta o QR. As equipes entram pelo QR ou digitando o código.</p>${erro(msg)}
<button class="ae-btn" id="aeAbrir">Abrir uma sala</button>
<button class="ae-btn sec" id="aeEntrar">Entrar em uma sala</button>
<button class="ae-link" id="aeLivre">Professor: usar sem sala neste aparelho</button>
</div><p style="margin:18px 4px;font-size:13px"><a href="./" style="color:#9ca3af">← Operações de sala</a></p></div>`;
  $('aeAbrir').onclick = () => loginProfessor('sala');
  $('aeEntrar').onclick = () => formEntrar('');
  $('aeLivre').onclick = () => loginProfessor('livre');
}

function formEntrar(c, msg = '') {
  gate().innerHTML = `<div class="ae-shell"><div class="ae-brand">${esc(TITULO)} · Entrar</div><div class="ae-card">
<h2>Entrar na sala</h2>${erro(msg)}
<label class="ae-label" for="aeCodigo">Código da sala</label>
<input class="ae-input" id="aeCodigo" maxlength="6" autocomplete="off" autocapitalize="characters" value="${esc(c)}" style="letter-spacing:.2em;font-weight:700;text-transform:uppercase">
<label class="ae-label" for="aeNome">Nome da equipe</label>
<input class="ae-input" id="aeNome" maxlength="30" autocomplete="off">
<button class="ae-btn" id="aeIr">Entrar</button>
<button class="ae-btn sec" id="aeVoltar">Voltar</button></div></div>`;
  (c ? $('aeNome') : $('aeCodigo')).focus();
  $('aeIr').onclick = entrar;
  $('aeNome').onkeydown = e => { if (e.key === 'Enter') entrar(); };
  $('aeVoltar').onclick = () => { history.replaceState(null, '', location.pathname); menu(); };
}

function mensagemLogin(e) {
  const c = e?.code || '';
  if (c === 'auth/popup-blocked') return 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e toque de novo.';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return 'A janela do Google foi fechada antes de concluir.';
  if (c === 'auth/unauthorized-domain') return 'Este endereço ainda não está autorizado no Firebase (Authentication › Settings › Domínios autorizados).';
  if (c === 'auth/network-request-failed') return 'Sem conexão. Confira a internet e tente de novo.';
  if (c === 'auth/operation-not-allowed') return 'O login com Google não está ativado neste projeto Firebase.';
  return e?.message || 'Não foi possível entrar com o Google.';
}

async function loginProfessor(intencao) {
  let user;
  try {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    user = (await signInWithPopup(auth, p)).user;
  } catch (e) { return menu(mensagemLogin(e)); }
  try {
    const cfg = await getDoc(doc(db, 'config', 'mestres'));
    const lista = cfg.exists() && Array.isArray(cfg.data().emails) ? cfg.data().emails : [];
    if (!lista.includes((user.email || '').trim())) {
      await signOut(auth);
      return menu('Esta conta Google não está autorizada a abrir salas.');
    }
  } catch (e) { await signOut(auth).catch(() => {}); return menu('Não foi possível conferir a autorização: ' + (e?.message || e)); }
  if (intencao === 'livre') { role = ''; fecharGate(); return; }
  await criarSala(user);
}

async function criarSala(user) {
  try {
    let c = '';
    for (let i = 0; i < 5 && !c; i++) { const t = gerar(); if (!(await getDoc(salaRef(t))).exists()) c = t; }
    if (!c) throw new Error('Não foi possível gerar um código livre. Tente de novo.');
    await setDoc(salaRef(c), { lab: LAB, titulo: TITULO, mestreUid: user.uid, ativa: true, criadaEm: Date.now(), caso: '', cronometro: 'livre', tempo: 45 });
    code = c; role = 'mestre'; guardar(c);
    history.replaceState(null, '', location.pathname);
    ouvirMestre();
  } catch (e) { menu('Não foi possível abrir a sala: ' + (e?.message || e)); }
}

async function entrar() {
  const c = ($('aeCodigo').value || '').trim().toUpperCase(), nome = ($('aeNome').value || '').trim().slice(0, 30);
  if (c.length !== 6 || !nome) return formEntrar(c, 'Informe o código de 6 letras e o nome da equipe.');
  $('aeIr').disabled = true; $('aeIr').textContent = 'Entrando…';
  try {
    /* Autenticar antes de ler: a regra de leitura exige sessão, e quem chega
       pelo QR não tem nenhuma. Uma conta Google que não é a dona desta sala
       vira anônima, para a equipe não gravar em nome do professor. */
    let u = auth.currentUser;
    if (!u) u = (await signInAnonymously(auth)).user;
    const snap = await getDoc(salaRef(c));
    if (!snap.exists() || snap.data().ativa !== true) return formEntrar(c, 'Sala não encontrada ou já encerrada.');
    const r = snap.data();
    if (r.lab !== LAB) { location.href = linkDe(c, r.lab); return; }
    if (r.mestreUid === u.uid) { code = c; role = 'mestre'; guardar(c); return ouvirMestre(); }
    if (!u.isAnonymous) { await signOut(auth); u = (await signInAnonymously(auth)).user; }
    const ref = equipeRef(c, u.uid), antes = await getDoc(ref);
    if (antes.exists()) await updateDoc(ref, { nome, atualizadoEmMs: Date.now() });
    else await setDoc(ref, { nome, entrouMs: Date.now(), atualizadoEmMs: Date.now(), status: 'aguardando', fase: 0, caso: '', casoTitulo: '', tentativas: 0, motivo: '' });
    code = c; role = 'equipe'; guardar(c);
    history.replaceState(null, '', location.pathname);
    iniciarEquipe(antes.exists() ? antes.data() : null, nome);
  } catch (e) { formEntrar(c, e?.code === 'auth/admin-restricted-operation' ? 'A entrada anônima não está ativada no Firebase.' : (e?.message || 'Não foi possível entrar.')); }
}

/* Recarregar a página não pode tirar ninguém da sala: a sessão do Firebase
   sobrevive, e o documento da sala diz quem é professor e quem é equipe. */
async function retomar(c) {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    const snap = await getDoc(salaRef(c));
    if (!snap.exists() || snap.data().ativa !== true) { guardar(''); return false; }
    const r = snap.data();
    if (r.lab !== LAB) return false;
    if (r.mestreUid === u.uid) { code = c; role = 'mestre'; ouvirMestre(); return true; }
    const eq = await getDoc(equipeRef(c, u.uid));
    if (!eq.exists()) return false;
    code = c; role = 'equipe'; guardar(c);
    iniciarEquipe(eq.data(), eq.data().nome);
    return true;
  } catch { return false; }
}

/* ---------- Professor ---------- */
function ouvirMestre() {
  unsubRoom?.(); unsubEquipes?.();
  instalarBotao();
  pintarPainel();
  unsubRoom = onSnapshot(salaRef(code), s => { room = s.exists() ? s.data() : null; atualizarPainel(); });
  unsubEquipes = onSnapshot(collection(db, 'salas', code, 'equipes'), s => {
    equipes = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.entrouMs || 0) - (b.entrouMs || 0));
    atualizarPainel();
  }, e => { const l = $('aeLista'); if (l) l.innerHTML = erro('Não foi possível ler as equipes: ' + e.message); });
}

function opcoesCaso() {
  const sel = $('case-select');
  if (!sel) return '';
  return '<option value="">Cada equipe escolhe</option>' + [...sel.querySelectorAll('option')].map(o => `<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('');
}

function pintarPainel() {
  const url = linkDe(code);
  const qr = window.MosaicoQR ? window.MosaicoQR.svg(url, { nivel: 'M', margem: 4, rotulo: 'QR para entrar na sala' }) : `<div style="color:#111;font:800 34px monospace;text-align:center;padding:40px 4px">${esc(code)}</div>`;
  gate().innerHTML = `<div class="ae-shell"><div class="ae-brand">Professor · ${esc(TITULO)}</div><div class="ae-card">
<h2>Sala aberta</h2>
<p>As equipes apontam a câmera para o QR ou digitam o código.</p>
<div class="ae-code">${esc(code)}</div>
<div class="ae-qr">${qr}</div>
<div class="ae-url">${esc(url)}</div>
<div class="ae-sec"><h3>Configuração da sala</h3>
<p style="font-size:14px">Vale para todas as equipes, na hora em que tocarem em Iniciar.</p>
<label class="ae-label" for="aeCfgCaso">Caso</label><select class="ae-select" id="aeCfgCaso">${opcoesCaso()}</select>
<div class="ae-grid"><div><label class="ae-label" for="aeCfgCron">Cronômetro</label><select class="ae-select" id="aeCfgCron"><option value="livre">Cada equipe escolhe</option><option value="off">Sem cronômetro</option><option value="on">Com cronômetro</option></select></div>
<div><label class="ae-label" for="aeCfgTempo">Segundos por fase</label><input class="ae-input" id="aeCfgTempo" type="number" min="10" max="300" value="45"></div></div>
</div>
<div class="ae-sec"><h3>Equipes</h3><div class="ae-resumo" id="aeResumo"></div><div class="ae-lista" id="aeLista"></div></div>
<button class="ae-btn" id="aeVerLab">Ir para o laboratório</button>
<button class="ae-btn perigo" id="aeEncerrar">Encerrar sala</button>
</div></div>`;
  const salvar = async campos => { try { await updateDoc(salaRef(code), campos); } catch (e) { alert('Não foi possível salvar: ' + e.message); } };
  $('aeCfgCaso').onchange = e => salvar({ caso: e.target.value });
  $('aeCfgCron').onchange = e => salvar({ cronometro: e.target.value });
  $('aeCfgTempo').onchange = e => salvar({ tempo: Math.min(300, Math.max(10, parseInt(e.target.value, 10) || 45)) });
  $('aeVerLab').onclick = fecharGate;
  $('aeEncerrar').onclick = encerrar;
  atualizarPainel();
}

const ROTULO = { aguardando: 'Aguardando', andamento: 'Em andamento', falhou: 'Falhou', concluiu: 'Concluiu' };
function atualizarPainel() {
  const b = $('aeSalaBtn'); if (b) b.textContent = 'Sala · ' + code + ' · ' + equipes.length;
  if (room) {
    [['aeCfgCaso', room.caso || ''], ['aeCfgCron', room.cronometro || 'livre'], ['aeCfgTempo', room.tempo || 45]].forEach(([id, v]) => {
      const el = $(id); if (el && document.activeElement !== el) el.value = v;
    });
    if (room.ativa === false) { encerrada('Esta sala foi encerrada.'); return; }
  }
  const lista = $('aeLista'), resumo = $('aeResumo');
  if (!lista) return;
  const n = k => equipes.filter(e => e.status === k).length;
  resumo.innerHTML = `<span class="ae-chip">${equipes.length} equipe(s)</span><span class="ae-chip">${n('andamento')} em andamento</span><span class="ae-chip">${n('concluiu')} concluíram</span><span class="ae-chip">${n('falhou')} falharam</span>`;
  lista.innerHTML = equipes.length ? equipes.map(e => {
    const cad = [1, 2].map(i => (e.fase || 0) >= i ? '🔓' : '🔒').join(' ');
    const det = [e.casoTitulo, e.tentativas ? e.tentativas + ' tentativa(s)' : '', e.status === 'falhou' && e.motivo ? e.motivo : ''].filter(Boolean).join(' · ');
    return `<div class="ae-eq"><b>${esc(e.nome || 'Equipe')}</b><span class="ae-st ${esc(e.status || 'aguardando')}">${cad} ${ROTULO[e.status] || 'Aguardando'}</span>${det ? `<small>${esc(det)}</small>` : ''}</div>`;
  }).join('') : '<div class="ae-eq"><small>Aguardando equipes…</small></div>';
}

async function encerrar() {
  if (!confirm('Encerrar a sala ' + code + '? As equipes deixam de conseguir enviar progresso.')) return;
  try { await updateDoc(salaRef(code), { ativa: false, encerradaEm: Date.now() }); }
  catch (e) { return alert('Não foi possível encerrar: ' + e.message); }
}

function encerrada(msg) {
  unsubRoom?.(); unsubEquipes?.(); unsubRoom = unsubEquipes = null;
  guardar(''); $('aeSalaBtn')?.remove();
  menu(msg);
}

function instalarBotao(erroEnvio = false) {
  let b = $('aeSalaBtn');
  if (!b) {
    b = document.createElement('button'); b.id = 'aeSalaBtn'; b.type = 'button';
    document.body.appendChild(b);
  }
  b.classList.toggle('erro', erroEnvio);
  if (role === 'mestre') { b.textContent = 'Sala · ' + code; b.onclick = () => { gate(); pintarPainel(); }; }
  else { b.onclick = () => alert(erroEnvio ? 'O progresso não chegou ao professor. Confira a internet; o próximo passo tenta de novo.' : 'Sala ' + code); }
}

/* ---------- Equipe ---------- */
function iniciarEquipe(anterior, nome) {
  fecharGate();
  tentativas = anterior?.tentativas || 0;
  instalarBotao(); $('aeSalaBtn').textContent = 'Sala ' + code + ' · ' + nome;
  unsubRoom?.();
  unsubRoom = onSnapshot(salaRef(code), s => {
    room = s.exists() ? s.data() : null;
    if (!room || room.ativa !== true) { encerradaEquipe(); return; }
    aplicarConfig();
  }, () => encerradaEquipe());
  observarLab();
}

function encerradaEquipe() {
  unsubRoom?.(); unsubRoom = null; guardar(''); $('aeSalaBtn')?.remove();
  gate().innerHTML = `<div class="ae-shell"><div class="ae-card"><h2>Sala encerrada</h2><p>O professor encerrou a sala ${esc(code)}. O que a equipe fez até aqui já foi registrado.</p><button class="ae-btn" id="aeMenu">Voltar ao início</button></div></div>`;
  $('aeMenu').onclick = () => menu();
}

/* O professor fixa caso e cronômetro; a equipe vê os campos travados.
   initLabSession libera todo input da página, por isso isto roda de novo
   depois de cada Iniciar. */
function aplicarConfig() {
  if (role !== 'equipe' || !room) return;
  const caso = $('case-select'), cron = $('timer-select'), tempo = $('custom-time');
  if (caso) {
    const fixo = !!room.caso && !!caso.querySelector(`option[value="${CSS.escape(room.caso)}"]`);
    if (fixo) caso.value = room.caso;
    caso.disabled = fixo; caso.classList.toggle('ae-fixo', fixo);
  }
  if (cron) {
    const fixo = room.cronometro === 'on' || room.cronometro === 'off';
    if (fixo) cron.value = room.cronometro;
    cron.disabled = fixo; cron.classList.toggle('ae-fixo', fixo);
    if (tempo) {
      if (room.cronometro === 'on') tempo.value = room.tempo || 45;
      tempo.disabled = room.cronometro === 'on'; tempo.classList.toggle('ae-fixo', room.cronometro === 'on');
    }
    if (typeof window.toggleTimerInput === 'function') window.toggleTimerInput();
  }
}

function estadoDaTela() {
  const aberto = id => $(id)?.classList.contains('unlocked');
  const txt = ($('global-status')?.textContent || '').trim().toUpperCase();
  const status = txt.includes('FALHOU') ? 'falhou' : txt.includes('SUCESSO') ? 'concluiu' : txt.includes('ANDAMENTO') ? 'andamento' : 'aguardando';
  const sel = $('case-select'), opt = sel?.selectedOptions?.[0];
  const box = $('modal-box-content');
  const motivo = status === 'falhou' && box?.classList.contains('failure') ? ($('modal-text')?.textContent || '').replace(/^Diagn[óo]stico[^:]*:\s*/i, '').trim().slice(0, 240) : '';
  return {
    fase: aberto('lock-2') ? 2 : aberto('lock-1') ? 1 : 0,
    status,
    caso: status === 'aguardando' ? '' : (sel?.value || ''),
    casoTitulo: status === 'aguardando' ? '' : (opt?.textContent || '').split(':')[0].trim().slice(0, 60),
    motivo
  };
}

function enviar() {
  clearTimeout(envioTimer);
  envioTimer = setTimeout(async () => {
    if (role !== 'equipe' || !code || !auth.currentUser) return;
    const e = estadoDaTela();
    const chave = JSON.stringify([e, tentativas]);
    if (chave === ultimoEnvio) return;
    const campos = { ...e, tentativas, atualizadoEmMs: Date.now() };
    if (inicioMs) campos.inicioMs = inicioMs;
    campos.fimMs = (e.status === 'concluiu' || e.status === 'falhou') ? Date.now() : null;
    try {
      await updateDoc(equipeRef(code, auth.currentUser.uid), campos);
      ultimoEnvio = chave; instalarBotao(false); $('aeSalaBtn').textContent = 'Sala ' + code;
    } catch (err) {
      /* Não calar: a equipe precisa saber que o professor não está vendo. */
      console.warn('Sala: progresso não enviado', err);
      instalarBotao(true); $('aeSalaBtn').textContent = 'Sala ' + code + ' · sem envio';
    }
  }, 350);
}

let observando = false;
function observarLab() {
  if (observando) return;
  observando = true;
  const init = window.initLabSession;
  if (typeof init === 'function') {
    window.initLabSession = function (...args) {
      aplicarConfig();
      const r = init.apply(this, args);
      if (role === 'equipe') { tentativas += 1; inicioMs = Date.now(); aplicarConfig(); enviar(); }
      return r;
    };
  }
  const mo = new MutationObserver(() => { if (role === 'equipe') enviar(); });
  ['global-status', 'lock-1', 'lock-2', 'modal-text'].forEach(id => {
    const el = $(id); if (el) mo.observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
  });
}

/* ---------- Início ---------- */
async function boot() {
  css();
  gate().innerHTML = '<div class="ae-shell"><div class="ae-card"><p>Carregando a sala…</p></div></div>';
  try { await auth.authStateReady(); } catch {}
  const daUrl = (new URLSearchParams(location.search).get('sala') || '').trim().toUpperCase();
  const alvo = daUrl || guardado();
  if (alvo && await retomar(alvo)) return;
  if (daUrl) return formEntrar(daUrl);
  menu();
}
boot();
