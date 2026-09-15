let activeCase = null;
let timerInterval = null;
let timeLeft = 45;
let timerEnabled = false;
let currentATP = 100;
let missionCompleted = false;

const caseDatabase = {
  clinico1: {
    title: "Paciente A: Cetoacidose e Excitabilidade Cardíaca",
    desc: "<strong>Contexto Clínico:</strong> Alteração eletrolítica severa afetando o platô do potencial de ação miocárdico e os gradientes iônicos de repouso.<br><br><strong>Meta Operacional:</strong> Garantir atividade da ATPase adequada e atingir pico de despolarização exato com controle de repolarização.",
    targetATPase: 75, targetGlut4: 70, targetStim: -55, targetNa: 80, targetK: 75
  },
  clinico2: {
    title: "Paciente B: Neurotoxina e Bloqueio de Canais de Sódio",
    desc: "<strong>Contexto Clínico:</strong> Intoxicação bloqueando a comporta de ativação rápida dos canais de sódio dependentes de voltagem.<br><br><strong>Meta Operacional:</strong> Superar a resistência ajustando condutância correta de sódio para transpor o limiar de -55 mV.",
    targetATPase: 60, targetGlut4: 50, targetStim: -55, targetNa: 85, targetK: 70
  },
  escolar1: {
    title: "Atleta 1: Condução Saltatória e Fibras A-alfa",
    desc: "<strong>Contexto Esportivo:</strong> Análise de fibras motoras mielinizadas de condução rápida (até 111 m/s).<br><br><strong>Meta Operacional:</strong> Ajustar o limiar de disparo e a cinética iônica rápida para máxima eficiência de comando motor.",
    targetATPase: 80, targetGlut4: 60, targetStim: -55, targetNa: 90, targetK: 80
  },
  escolar2: {
    title: "Aluno C (Inclusão): Hiperexcitabilidade de Membrana",
    desc: "<strong>Contexto Inclusivo:</strong> Avaliação pedagógica e eletrofisiológica sobre estabilidade de repouso e controle de limiar.<br><br><strong>Meta Operacional:</strong> Estabilizar o potencial de membrana sem disparos espontâneos indesejados.",
    targetATPase: 65, targetGlut4: 50, targetStim: -55, targetNa: 75, targetK: 70
  }
};

