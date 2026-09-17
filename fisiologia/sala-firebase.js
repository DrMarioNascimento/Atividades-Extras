import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

/* Sala dos laboratórios de Fisiologia — no formato do Laboratório do
   Pesquisador (Learning-lab/delineamentos): tela inicial com "Entrar na sala"
   e "Módulo do Professor", equipes com nome e emoji, e um painel-telão com a
   grade de equipes e o placar de cadeados da partida. O QR fica num modal.

   O professor entra com o Google (conta conferida em config/mestres); as
   equipes entram sem conta (anônimo) e gravam só o próprio progresso.

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
const CADEADOS = 2;
const EMOJIS = ['🦊', '🐨', '🐸', '🦉', '🐙', '🦁', '🐼', '🐝', '🔬', '🧬', '🫀', '🫁', '🦴', '💪', '⚡', '🧠'];

let code = '', role = '', room = null, equipes = [], unsubRoom = null, unsubEquipes = null;
let tentativas = 0, falhas = 0, inicioMs = 0, ultimoEnvio = '', ultimoStatus = '', envioTimer = null;
let entrada = { codigo: '', avatar: '' };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const salaRef = c => doc(db, 'salas', c);
const equipeRef = (c, uid) => doc(db, 'salas', c, 'equipes', uid);
function gerar() { let s = ''; for (let i = 0; i < 6; i++) s += ALFA[Math.floor(Math.random() * ALFA.length)]; return s; }
function linkDe(c, lab = LAB) { const u = new URL(lab + '.html', location.href); u.searchParams.set('sala', c); return u.toString(); }
function guardar(c) { try { c ? localStorage.setItem(GUARDA, c) : localStorage.removeItem(GUARDA); } catch {} }
function guardado() { try { return localStorage.getItem(GUARDA) || ''; } catch { return ''; } }

function css() {
  if (!document.querySelector('link[data-ae-fontes]')) {
    const f = document.createElement('link');
    f.rel = 'stylesheet'; f.dataset.aeFontes = '1';
    f.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@500;600&display=swap';
    document.head.appendChild(f);
  }
  const st = document.createElement('style');
  st.textContent = `
#aeGate{--ink:#1c2620;--ink-soft:#3b453d;--green-dark:#0f2e24;--green-mid:#1e4a3a;--green-ok:#2c6349;--paper:#f3ede0;--paper-2:#eae1c8;--line:#c9b98c;--gold:#b6893a;--gold-soft:#dcae5b;--gold-dim:#9c7936;--red:#8f3b2e;--display:'Oswald','Arial Narrow',sans-serif;--body:'Lora',Georgia,serif;--mono:'IBM Plex Mono','Courier New',monospace;
  position:fixed;inset:0;z-index:2000;overflow:auto;font-family:var(--body);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1200px 600px at 20% -10%,rgba(182,137,58,.10),transparent 60%),var(--paper)}
#aeGate[hidden]{display:none}
#aeGate *{box-sizing:border-box}
.ae-app{max-width:540px;margin:0 auto;min-height:100%;padding-bottom:32px}
.ae-app.wide{max-width:100%}
.ae-brand{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:22px 16px 20px;background:linear-gradient(180deg,var(--green-dark),var(--green-mid) 65%,var(--green-ok));color:var(--paper);border-bottom:3px solid var(--gold)}
.ae-brand-name{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-soft)}
.ae-brand-title{font-family:var(--display);font-size:1.35rem;font-weight:700;color:var(--paper);line-height:1.2}
.ae-section{padding:12px 16px 20px}
.ae-card{background:linear-gradient(180deg,#fffef9 0%,var(--paper) 55%,var(--paper-2) 100%);border-radius:10px;padding:16px;margin-bottom:12px;border:1.5px solid rgba(15,46,36,.12);box-shadow:0 1px 0 rgba(255,255,255,.8) inset,0 4px 0 rgba(15,46,36,.1),0 10px 22px rgba(15,46,36,.12)}
.ae-card p{font-size:14.5px;margin:0 0 8px}
.ae-eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#7a5721;display:block;margin-bottom:4px}
.ae-muted{color:var(--ink-soft);font-size:13px}
.ae-hero{text-align:center;padding:22px 10px 14px}
.ae-hero h1{font-family:var(--display);font-size:1.75rem;color:var(--green-dark);line-height:1.15;margin:0}
.ae-hero p{font-size:14.5px;color:var(--ink-soft);margin-top:8px}
.ae-actions{display:flex;flex-direction:column;gap:12px;margin-top:18px}
.ae-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.04em;padding:14px 18px;border:none;border-radius:8px;cursor:pointer;transition:transform .1s,box-shadow .1s;text-decoration:none}
.ae-block{width:100%}
.ae-primary{background:linear-gradient(180deg,var(--green-ok) 0%,var(--green-dark) 100%);color:var(--paper);box-shadow:0 1px 0 rgba(255,255,255,.18) inset,0 5px 0 #0a1f18,0 10px 20px rgba(15,46,36,.35)}
.ae-secondary{background:linear-gradient(180deg,#fffef9 0%,var(--paper) 55%,var(--paper-2) 100%);color:var(--green-dark);border:1.5px solid rgba(15,46,36,.2);box-shadow:0 1px 0 rgba(255,255,255,.85) inset,0 4px 0 rgba(15,46,36,.16),0 8px 16px rgba(15,46,36,.12)}
.ae-gold{background:linear-gradient(180deg,var(--gold-soft) 0%,var(--gold) 55%,var(--gold-dim) 100%);color:var(--green-dark);font-weight:700;box-shadow:0 1px 0 rgba(255,255,255,.45) inset,0 5px 0 #7a5a22,0 10px 18px rgba(182,137,58,.35)}
.ae-danger{background:linear-gradient(180deg,#a64a3b 0%,var(--red) 100%);color:#fff5ef;box-shadow:0 5px 0 #5a2219,0 10px 18px rgba(143,59,46,.3)}
.ae-ghost{background:transparent;color:var(--ink-soft);text-decoration:underline;text-underline-offset:3px;padding:8px 4px;font-size:12px;box-shadow:none}
.ae-btn:active{transform:translateY(3px)}
.ae-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.ae-sm{padding:10px 14px;font-size:12.5px}
.ae-code-input{width:100%;padding:14px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:var(--mono);font-size:1.4rem;letter-spacing:.2em;text-align:center;text-transform:uppercase;background:#fff;color:var(--green-dark);font-weight:700}
.ae-input,.ae-select{width:100%;padding:12px;border:1.5px solid var(--line);border-radius:8px;font-size:16px;background:#fff;color:var(--ink);font-family:var(--body)}
.ae-label{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);display:block;margin:12px 0 4px}
.ae-erro{color:var(--red);font-size:13px;text-align:center;margin-top:8px;min-height:18px}
.ae-emoji{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0 4px}
.ae-emoji button{width:46px;height:46px;border-radius:10px;border:1.5px solid var(--line);background:#fffef9;font-size:23px;cursor:pointer;line-height:1}
.ae-emoji button.on{border-color:var(--gold);box-shadow:0 0 0 3px rgba(220,174,91,.45)}
/* Painel-telão */
.ae-live{display:flex;flex-direction:column;gap:14px;min-height:calc(100vh - 92px);padding-bottom:6px}
.ae-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ae-info{display:flex;flex-direction:column;gap:2px}
.ae-count{font-family:var(--mono);font-size:14px;color:var(--green-mid);font-weight:700}
.ae-tb-actions{display:flex;gap:8px;flex-wrap:wrap}
.ae-placar{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ae-pl{border-radius:12px;padding:10px 12px;text-align:center;border:1.5px solid rgba(15,46,36,.14);background:linear-gradient(180deg,#fffef9,var(--paper));box-shadow:0 4px 0 rgba(15,46,36,.1),0 8px 16px rgba(15,46,36,.1)}
.ae-pl b{display:block;font-family:var(--display);font-size:2.2rem;line-height:1.05;color:var(--green-dark)}
.ae-pl span{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
.ae-pl.aberto{border-color:var(--green-ok);background:linear-gradient(180deg,#f3faf6,#d8ebe0)}.ae-pl.aberto b{color:var(--green-ok)}
.ae-pl.fechado{border-color:var(--red);background:linear-gradient(180deg,#fbf1ee,#f0d9d2)}.ae-pl.fechado b{color:var(--red)}
.ae-barra{height:10px;border-radius:99px;background:#e4d6d0;overflow:hidden;border:1px solid rgba(15,46,36,.12)}
.ae-barra i{display:block;height:100%;background:linear-gradient(90deg,var(--green-ok),#4c8266);transition:width .4s}
.ae-grid-wrap{flex:1;min-height:320px;background:linear-gradient(180deg,#fffef9 0%,var(--paper) 100%);border:1.5px solid rgba(15,46,36,.14);border-radius:16px;padding:12px;display:flex;box-shadow:0 1px 0 rgba(255,255,255,.85) inset,0 4px 0 rgba(15,46,36,.1),0 10px 22px rgba(15,46,36,.12)}
.ae-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;width:100%;align-content:start}
.ae-eq{width:100%;min-height:130px;background:linear-gradient(180deg,#f7f5ef 0%,#ebe4d4 100%);border:1.5px solid rgba(15,46,36,.18);border-radius:12px;padding:10px 8px;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;font-family:var(--body);color:var(--ink);box-shadow:0 1px 0 rgba(255,255,255,.95) inset,0 5px 0 rgba(15,46,36,.14),0 10px 18px rgba(15,46,36,.12)}
.ae-eq:active{transform:translateY(3px)}
.ae-eq .av{font-size:26px;line-height:1}
.ae-eq .nm{font-size:13.5px;font-weight:700;color:var(--green-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin-top:4px}
.ae-eq .ph{font-size:11px;color:var(--ink-soft);font-family:var(--mono);max-width:100%;margin-top:2px;line-height:1.3}
.ae-eq .sc{margin-top:auto;padding-top:6px;font-size:1.35rem;letter-spacing:.08em;line-height:1}
.ae-eq.st-andamento{border-color:var(--gold);background:linear-gradient(180deg,#fff9ee 0%,#f3e4c4 100%)}
.ae-eq.st-concluiu{border-color:var(--green-ok);background:linear-gradient(180deg,#f3faf6 0%,#d8ebe0 100%)}
.ae-eq.st-falhou{border-color:var(--red);background:linear-gradient(180deg,#fbf1ee 0%,#f0d9d2 100%)}
.ae-vazia{grid-column:1/-1;text-align:center;padding:28px 16px;color:var(--ink-soft);font-size:15px;border:1.5px dashed rgba(15,46,36,.2);border-radius:12px;background:rgba(255,255,255,.4)}
@media(min-width:900px){
  .ae-live{padding:4px 18px 10px;gap:16px}.ae-grid-wrap{padding:18px;border-radius:20px}
  .ae-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px}
  .ae-eq{min-height:165px;border-radius:14px}.ae-eq .av{font-size:36px}.ae-eq .nm{font-size:15.5px}.ae-eq .ph{font-size:12.5px}.ae-eq .sc{font-size:1.8rem}
  .ae-pl b{font-size:2.8rem}.ae-count{font-size:16px}.ae-brand-title{font-size:1.6rem}
}
@media(min-width:1400px){
  .ae-live{padding:6px 32px 16px}.ae-grid-wrap{padding:24px}
  .ae-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px}
  .ae-eq{min-height:205px;border-radius:18px}.ae-eq .av{font-size:50px}.ae-eq .nm{font-size:20px}.ae-eq .ph{font-size:15px}.ae-eq .sc{font-size:2.4rem}
  .ae-pl b{font-size:3.6rem}.ae-pl span{font-size:13px}.ae-count{font-size:19px}.ae-brand-title{font-size:2rem}.ae-brand-name{font-size:13px}
}
@media(max-width:520px){.ae-pl b{font-size:1.7rem}.ae-pl span{font-size:9.5px}}
/* Modais */
.ae-modal-bg{position:fixed;inset:0;background:rgba(15,46,36,.45);display:flex;align-items:center;justify-content:center;z-index:2100;padding:18px}
.ae-modal{background:linear-gradient(180deg,#fffef9 0%,var(--paper) 100%);border:1.5px solid rgba(15,46,36,.16);border-radius:12px;padding:20px 18px 16px;width:100%;max-width:360px;max-height:calc(100vh - 36px);overflow:auto;box-shadow:0 12px 32px rgba(15,46,36,.22);text-align:center}
.ae-modal h3{font-family:var(--display);font-size:1.2rem;color:var(--green-dark);margin:0 0 6px}
.ae-modal .ae-btn{width:100%;margin-top:8px}
.ae-modal .ae-label,.ae-modal .ae-select,.ae-modal .ae-input{text-align:left}
.ae-codigo{font-family:var(--mono);font-size:2rem;font-weight:700;letter-spacing:.14em;color:var(--green-dark);margin:6px 0 4px}
.ae-status{display:inline-block;margin:2px 0 10px;padding:3px 9px;border-radius:999px;font-family:var(--mono);font-size:10px;letter-spacing:.05em;text-transform:uppercase;background:rgba(44,99,73,.12);color:var(--green-ok);border:1px solid rgba(44,99,73,.25)}
.ae-qr{width:220px;height:220px;margin:4px auto 10px;border-radius:12px;background:#fff;border:1.5px solid var(--line);padding:8px}
.ae-qr svg{display:block;width:100%;height:100%}
.ae-link{font-size:10.5px;color:var(--ink-soft);word-break:break-all;margin:6px 0 4px;font-family:var(--mono);line-height:1.35}
.ae-det{text-align:left;font-size:14.5px;margin-top:10px}
.ae-det div{padding:8px 0;border-bottom:1px solid rgba(15,46,36,.1)}
.ae-det b{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);display:block}
/* Botão flutuante (fora do gate) */
#aeSalaBtn{position:fixed;z-index:1500;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));min-height:46px;padding:0 16px;border:1.5px solid #b6893a;border-radius:10px;background:linear-gradient(180deg,#fffef9,#f3ede0);color:#0f2e24;font:600 13px 'IBM Plex Mono',monospace;box-shadow:0 4px 0 rgba(15,46,36,.25),0 8px 20px rgba(0,0,0,.4);cursor:pointer}
#aeSalaBtn.erro{border-color:#8f3b2e;color:#8f3b2e}
.ae-fixo{outline:2px solid #dcae5b;outline-offset:1px}`;
  document.head.appendChild(st);
}

function gate() {
  let el = $('aeGate');
  if (!el) { el = document.createElement('div'); el.id = 'aeGate'; document.body.appendChild(el); }
  el.hidden = false;
  return el;
}
function fecharGate() { const el = $('aeGate'); if (el) el.hidden = true; }
function marca(nome, titulo) { return `<div class="ae-brand"><div><div class="ae-brand-name">${esc(nome)}</div><div class="ae-brand-title">${esc(titulo)}</div></div></div>`; }
function pintar(html, largo = false) { gate().innerHTML = `<div class="ae-app${largo ? ' wide' : ''}">${html}</div>`; }
function modal(html, id = 'aeModal') {
  fecharModal(id);
  const bg = document.createElement('div');
  bg.className = 'ae-modal-bg'; bg.id = id;
  bg.innerHTML = `<div class="ae-modal" role="dialog" aria-modal="true">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) fecharModal(id); });
  gate().appendChild(bg);
  return bg;
}
function fecharModal(id = 'aeModal') { $(id)?.remove(); }

/* ---------- Início ---------- */
function inicio(msg = '') {
  role = ''; code = '';
  pintar(`${marca('Fisiologia · Operações de sala', 'Laboratório de Fisiologia')}
<div class="ae-section">
  <div class="ae-hero"><h1>${esc(TITULO)}</h1><p>Missão em equipe com casos clínicos, esportivos e de inclusão. Cada fase validada abre um cadeado.</p></div>
  <div class="ae-card"><span class="ae-eyebrow">Como funciona</span><p>O professor abre a sala e projeta o código. Cada equipe entra pelo QR ou digitando o código, escolhe um nome e um emoji e começa a missão.</p></div>
  ${msg ? `<div class="ae-erro">${esc(msg)}</div>` : ''}
  <div class="ae-actions">
    <button class="ae-btn ae-gold ae-block" id="aeEntrar">Entrar na sala</button>
    <button class="ae-btn ae-secondary ae-block" id="aeProf"><span aria-hidden="true">🔒</span><span>Módulo do Professor</span></button>
    <a class="ae-btn ae-ghost" href="./" style="align-self:center">← Operações de sala</a>
  </div>
  <p class="ae-muted" style="margin-top:18px;font-size:11.5px;text-align:center">Simuladores interativos utilizados nas disciplinas de Fisiologia Humana do Prof. Dr. Mário César Nascimento ©</p>
</div>`);
  $('aeEntrar').onclick = () => telaCodigo('');
  $('aeProf').onclick = () => modalProfessor();
}

function modalProfessor(msg = '') {
  modal(`<h3>Módulo do Professor</h3><p class="ae-muted">Área restrita. Entre com a conta Google autorizada.</p>
<div class="ae-erro" id="aeProfErro">${esc(msg)}</div>
<button class="ae-btn ae-primary" id="aeGoogle">Entrar com Google</button>
<button class="ae-btn ae-secondary" id="aeProfCancelar">Cancelar</button>`);
  $('aeGoogle').onclick = loginProfessor;
  $('aeProfCancelar').onclick = () => fecharModal();
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

async function loginProfessor() {
  const btn = $('aeGoogle'); if (btn) { btn.disabled = true; btn.textContent = 'Conferindo…'; }
  let user;
  try {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    user = (await signInWithPopup(auth, p)).user;
  } catch (e) { return modalProfessor(mensagemLogin(e)); }
  try {
    const cfg = await getDoc(doc(db, 'config', 'mestres'));
    const lista = cfg.exists() && Array.isArray(cfg.data().emails) ? cfg.data().emails : [];
    if (!lista.includes((user.email || '').trim())) {
      await signOut(auth);
      return modalProfessor('Esta conta Google não está autorizada.');
    }
  } catch (e) { await signOut(auth).catch(() => {}); return modalProfessor('Não foi possível conferir a autorização: ' + (e?.message || e)); }
  fecharModal();
  telaProfessor(user);
}

function telaProfessor(user, msg = '') {
  pintar(`${marca('Área restrita', 'Módulo do Professor')}
<div class="ae-section">
  <div class="ae-card"><span class="ae-eyebrow">Sessão ao vivo · ${esc(TITULO)}</span><p>Crie uma sessão para a turma. As equipes entram pelo QR Code ou pelo código, e o painel mostra cada equipe e os cadeados abertos e fechados da partida.</p></div>
  ${msg ? `<div class="ae-erro">${esc(msg)}</div>` : ''}
  <div class="ae-actions">
    <button class="ae-btn ae-gold ae-block" id="aeCriar">Criar sessão</button>
    <button class="ae-btn ae-secondary ae-block" id="aeSemSala">Usar o laboratório sem sala</button>
    <button class="ae-btn ae-secondary ae-block" id="aeVoltar">← Voltar ao início</button>
  </div>
</div>`);
  $('aeCriar').onclick = () => criarSala(user);
  $('aeSemSala').onclick = () => { role = ''; fecharGate(); };
  $('aeVoltar').onclick = () => inicio();
}

async function criarSala(user) {
  const b = $('aeCriar'); if (b) { b.disabled = true; b.textContent = 'Criando…'; }
  try {
    let c = '';
    for (let i = 0; i < 5 && !c; i++) { const t = gerar(); if (!(await getDoc(salaRef(t))).exists()) c = t; }
    if (!c) throw new Error('Não foi possível gerar um código livre. Tente de novo.');
    await setDoc(salaRef(c), { lab: LAB, titulo: TITULO, mestreUid: user.uid, ativa: true, criadaEm: Date.now(), caso: '', cronometro: 'livre', tempo: 45 });
    code = c; role = 'mestre'; guardar(c);
    history.replaceState(null, '', location.pathname);
    ouvirMestre(true);
  } catch (e) { telaProfessor(user, 'Não foi possível criar a sessão: ' + (e?.message || e)); }
}

/* ---------- Entrada da equipe ---------- */
function telaCodigo(prefill, msg = '') {
  pintar(`${marca('Equipe', 'Entrar na sala')}
<div class="ae-section">
  <div class="ae-card"><span class="ae-eyebrow">Sessão da aula</span>
    <p>Digite o código que o professor mostrou na sala.</p>
    <input id="aeCodigo" class="ae-code-input" maxlength="6" autocomplete="off" autocapitalize="characters" value="${esc(prefill)}">
    <div class="ae-erro" id="aeCodErro">${esc(msg)}</div>
  </div>
  <div class="ae-actions">
    <button class="ae-btn ae-gold ae-block" id="aeContinuar">Continuar</button>
    <button class="ae-btn ae-secondary ae-block" id="aeVoltar">← Voltar</button>
  </div>
</div>`);
  const inp = $('aeCodigo'); inp.focus();
  inp.onkeydown = e => { if (e.key === 'Enter') conferirCodigo(); };
  $('aeContinuar').onclick = conferirCodigo;
  $('aeVoltar').onclick = () => { history.replaceState(null, '', location.pathname); inicio(); };
}

async function sessaoAnonima() {
  /* Autenticar antes de ler: a regra de leitura exige sessão, e quem chega
     pelo QR não tem nenhuma. */
  return auth.currentUser || (await signInAnonymously(auth)).user;
}

async function conferirCodigo() {
  const c = ($('aeCodigo').value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const err = $('aeCodErro');
  if (c.length !== 6) { err.textContent = 'Digite o código completo (6 caracteres).'; return; }
  err.textContent = 'Verificando…';
  try {
    const u = await sessaoAnonima();
    const snap = await getDoc(salaRef(c));
    if (!snap.exists() || snap.data().ativa !== true) { err.textContent = 'Não há sessão ativa com esse código.'; return; }
    const r = snap.data();
    if (r.lab !== LAB) { location.href = linkDe(c, r.lab); return; }
    if (r.mestreUid === u.uid) { code = c; role = 'mestre'; guardar(c); return ouvirMestre(true); }
    entrada = { codigo: c, avatar: '' };
    telaDados();
  } catch (e) {
    err.textContent = e?.code === 'auth/admin-restricted-operation' ? 'A entrada anônima não está ativada no Firebase.' : 'Erro: ' + (e?.message || 'ao verificar a sala');
  }
}

function telaDados(msg = '') {
  pintar(`${marca('Sala ' + entrada.codigo, 'Quem é a equipe?')}
<div class="ae-section">
  <div class="ae-card"><span class="ae-eyebrow">Identificação</span>
    <p class="ae-muted">O nome e o emoji aparecem no painel do professor.</p>
    <label class="ae-label" for="aeNome">Nome da equipe</label>
    <input id="aeNome" class="ae-input" maxlength="30" autocomplete="off" placeholder="Nome da equipe">
    <label class="ae-label">Emoji</label>
    <div class="ae-emoji">${EMOJIS.map(e => `<button type="button" data-em="${e}" class="${e === entrada.avatar ? 'on' : ''}">${e}</button>`).join('')}</div>
    <div class="ae-erro" id="aeDadosErro">${esc(msg)}</div>
  </div>
  <div class="ae-actions">
    <button class="ae-btn ae-gold ae-block" id="aeComecar">Entrar e começar</button>
    <button class="ae-btn ae-secondary ae-block" id="aeVoltar">← Código</button>
  </div>
</div>`);
  gate().querySelectorAll('.ae-emoji button').forEach(b => b.onclick = () => {
    entrada.avatar = b.dataset.em;
    gate().querySelectorAll('.ae-emoji button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('aeNome').focus();
  $('aeComecar').onclick = entrarEquipe;
  $('aeVoltar').onclick = () => telaCodigo(entrada.codigo);
}

async function entrarEquipe() {
  const nome = ($('aeNome').value || '').trim().slice(0, 30), err = $('aeDadosErro');
  if (nome.length < 2) { err.textContent = 'Digite o nome da equipe (pelo menos 2 letras).'; return; }
  if (!entrada.avatar) { err.textContent = 'Escolha um emoji.'; return; }
  const b = $('aeComecar'); b.disabled = true; b.textContent = 'Entrando…';
  try {
    let u = await sessaoAnonima();
    /* Uma conta Google que não é a dona desta sala vira anônima, para a
       equipe não gravar em nome do professor. */
    if (!u.isAnonymous) { await signOut(auth); u = (await signInAnonymously(auth)).user; }
    const c = entrada.codigo, ref = equipeRef(c, u.uid), antes = await getDoc(ref);
    if (antes.exists()) await updateDoc(ref, { nome, avatar: entrada.avatar, atualizadoEmMs: Date.now() });
    else await setDoc(ref, { nome, avatar: entrada.avatar, entrouMs: Date.now(), atualizadoEmMs: Date.now(), status: 'aguardando', fase: 0, caso: '', casoTitulo: '', tentativas: 0, falhas: 0, motivo: '' });
    code = c; role = 'equipe'; guardar(c);
    history.replaceState(null, '', location.pathname);
    iniciarEquipe({ ...(antes.exists() ? antes.data() : {}), nome, avatar: entrada.avatar });
  } catch (e) {
    b.disabled = false; b.textContent = 'Entrar e começar';
    err.textContent = e?.message || 'Não foi possível entrar.';
  }
}

/* Recarregar a página não pode tirar ninguém da sala: a sessão do Firebase
   sobrevive, e o documento da sala diz quem é professor e quem é equipe. */
async function retomar(c) {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    const snap = await getDoc(salaRef(c));
    if (!snap.exists() || snap.data().ativa !== true) { guardar(''); return false; }
    if (snap.data().lab !== LAB) return false;
    if (snap.data().mestreUid === u.uid) { code = c; role = 'mestre'; ouvirMestre(true); return true; }
    const eq = await getDoc(equipeRef(c, u.uid));
    if (!eq.exists()) return false;
    code = c; role = 'equipe'; guardar(c);
    iniciarEquipe(eq.data());
    return true;
  } catch { return false; }
}

/* ---------- Painel do professor ---------- */
function ouvirMestre(abrirPainel) {
  unsubRoom?.(); unsubEquipes?.();
  instalarBotao();
  if (abrirPainel) painel(); else fecharGate();
  unsubRoom = onSnapshot(salaRef(code), s => {
    room = s.exists() ? s.data() : null;
    if (room && room.ativa === false) return encerrada();
    atualizarPainel();
  });
  unsubEquipes = onSnapshot(collection(db, 'salas', code, 'equipes'), s => {
    equipes = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.entrouMs || 0) - (b.entrouMs || 0));
    atualizarPainel();
  }, e => { const g = $('aeGrade'); if (g) g.innerHTML = `<div class="ae-vazia">Não foi possível ler as equipes: ${esc(e.message)}</div>`; });
}

/* Placar da partida: cada equipe carrega dois cadeados. Aberto é fase
   validada; fechado é o que ainda falta abrir, somando todas as equipes. */
function placar() {
  const total = equipes.length * CADEADOS;
  const abertos = equipes.reduce((s, e) => s + Math.min(CADEADOS, Math.max(0, e.fase || 0)), 0);
  return { total, abertos, fechados: total - abertos, concluiram: equipes.filter(e => e.status === 'concluiu').length };
}

function painel() {
  pintar(`${marca('Sessão ativa · ' + TITULO, 'Painel do Professor')}
<div class="ae-section">
 <div class="ae-live">
  <div class="ae-topbar">
    <div class="ae-info"><span class="ae-eyebrow" style="margin:0">Turma ao vivo · sala ${esc(code)}</span><span class="ae-count" id="aeContagem">0 equipes · conectando…</span></div>
    <div class="ae-tb-actions">
      <button class="ae-btn ae-secondary ae-sm" id="aeBtnQr">Código · QR</button>
      <button class="ae-btn ae-secondary ae-sm" id="aeBtnCfg">Configurar</button>
      <button class="ae-btn ae-ghost ae-sm" id="aeBtnLab">Laboratório →</button>
    </div>
  </div>
  <div class="ae-placar">
    <div class="ae-pl aberto"><b id="aeAbertos">0</b><span>🔓 Cadeados abertos</span></div>
    <div class="ae-pl fechado"><b id="aeFechados">0</b><span>🔒 Cadeados fechados</span></div>
    <div class="ae-pl"><b id="aeConcluiram">0</b><span>🏆 Equipes concluíram</span></div>
  </div>
  <div class="ae-barra" title="Cadeados abertos na partida"><i id="aeBarra" style="width:0%"></i></div>
  <div class="ae-grid-wrap"><div class="ae-grid" id="aeGrade"></div></div>
 </div>
</div>`, true);
  $('aeBtnQr').onclick = modalQr;
  $('aeBtnCfg').onclick = modalConfig;
  $('aeBtnLab').onclick = fecharGate;
  atualizarPainel();
}

const ROTULO = { aguardando: 'Aguardando', andamento: 'Em andamento', falhou: 'Cadeado fechado', concluiu: 'Concluiu' };
function atualizarPainel() {
  const b = $('aeSalaBtn'); if (b && role === 'mestre') b.textContent = '🔒 Painel · ' + code;
  const p = placar();
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('aeContagem', `${equipes.length} equipe${equipes.length === 1 ? '' : 's'} · ao vivo`);
  set('aeAbertos', p.abertos); set('aeFechados', p.fechados); set('aeConcluiram', p.concluiram);
  const barra = $('aeBarra'); if (barra) barra.style.width = (p.total ? Math.round(100 * p.abertos / p.total) : 0) + '%';
  const g = $('aeGrade');
  if (!g) return;
  g.innerHTML = equipes.length ? equipes.map((e, i) => {
    const st = ['andamento', 'concluiu', 'falhou'].includes(e.status) ? e.status : 'entrou';
    const fase = Math.min(CADEADOS, e.fase || 0);
    const cad = '🔓'.repeat(fase) + '🔒'.repeat(CADEADOS - fase);
    const ph = e.status === 'aguardando' || !e.status ? 'Aguardando início' : [e.casoTitulo, ROTULO[e.status]].filter(Boolean).join(' · ');
    return `<button type="button" class="ae-eq st-${st}" data-i="${i}"><div class="av">${esc(e.avatar || '👥')}</div><div class="nm">${esc(e.nome || 'Equipe')}</div><div class="ph">${esc(ph)}</div><div class="sc" aria-label="${fase} de ${CADEADOS} cadeados abertos">${cad}</div></button>`;
  }).join('') : '<div class="ae-vazia">Nenhuma equipe na sala ainda.<br><span style="font-size:13px;opacity:.8">Os cartões aparecem quando alguém entra com o código.</span></div>';
  g.querySelectorAll('.ae-eq').forEach(c => c.onclick = () => modalEquipe(equipes[+c.dataset.i]));
}

function modalQr() {
  const url = linkDe(code);
  const qr = window.MosaicoQR ? window.MosaicoQR.svg(url, { nivel: 'M', margem: 2, rotulo: 'QR para entrar na sala' }) : '';
  modal(`<h3>Código da sala</h3><div class="ae-codigo">${esc(code)}</div><span class="ae-status">Firebase · ao vivo</span>
<div class="ae-qr">${qr}</div>
<p class="ae-muted" style="font-size:12px;margin:0">Apontar a câmera ou digitar o código.</p>
<div class="ae-link">${esc(url)}</div><div class="ae-muted" id="aeCopiado" style="min-height:18px;font-size:12px"></div>
<button class="ae-btn ae-secondary" id="aeCopiar">Copiar link</button>
<button class="ae-btn ae-secondary" id="aeTestar">Testar link</button>
<button class="ae-btn ae-danger" id="aeEncerrar">Encerrar sessão</button>
<button class="ae-btn ae-ghost" id="aeFechar">Fechar</button>`);
  $('aeCopiar').onclick = async () => { try { await navigator.clipboard.writeText(url); $('aeCopiado').textContent = 'Link copiado.'; } catch { $('aeCopiado').textContent = 'Não foi possível copiar; selecione o link acima.'; } };
  $('aeTestar').onclick = () => window.open(url, '_blank');
  $('aeEncerrar').onclick = encerrar;
  $('aeFechar').onclick = () => fecharModal();
}

function modalConfig() {
  const sel = $('case-select');
  const opcoes = '<option value="">Cada equipe escolhe</option>' + (sel ? [...sel.querySelectorAll('option')].map(o => `<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('') : '');
  modal(`<h3>Configurar a partida</h3><p class="ae-muted">Vale para todas as equipes, na hora em que tocarem em Iniciar.</p>
<label class="ae-label" for="aeCfgCaso">Caso</label><select class="ae-select" id="aeCfgCaso">${opcoes}</select>
<label class="ae-label" for="aeCfgCron">Cronômetro</label><select class="ae-select" id="aeCfgCron"><option value="livre">Cada equipe escolhe</option><option value="off">Sem cronômetro</option><option value="on">Com cronômetro</option></select>
<label class="ae-label" for="aeCfgTempo">Segundos por fase</label><input class="ae-input" id="aeCfgTempo" type="number" min="10" max="300">
<div class="ae-erro" id="aeCfgErro"></div>
<button class="ae-btn ae-primary" id="aeCfgSalvar">Salvar</button>
<button class="ae-btn ae-ghost" id="aeCfgFechar">Fechar</button>`);
  $('aeCfgCaso').value = room?.caso || '';
  $('aeCfgCron').value = room?.cronometro || 'livre';
  $('aeCfgTempo').value = room?.tempo || 45;
  $('aeCfgFechar').onclick = () => fecharModal();
  $('aeCfgSalvar').onclick = async () => {
    try {
      await updateDoc(salaRef(code), { caso: $('aeCfgCaso').value, cronometro: $('aeCfgCron').value, tempo: Math.min(300, Math.max(10, parseInt($('aeCfgTempo').value, 10) || 45)) });
      fecharModal();
    } catch (e) { $('aeCfgErro').textContent = 'Não foi possível salvar: ' + e.message; }
  };
}

function modalEquipe(e) {
  if (!e) return;
  const fase = Math.min(CADEADOS, e.fase || 0);
  const linhas = [
    ['Situação', ROTULO[e.status] || 'Aguardando'],
    ['Cadeados', `${fase} aberto(s) · ${CADEADOS - fase} fechado(s)`],
    ['Caso', e.casoTitulo || '—'],
    ['Tentativas', e.tentativas || 0],
    ['Vezes que o cadeado fechou', e.falhas || 0],
    ...(e.motivo ? [['Último diagnóstico', e.motivo]] : [])
  ];
  modal(`<div style="font-size:44px;line-height:1">${esc(e.avatar || '👥')}</div><h3>${esc(e.nome || 'Equipe')}</h3>
<div class="ae-det">${linhas.map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v)}</div>`).join('')}</div>
<button class="ae-btn ae-secondary" id="aeEqFechar">Fechar</button>`);
  $('aeEqFechar').onclick = () => fecharModal();
}

async function encerrar() {
  if (!confirm('Encerrar a sessão ' + code + '? As equipes deixam de enviar progresso.')) return;
  try { await updateDoc(salaRef(code), { ativa: false, encerradaEm: Date.now() }); }
  catch (e) { alert('Não foi possível encerrar: ' + e.message); }
}

function encerrada() {
  unsubRoom?.(); unsubEquipes?.(); unsubRoom = unsubEquipes = null;
  guardar(''); $('aeSalaBtn')?.remove();
  inicio('A sessão ' + code + ' foi encerrada.');
}

function instalarBotao(erroEnvio = false) {
  let b = $('aeSalaBtn');
  if (!b) { b = document.createElement('button'); b.id = 'aeSalaBtn'; b.type = 'button'; document.body.appendChild(b); }
  b.classList.toggle('erro', erroEnvio);
  if (role === 'mestre') { b.textContent = '🔒 Painel · ' + code; b.onclick = painel; }
  else b.onclick = () => alert(erroEnvio ? 'O progresso não chegou ao professor. Confira a internet; o próximo passo tenta de novo.' : 'Sala ' + code);
  return b;
}

/* ---------- Equipe no laboratório ---------- */
let rotuloEquipe = '';
function iniciarEquipe(dados) {
  fecharGate();
  tentativas = dados?.tentativas || 0;
  falhas = dados?.falhas || 0;
  ultimoStatus = dados?.status || '';
  rotuloEquipe = `${dados?.avatar || '👥'} ${dados?.nome || ''} · sala ${code}`;
  instalarBotao().textContent = rotuloEquipe;
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
  role = '';
  pintar(`${marca('Sala ' + code, 'Sessão encerrada')}<div class="ae-section"><div class="ae-card"><p>O professor encerrou a sessão. O que a equipe fez até aqui já foi registrado.</p></div><button class="ae-btn ae-gold ae-block" id="aeInicio">Voltar ao início</button></div>`);
  $('aeInicio').onclick = () => inicio();
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
    /* Cada passagem para "falhou" é um cadeado que fechou; conta uma vez. */
    const novaFalha = e.status === 'falhou' && ultimoStatus !== 'falhou';
    const campos = { ...e, tentativas, falhas: falhas + (novaFalha ? 1 : 0), atualizadoEmMs: Date.now() };
    if (inicioMs) campos.inicioMs = inicioMs;
    campos.fimMs = (e.status === 'concluiu' || e.status === 'falhou') ? Date.now() : null;
    try {
      await updateDoc(equipeRef(code, auth.currentUser.uid), campos);
      ultimoEnvio = chave; ultimoStatus = e.status; falhas = campos.falhas;
      instalarBotao(false).textContent = rotuloEquipe;
    } catch (err) {
      /* Não calar: a equipe precisa saber que o professor não está vendo. */
      console.warn('Sala: progresso não enviado', err);
      instalarBotao(true).textContent = rotuloEquipe + ' · sem envio';
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
      if (role === 'equipe') { tentativas += 1; inicioMs = Date.now(); ultimoStatus = ''; aplicarConfig(); enviar(); }
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
  pintar(`${marca('Fisiologia · Operações de sala', TITULO)}<div class="ae-section"><div class="ae-card"><p>Carregando a sala…</p></div></div>`);
  try { await auth.authStateReady(); } catch {}
  const daUrl = (new URLSearchParams(location.search).get('sala') || '').trim().toUpperCase();
  const alvo = daUrl || guardado();
  if (alvo && await retomar(alvo)) return;
  if (daUrl) return telaCodigo(daUrl);
  inicio();
}
boot();
