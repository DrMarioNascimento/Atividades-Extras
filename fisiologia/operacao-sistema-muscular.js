let activeCase = null;
let timerInterval = null;
let timeLeft = 45;
let timerEnabled = false;
let currentATP = 100;
let missionCompleted = false;

const caseDatabase = {
  clinico1: { title: "Paciente A: Reabilitação de Quadríceps pós-imobilização", desc: "Paciente necessita restaurar a função motora com força exata de <strong>65 N</strong>. Respeite o Princípio do Tamanho de Henneman.", targetForce: 65, tolerance: 3 },
  clinico2: { title: "Paciente B: Controle de Hipertonia de Membro Superior", desc: "Contração controlada de <strong>50 N</strong>, sem saltar para fibras de alto limiar.", targetForce: 50, tolerance: 3 },
  escolar1: { title: "Aluno Atleta 1: Teste de Carga Máxima (Levantamento Terra)", desc: "Força explosiva e sustentada de <strong>85 N</strong>, com recrutamento progressivo.", targetForce: 85, tolerance: 3 },
  escolar2: { title: "Aluno Atleta 2: Otimização para Sprint de Velocidade", desc: "Recrutamento para contração submáxima de <strong>60 N</strong>.", targetForce: 60, tolerance: 3 },
  escolar3: { title: "Aluno C (Inclusão): Miopatia / Fadiga Precoce", desc: "Exigência mecânica leve e segura de <strong>35 N</strong>, evitando fibras rápidas indevidas.", targetForce: 35, tolerance: 2 },
  escolar4: { title: "Aluno D (Inclusão): Paralisia Cerebral Leve / Tônus", desc: "Ajuste milimétrico de frequência e recrutamento para <strong>50 N</strong>.", targetForce: 50, tolerance: 2 }
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
  document.getElementById('p1-objective').innerHTML = '<strong>Cenário Selecionado:</strong> ' + activeCase.title + '<br>' + activeCase.desc + '<br><em>Urgência:</em> ' + (timerEnabled ? ('Cronômetro ativo com limite de <strong>' + timeLeft + 's</strong> por fase!') : 'Modo de análise livre ativado.');
  document.getElementById('slider-t1').value = 0;
  document.getElementById('slider-t2a').value = 0;
  document.getElementById('slider-t2x').value = 0;
  updateRawInputs();
  if (timerEnabled) startTimer(1, () => { if (!missionCompleted) failMission('TEMPO ESGOTADO!'); });
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
  showModal('failure', '🔒', 'Cadeado Fechado: Missão Não Cumprida', '<strong>Diagnóstico Operacional:</strong><br>' + reasonText);
  document.querySelectorAll('input, select, button').forEach(el => {
    if (el.id !== 'case-select' && el.id !== 'timer-select' && el.id !== 'custom-time' && el.id !== 'modal-btn') el.disabled = true;
  });
}
function updateRawInputs() {
  let t1 = parseInt(document.getElementById('slider-t1').value);
  let t2a = parseInt(document.getElementById('slider-t2a').value);
  let t2x = parseInt(document.getElementById('slider-t2x').value);
  document.getElementById('val-t1').innerText = t1;
  document.getElementById('val-t2a').innerText = t2a;
  document.getElementById('val-t2x').innerText = t2x;
  drawCanvasP1(Math.round((t1 * 0.4) + (t2a * 0.7) + (t2x * 1.3)));
}
function drawCanvasP1(force) {
  const canvas = document.getElementById('canvas-p1');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth - 40;
  canvas.height = 140;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let targetY = canvas.height - (activeCase.targetForce / 120) * canvas.height;
  ctx.strokeStyle = '#ef4444'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(canvas.width, targetY); ctx.stroke();
  ctx.setLineDash([]);
  let currentY = canvas.height - (force / 120) * canvas.height;
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, canvas.height); ctx.lineTo(canvas.width, currentY); ctx.stroke();
}
function validatePhase1() {
  clearInterval(timerInterval);
  let t1 = parseInt(document.getElementById('slider-t1').value);
  let t2x = parseInt(document.getElementById('slider-t2x').value);
  let force = Math.round((t1 * 0.4) + (parseInt(document.getElementById('slider-t2a').value) * 0.7) + (t2x * 1.3));
  if (t2x > 25 && t1 < 25) {
    updateATPDisplay(10);
    failMission('Infração do Princípio do Tamanho de Henneman (fibras de alto limiar sem base das lentas).');
  } else if (Math.abs(force - activeCase.targetForce) > activeCase.tolerance) {
    updateATPDisplay(25);
    failMission('A força gerada (' + force + ' N) divergiu do alvo (' + activeCase.targetForce + ' ± ' + activeCase.tolerance + ' N).');
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
  let freq = parseInt(document.getElementById('slider-freq').value);
  document.getElementById('val-freq').innerText = freq;
  let labelEl = document.getElementById('waveform-label');
  if (freq <= 5) labelEl.innerText = 'Abalo Muscular Isolado (Twitch)';
  else if (freq <= 15) labelEl.innerText = 'Somação Temporal (Wave Summation)';
  else if (freq <= 35) labelEl.innerText = 'Tétano Incompleto (Trepidação)';
  else labelEl.innerText = 'Tétano Completo (Platô Fuso Liso)';
  drawClassicCurves(freq);
}
function drawClassicCurves(freq) {
  const canvas = document.getElementById('canvas-p2');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth - 40;
  canvas.height = 140;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.beginPath();
  let baseline = canvas.height - 20;
  let amplitude = 70;
  for (let x = 0; x < canvas.width; x++) {
    let t = x * 0.15;
    let y = baseline;
    if (freq <= 5) {
      let mod = Math.sin(t * (freq * 0.4));
      if (mod > 0.7) y -= Math.pow(mod, 4) * amplitude;
    } else if (freq <= 15) {
      let wave1 = Math.sin(t * (freq * 0.3));
      let wave2 = Math.sin(t * (freq * 0.3) - 1);
      y -= (Math.max(0, wave1) * 0.6 + Math.max(0, wave2) * 0.5) * amplitude;
    } else if (freq <= 35) {
      y -= (amplitude * 0.85 + Math.sin(t * freq) * 12);
    } else {
      y -= (amplitude * 0.95 * Math.min(1, x / 40));
    }
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
function validatePhase2() {
  clearInterval(timerInterval);
  let freq = parseInt(document.getElementById('slider-freq').value);
  if (freq < 38) {
    updateATPDisplay(15);
    failMission('Frequência insuficiente (' + freq + ' Hz). É preciso tétano completo.');
  } else {
    missionCompleted = true;
    document.getElementById('lock-2').className = 'padlock-status unlocked';
    document.getElementById('lock-2').innerText = 'Cadeado Aberto';
    document.getElementById('phase-2-card').style.opacity = '0.6';
    document.getElementById('global-status').innerText = 'Sucesso Total';
    document.getElementById('global-status').style.color = 'var(--success)';
    showModal('success', '🏆', 'Parabéns! Missão Concluída com Sucesso', 'O protocolo para <strong>' + activeCase.title + '</strong> foi validado.<br><br>🔓 <strong>Cadeado Aberto e Caso Salvo!</strong>');
  }
}