function toggleTimerInput() {
  let mode = document.getElementById('timer-select').value;
  document.getElementById('timer-input-wrapper').style.display = (mode === 'on') ? 'block' : 'none';
}
function updateATPDisplay(val) {
  currentATP = val;
  let bar = document.getElementById('atp-bar');
  let text = document.getElementById('atp-text');
  bar.style.width = val + '%';
  text.innerText = val + '% ' + (val > 50 ? '(Estável)' : val > 20 ? '(Alerta)' : '(Crítico)');
  bar.style.background = val <= 20 ? 'var(--danger)' : (val <= 50 ? 'var(--warning)' : 'var(--success)');
}
function showModal(type, icon, title, text) {
  let modal = document.getElementById('custom-modal');
  let box = document.getElementById('modal-box-content');
  box.className = 'modal-box ' + type;
  document.getElementById('modal-icon').innerText = icon;
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-text').innerHTML = text;
  modal.classList.add('active');
}
function closeModal() { document.getElementById('custom-modal').classList.remove('active'); }
function initLabSession() {
  let caseKey = document.getElementById('case-select').value;
  let timerMode = document.getElementById('timer-select').value;
  activeCase = caseDatabase[caseKey];
  timerEnabled = (timerMode === 'on');
  if (timerEnabled) timeLeft = parseInt(document.getElementById('custom-time').value) || 45;
  missionCompleted = false;
  updateATPDisplay(100);
  document.getElementById('dash-case-name').innerText = activeCase.title.split(':')[0];
  document.getElementById('global-status').innerText = 'Em Andamento';
  document.getElementById('global-status').style.color = 'var(--warning)';
  document.getElementById('phase-1-card').classList.remove('hidden');
  document.getElementById('phase-2-card').classList.add('hidden');
  document.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
  document.getElementById('p1-objective').innerHTML = '<strong>' + activeCase.title + '</strong><br><br>' + activeCase.desc;
  document.getElementById('slider-atpase').value = 50;
  document.getElementById('slider-glut4').value = 50;
  updatePhase1Inputs();
  if (timerEnabled) startTimer(1, () => { if (!missionCompleted) failMission('Tempo esgotado na Fase 1.'); });
  else document.getElementById('timer-box-1').classList.add('hidden');
}
function startTimer(phaseNum, onExpire) {
  clearInterval(timerInterval);
  let timerBox = document.getElementById('timer-box-' + phaseNum);
  let countdownEl = document.getElementById('countdown-' + phaseNum);
  timerBox.classList.remove('hidden');
  countdownEl.innerText = timeLeft;
  let rem = timeLeft;
  timerInterval = setInterval(() => {
    rem--;
    countdownEl.innerText = rem;
    if (rem <= 0) { clearInterval(timerInterval); onExpire(); }
  }, 1000);
}
function failMission(reasonText) {
  clearInterval(timerInterval);
  updateATPDisplay(0);
  document.getElementById('global-status').innerText = 'MISSÃO FALHOU';
  document.getElementById('global-status').style.color = 'var(--danger)';
  showModal('failure', '🔒', 'Cadeado Fechado: Missão Não Cumprida', '<strong>Diagnóstico:</strong><br>' + reasonText);
  document.querySelectorAll('input, select, button').forEach(el => {
    if (!['case-select', 'timer-select', 'custom-time', 'modal-btn'].includes(el.id)) el.disabled = true;
  });
}
function updatePhase1Inputs() {
  let atpase = parseInt(document.getElementById('slider-atpase').value);
  let glut4 = parseInt(document.getElementById('slider-glut4').value);
  document.getElementById('val-atpase').innerText = atpase;
  document.getElementById('val-glut4').innerText = glut4;
  const canvas = document.getElementById('canvas-p1');
  const ctx = canvas.getContext('2d');
  let parentWidth = canvas.parentElement.clientWidth;
  canvas.width = parentWidth > 0 ? parentWidth - 40 : 400;
  canvas.height = 140;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = 0; x < canvas.width; x++) {
    let y = canvas.height - ((atpase * 0.6 + glut4 * 0.4) / 100) * canvas.height + Math.sin(x * 0.1) * 5;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
function validatePhase1() {
  clearInterval(timerInterval);
  let atpase = parseInt(document.getElementById('slider-atpase').value);
  if (Math.abs(atpase - activeCase.targetATPase) > 15) {
    updateATPDisplay(20);
    failMission('Falha na regulação da bomba ATPase e gradientes iônicos basais.');
  } else {
    document.getElementById('lock-1').className = 'padlock-status unlocked';
    document.getElementById('lock-1').innerText = 'Cadeado Aberto';
    document.getElementById('phase-1-card').style.opacity = '0.6';
    document.getElementById('phase-2-card').classList.remove('hidden');
    setTimeout(() => { updatePhase2Preview(); }, 50);
    if (timerEnabled) startTimer(2, () => { if (!missionCompleted) failMission('Tempo esgotado na Fase 2.'); });
  }
}
function updatePhase2Preview() {
  let stim = parseInt(document.getElementById('slider-stim').value);
  let na = parseInt(document.getElementById('slider-na').value);
  let k = parseInt(document.getElementById('slider-k').value);
  document.getElementById('val-stim').innerText = stim;
  document.getElementById('val-na').innerText = na;
  document.getElementById('val-k').innerText = k;
  let labelEl = document.getElementById('waveform-label');
  if (stim < -55) labelEl.innerText = 'Sublimiar (Sem disparo de potencial)';
  else if (stim >= -55 && stim <= -53) labelEl.innerText = 'Limiar atingido (~ -55 mV) - Despolarização ativa';
  else labelEl.innerText = 'Superlimiar - Overshoot alcançado (+32 a +35 mV)';
  const canvas = document.getElementById('canvas-p2');
  const ctx = canvas.getContext('2d');
  let parentWidth = canvas.parentElement.clientWidth;
  canvas.width = parentWidth > 0 ? parentWidth - 40 : 400;
  canvas.height = 140;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let thresholdY = canvas.height - ((-55 - (-90)) / 120) * canvas.height;
  ctx.strokeStyle = '#ef4444'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, thresholdY); ctx.lineTo(canvas.width, thresholdY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.beginPath();
  let baseline = canvas.height - 30;
  for (let x = 0; x < canvas.width; x++) {
    let t = (x / canvas.width) * Math.PI * 2;
    let y = baseline;
    if (stim >= -56) {
      let spike = Math.sin(t) * (na * 1.2);
      if (spike > 0) y -= spike;
    } else {
      y -= Math.max(0, (stim + 70)) * 2;
    }
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
function validatePhase2() {
  clearInterval(timerInterval);
  let stim = parseInt(document.getElementById('slider-stim').value);
  let na = parseInt(document.getElementById('slider-na').value);
  let k = parseInt(document.getElementById('slider-k').value);
  if (Math.abs(stim - activeCase.targetStim) > 3 || na < 70 || k < 60) {
    updateATPDisplay(15);
    failMission('O potencial de ação falhou: estímulo fora do limiar de -55 mV ou condutância iônica inadequada para gerar o overshoot.');
  } else {
    missionCompleted = true;
    document.getElementById('lock-2').className = 'padlock-status unlocked';
    document.getElementById('lock-2').innerText = 'Cadeado Aberto';
    document.getElementById('phase-2-card').style.opacity = '0.6';
    document.getElementById('global-status').innerText = 'Sucesso Total';
    document.getElementById('global-status').style.color = 'var(--success)';
    showModal('success', '🏆', 'Parabéns! Eletrofisiologia Validada', 'O estudo de caso para <strong>' + activeCase.title + '</strong> foi concluído com êxito.<br><br>🔓 <strong>Cadeado Aberto!</strong> Cinética de canais dependentes de voltagem, limiar e repolarização validados.');
  }
}
