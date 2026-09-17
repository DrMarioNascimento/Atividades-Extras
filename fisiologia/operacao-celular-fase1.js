let activeCase = null;
let timerInterval = null;
let timeLeft = 45;
let timerEnabled = false;
let currentATP = 100;
let missionCompleted = false;

const caseDatabase = {
  clinico1: { title: "Paciente A: Cetoacidose em DM1 e Captação de Glicose", desc: "<strong>Contexto Clínico:</strong> Paciente jovem com Diabetes Mellitus Tipo 1 internado com hiperglicemia e falha na captação tecidual de glicose.<br><br><strong>Meta Operacional (Fase 1):</strong> Calibrar a translocação do GLUT4 e a atividade da bomba Na+/K+-ATPase.", targetATPase: 70, targetGlut4: 75, targetOsm: 50, targetStim: -55, targetNa: 80 },
  clinico2: { title: "Paciente B: Desidratação Grave e Osmolaridade Plasmática", desc: "<strong>Contexto Clínico:</strong> Atleta hospitalizado por desidratação severa com alteração nos compartimentos de líquidos corporais.<br><br><strong>Meta Operacional (Fase 1):</strong> Ajustar a permeabilidade osmótica e o gradiente iônico.", targetATPase: 60, targetGlut4: 50, targetOsm: 80, targetStim: -55, targetNa: 75 },
  escolar1: { title: "Aluno Atleta 1: Exaustão e Falha na Bomba Na+/K+", desc: "<strong>Contexto Esportivo:</strong> Queda de rendimento e cãibras após exercício intenso, refletindo fadiga nos gradientes iônicos.<br><br><strong>Meta Operacional (Fase 1):</strong> Otimizar a ATPase para restaurar sódio e potássio.", targetATPase: 90, targetGlut4: 60, targetOsm: 50, targetStim: -55, targetNa: 85 },
  escolar2: { title: "Aluno Atleta 2: Sprint Curto e Limiar de Excitabilidade", desc: "<strong>Contexto Esportivo:</strong> Avaliação do disparo de potenciais em fibras motoras rápidas.<br><br><strong>Meta Operacional (Fase 2):</strong> Atingir o limiar de -55 mV e a condutância correta de sódio.", targetATPase: 60, targetGlut4: 50, targetOsm: 50, targetStim: -55, targetNa: 85 },
  escolar3: { title: "Aluno C (Inclusão): Termorregulação e Transporte de Íons", desc: "<strong>Contexto Inclusivo:</strong> Transporte epitelial de íons e regulação de fluidos.<br><br><strong>Meta Operacional:</strong> Garantir balanço de permeabilidade e estabilidade iônica.", targetATPase: 50, targetGlut4: 40, targetOsm: 60, targetStim: -55, targetNa: 70 },
  escolar4: { title: "Aluno D (Inclusão): Epilepsia Leve / Modulação de Canais", desc: "<strong>Contexto Inclusivo:</strong> Estabilidade do potencial de repouso e controle de descargas.<br><br><strong>Meta Operacional (Fase 2):</strong> Modular o limiar e evitar disparos espontâneos.", targetATPase: 60, targetGlut4: 50, targetOsm: 50, targetStim: -55, targetNa: 75 }
};

