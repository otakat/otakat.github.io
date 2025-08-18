(function(){
  const timerEl = document.getElementById('loop-timer');
  if(!timerEl) return;
  const textEl = timerEl.querySelector('#loop-time-text');
  const arcEl = timerEl.querySelector('.arc-progress');
  const imgEl = timerEl.querySelector('.timer-bg');

  if (imgEl && imgEl.dataset.localSrc) {
    const test = new Image();
    test.onload = () => { imgEl.src = imgEl.dataset.localSrc; };
    test.src = imgEl.dataset.localSrc;
  }

  let TOTAL = 10 * 60 * 1000;
  const WARN_MS = 60_000;
  const CRIT_MS = 10_000;

  window.initLoopTimer = function(totalMs){
    if (Number.isFinite(totalMs) && totalMs > 0) TOTAL = totalMs;
    timerEl.classList.remove('warn','critical');
    if (arcEl) arcEl.style.strokeDashoffset = '0';
    updateLoopTimer(TOTAL);
  };

  window.updateLoopTimer = function(remainingMs){
    const rem = Math.max(0, Math.min(remainingMs, TOTAL));
    const pct = (rem / TOTAL) * 100;
    if (arcEl) arcEl.style.strokeDashoffset = String(100 - pct);
    if (textEl) textEl.textContent = formatMMSS(rem);
    timerEl.classList.toggle('warn', rem <= WARN_MS && rem > CRIT_MS);
    timerEl.classList.toggle('critical', rem <= CRIT_MS && rem > 0);
  };

  function formatMMSS(ms){
    const t = Math.max(0, Math.floor(ms/1000));
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
})();
