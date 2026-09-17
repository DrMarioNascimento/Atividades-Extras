(function () {
  const L = window.LAB;
  if (!L) return;
  let activeCase = null, timerInterval = null, timeLeft = 45, timerEnabled = false, missionCompleted = false;
  function $(id) { return document.getElementById(id); }
  function sliderValue(id) { return parseInt($(id).value, 10); }
  function updateATPDisplay(val) {
    const bar = $('atp-bar'), text = $('atp-text');
    bar.style.width = val + '%';
    text.innerText = val + '% ' + (val > 50 ? '(Estável)' : val > 20 ? '(Alerta)' : '(Crítico)');
    bar.style.background = val <= 20 ? 'var(--danger)' : (val <= 50 ? 'var(--warning)' : 'var(--success)');
  }
  function showModal(type, icon, title, text) {
    const box = $('modal-box-content');
    box.className = 'modal-box ' + type;
    $('modal-icon').innerText = icon;
    $('modal-title').innerText = title;
    $('modal-text').innerHTML = text;
    $('custom-modal').classList.add('active');
  }
  window.closeModal = function () { $('custom-modal').classList.remove('active'); };
  window.toggleTimerInput = function () {
    $('timer-input-wrapper').style.display = ($('timer-select').value === 'on') ? 'block' : 'none';
  };
  function drawCanvas(phaseIndex) {
    const canvas = $('canvas-p' + (phaseIndex + 1));
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parentW = canvas.parentElement.clientWidth;
    canvas.width = parentW > 0 ? parentW - 40 : 400;
    canvas.height = 140;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const phase = L.phases[phaseIndex];
    const vals = phase.sliders.map(s => sliderValue(s.id));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const mode = phase.canvas || 'wave';
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.beginPath();
    const baseline = canvas.height - 18;
    for (let x = 0; x < canvas.width; x++) {
      const t = x * 0.08; let y = baseline;
      if (mode === 'cardio') {
        const beat = Math.max(0, Math.sin(t * (0.8 + vals[0] / 80)));
        y = baseline - Math.pow(beat, 6) * (40 + vals[1] * 0.4) - 20;
      } else if (mode === 'resp') y = baseline - 35 - Math.sin(t * (0.6 + vals[0] / 90)) * (18 + vals[1] * 0.25);
      else if (mode === 'fick') y = baseline - Math.min(1, x / (canvas.width * 0.7)) * (mean * 0.9) + Math.sin(t) * 3;
      else y = canvas.height - (mean / 100) * (canvas.height - 20) + Math.sin(t) * 4;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  window.updateLabPreview = function (phaseIndex) {
    const phase = L.phases[phaseIndex];
    phase.sliders.forEach(s => { const el = $('val-' + s.id); if (el) el.innerText = sliderValue(s.id); });
    if (phase.status) {
      const label = $('waveform-label');
      if (label) label.innerText = phase.status(phase.sliders.map(s => sliderValue(s.id)));
    }
    drawCanvas(phaseIndex);
  };
  function startTimer(phaseNum, onExpire) {
    clearInterval(timerInterval);
    const timerBox = $('timer-box-' + phaseNum), countdownEl = $('countdown-' + phaseNum);
    timerBox.classList.remove('hidden');
    countdownEl.innerText = timeLeft;
    let rem = timeLeft;
    timerInterval = setInterval(() => {
      rem--; countdownEl.innerText = rem;
      if (rem <= 0) { clearInterval(timerInterval); onExpire(); }
    }, 1000);
  }
  function failMission(reasonText) {
    clearInterval(timerInterval);
    updateATPDisplay(0);
    $('global-status').innerText = 'MISSÃO FALHOU';
    $('global-status').style.color = 'var(--danger)';
    showModal('failure', '🔒', 'Cadeado Fechado: Missão Não Cumprida', '<strong>Diagnóstico:</strong><br>' + reasonText);
    document.querySelectorAll('input, select, button').forEach(el => {
      if (!['case-select', 'timer-select', 'custom-time', 'modal-btn'].includes(el.id)) el.disabled = true;
    });
  }
  function checkPhase(phaseIndex) {
    const phase = L.phases[phaseIndex];
    const tol = activeCase.tolerance || 12;
    for (const s of phase.sliders) {
      const target = activeCase.targets[s.id];
      if (typeof target !== 'number') continue;
      if (Math.abs(sliderValue(s.id) - target) > tol) {
        return 'O ajuste de ' + s.short + ' ficou fora da faixa exigida pelo caso (' + target + ' ± ' + tol + ').';
      }
    }
    const vals = {};
    L.phases.forEach(ph => ph.sliders.forEach(s => { vals[s.id] = sliderValue(s.id); }));
    if (typeof L.consistency === 'function') {
      const msg = L.consistency(phaseIndex, vals, activeCase);
      if (msg) return msg;
    }
    return null;
  }
  window.initLabSession = function () {
    activeCase = L.cases[$('case-select').value];
    timerEnabled = $('timer-select').value === 'on';
    if (timerEnabled) timeLeft = parseInt($('custom-time').value, 10) || 45;
    missionCompleted = false;
    updateATPDisplay(100);
    $('dash-case-name').innerText = activeCase.title.split(':')[0];
    $('global-status').innerText = 'Em Andamento';
    $('global-status').style.color = 'var(--warning)';
    $('phase-1-card').classList.remove('hidden');
    $('phase-2-card').classList.add('hidden');
    $('phase-1-card').style.opacity = '1';
    $('phase-2-card').style.opacity = '1';
    $('lock-1').className = 'padlock-status locked'; $('lock-1').innerText = 'Cadeado Fechado';
    $('lock-2').className = 'padlock-status locked'; $('lock-2').innerText = 'Cadeado Fechado';
    document.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
    $('p1-objective').innerHTML = '<strong>' + activeCase.title + '</strong><br><br>' + activeCase.desc + '<br><br><em>Urgência:</em> ' + (timerEnabled ? ('Cronômetro ativo com <strong>' + timeLeft + 's</strong> por fase.') : 'Modo de análise livre ativado.');
    L.phases.forEach(phase => phase.sliders.forEach(s => { $(s.id).value = s.value; }));
    updateLabPreview(0);
    if (timerEnabled) startTimer(1, () => { if (!missionCompleted) failMission('Tempo esgotado na Fase 1.'); });
    else $('timer-box-1').classList.add('hidden');
  };
  window.validatePhase1 = function () {
    clearInterval(timerInterval);
    const err = checkPhase(0);
    if (err) { updateATPDisplay(20); failMission(err); return; }
    $('lock-1').className = 'padlock-status unlocked'; $('lock-1').innerText = 'Cadeado Aberto';
    $('phase-1-card').style.opacity = '0.6';
    $('phase-2-card').classList.remove('hidden');
    setTimeout(() => updateLabPreview(1), 40);
    if (timerEnabled) startTimer(2, () => { if (!missionCompleted) failMission('Tempo esgotado na Fase 2.'); });
  };
  window.validatePhase2 = function () {
    clearInterval(timerInterval);
    const err = checkPhase(1);
    if (err) { updateATPDisplay(15); failMission(err); return; }
    missionCompleted = true;
    $('lock-2').className = 'padlock-status unlocked'; $('lock-2').innerText = 'Cadeado Aberto';
    $('phase-2-card').style.opacity = '0.6';
    $('global-status').innerText = 'Sucesso Total';
    $('global-status').style.color = 'var(--success)';
    showModal('success', '🏆', 'Parabéns! Missão concluída', 'O estudo de caso para <strong>' + activeCase.title + '</strong> foi validado.<br><br>🔓 <strong>Cadeado Aberto e Caso Salvo!</strong>');
  };
})();