function toggleTimerInput() {
  document.getElementById('timer-input-wrapper').style.display = (document.getElementById('timer-select').value === 'on') ? 'block' : 'none';
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
  let box = document.getElementById('modal-box-content');
  box.className = 'modal-box ' + type;
  document.getElementById('modal-icon').innerText = icon;
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-text').innerHTML = text;
  document.getElementById('custom-modal').classList.add('active');
}
function closeModal() { document.getElementById('custom-modal').classList.remove('active'); }
function initLabSession() {
  activeCase = caseDatabase[document.getElementById('case-select').value];
  timerEnabled = document.getElementById('timer-select').value === 'on';
  if (timerEnabled) timeLeft = parseInt(document.getElementById('custom-time').value) || 45;
  missionCompleted = false;
  updateATPDisplay(100);
  document.getElementById('dash-case-name').innerText = activeCase.title.split(':')[0];
  document.getElementById('global-status').innerText = 'Em Andamento';
  document.getElementById('global-status').style.color = 'var(--warning)';
  document.getElementById('phase-1-card').classList.remove('hidden');
  document.getElementById('phase-2-card').classList.add('hidden');
  document.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
  document.getElementById('p1-objective').innerHTML = '<strong>' + activeCase.title + '</strong><br><br>' + activeCase.desc + '<br><br><em>⏱️ Urgência:</em> ' + (timerEnabled ? ('Cronômetro ativo com limite de <strong>' + timeLeft + 's</strong> por fase.') : 'Modo de análise livre ativado.');
  document.getElementById('slider-atpase').value = 50;
  document.getElementById('slider-glut4').value = 50;
  document.getElementById('slider-osm').value = 50;
  updatePhase1Inputs();
  if (timerEnabled) startTimer(1, () => { if (!missionCompleted) failMission('TEMPO ESGOTADO na regulação celular.'); });
  else document.getElementById('timer-box-1').classList.add('hidden');
}
function startTimer(phaseNum, onExpire) {
  clearInterval(timerInterval);
  let timerBox = document.getElementById('timer-box-' + phaseNum);
  let countdownEl = document.getElementById('countdown-' + phaseNum);
  timerBox.classList.remove('hidden');
  countdownEl.innerText = timeLeft;
  let currentRemaining = timeLeft;
  timerInterval = setInterval(() => {
    currentRemaining--;
    countdownEl.innerText = currentRemaining;
    if (currentRemaining <= 0) { clearInterval(timerInterval); onExpire(); }
  }, 1000);
}
function failMission(reasonText) {
  clearInterval(timerInterval);
  updateATPDisplay(0);
  document.getElementById('global-status').innerText = 'MISSÃO FALHOU';
  document.getElementById('global-status').style.color = 'var(--danger)';
  showModal('failure', '🔒', 'Cadeado Fechado: Missão Não Cumprida', '<strong>Diagnóstico Fisiológico:</strong><br>' + reasonText);
  document.querySelectorAll('input, select, button').forEach(el => {
    if (el.id !== 'case-select' && el.id !== 'timer-select' && el.id !== 'custom-time' && el.id !== 'modal-btn') el.disabled = true;
  });
}
function updatePhase1Inputs() {
  let atpase = parseInt(document.getElementById('slider-atpase').value);
  let glut4 = parseInt(document.getElementById('slider-glut4').value);
  let osm = parseInt(document.getElementById('slider-osm').value);
  document.getElementById('val-atpase').innerText = atpase;
  document.getElementById('val-glut4').innerText = glut4;
  document.getElementById('val-osm').innerText = osm;
  drawCanvasP1(atpase, glut4);
}
function drawCanvasP1(atpase, glut4) {
  const canvas = document.getElementById('canvas-p1');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth - 40;
  canvas.height = 140;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let targetY = canvas.height - (activeCase.targetATPase / 100) * canvas.height;
  ctx.strokeStyle = '#ef4444'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(canvas.width, targetY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = 0; x < canvas.width; x++) {
    let t = x * 0.1;
    let y = canvas.height - ((atpase * 0.6 + glut4 * 0.4) / 100) * canvas.height + Math.sin(t) * 5;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
function validatePhase1() {
  clearInterval(timerInterval);
  let atpase = parseInt(document.getElementById('slider-atpase').value);
  let glut4 = parseInt(document.getElementById('slider-glut4').value);
  let osm = parseInt(document.getElementById('slider-osm').value);
  if (Math.abs(atpase - activeCase.targetATPase) > 12 || Math.abs(glut4 - activeCase.targetGlut4) > 12 || Math.abs(osm - activeCase.targetOsm) > 12) {
    updateATPDisplay(20);
    failMission('Desequilíbrio crítico nos gradientes iônicos, na osmolaridade ou na translocação de GLUT4 exigida pelo protocolo.');
  } else {
    document.getElementById('lock-1').className = 'padlock-status unlocked';
    document.getElementById('lock-1').innerText = 'Cadeado Aberto';
    document.getElementById('phase-1-card').style.opacity = '0.6';
    document.getElementById('phase-2-card').classList.remove('hidden');
    updatePhase2Preview();
    if (timerEnabled) startTimer(2, () => { if (!missionCompleted) failMission('TEMPO ESGOTADO na Fase 2.'); });
  }
}
function updatePhase2Preview() {
  let stim = parseInt(document.getElementById('slider-stim').value);
  let na = parseInt(document.getElementById('slider-na').value);
  document.getElementById('val-stim').innerText = stim;
  document.getElementById('val-na').innerText = na;
  let labelEl = document.getElementById('waveform-label');
  if (stim < -55) labelEl.innerText = 'Sublimiar (Sem Disparo de Potencial)';
  else if (stim >= -55 && stim <= -53) labelEl.innerText = 'Atingiu o Limiar Exato (-55 mV) - Despolarização Iniciada';
  else labelEl.innerText = 'Superlimiar - Descarga Eletrofisiológica Ativa';
  drawActionPotentialCurve(stim, na);
}
function drawActionPotentialCurve(stim, na) {
  const canvas = document.getElementById('canvas-p2');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth - 40;
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
      let spike = Math.sin(t) * (na * 1.1);
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
  if (Math.abs(stim - activeCase.targetStim) > 3 || na < 65) {
    updateATPDisplay(15);
    failMission('Falha no disparo do potencial de ação. O estímulo não alcançou o limiar (-55 mV) ou a condutância de sódio foi insuficiente.');
  } else {
    missionCompleted = true;
    document.getElementById('lock-2').className = 'padlock-status unlocked';
    document.getElementById('lock-2').innerText = 'Cadeado Aberto';
    document.getElementById('phase-2-card').style.opacity = '0.6';
    document.getElementById('global-status').innerText = 'Sucesso Total';
    document.getElementById('global-status').style.color = 'var(--success)';
    showModal('success', '🏆', 'Parabéns! Fisiologia Celular Reestabelecida', 'O estudo de caso para <strong>' + activeCase.title + '</strong> foi validado com êxito.<br><br>🔓 <strong>Cadeado Aberto e Caso Salvo!</strong>');
  }
}
