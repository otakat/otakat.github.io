function changeGlobalStyle(selector, property, value) {
  for (let sheet of document.styleSheets) {
    // Skip cross-origin stylesheets to avoid security errors
    if (sheet.href && new URL(sheet.href).origin !== window.location.origin) {
      continue;
    }
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (e) {
      // Accessing cssRules can throw if the sheet is not accessible
      continue;
    }
    for (let rule of rules) {
      if (rule.selectorText === selector) {
        rule.style[property] = value;
      }
    }
  }
}

class GlobalClock {
  constructor() {
    this.timerId = null;
    this.lastClockTime = performance.now();
    this.accumulator = 0;
    this.start();
  }

  start() {
    if (this.timerId) this.stop();
    this.lastClockTime = performance.now();
    const intervalMs = 1000 / gameState.globalParameters.renderHz;
    const timers = window.workerTimers || window;
    this.timerId = timers.setInterval(() => this._beat(), intervalMs);
  }

  stop() {
    if (this.timerId) {
      const timers = window.workerTimers || window;
      timers.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  _beat() {
    const now = performance.now();
    const clockDelta = now - this.lastClockTime; // real-world ms
    this.lastClockTime = now;

    const gameDelta = clockDelta * gameState.globalParameters.timeDilation;

    // Emit events
    eventBus.emit('heartbeat', { clockDelta });

    // Fixed-step logic accumulator
    const stepMs = 1000 / gameState.globalParameters.logicHz;
    this.accumulator += gameDelta;
    while (this.accumulator >= stepMs) {
      eventBus.emit('tick-fixed', { stepMs });
      this.accumulator -= stepMs;
    }

    // Variable-step game tick
    eventBus.emit('tick', { gameDelta });

    // Update clock in gameState
    const paused = (typeof isGamePaused === 'function') ? isGamePaused() : false;
    const c = gameState.clock;
    c.totalClockTimeAll += clockDelta;
    c.totalGameTimeAll += gameDelta;
    c.totalClockTimeLoop += clockDelta;
    c.totalGameTimeLoop += gameDelta;
    if (!paused) {
      c.unpausedClockTimeAll += clockDelta;
      c.unpausedGameTimeAll += gameDelta;
      c.unpausedClockTimeLoop += clockDelta;
      c.unpausedGameTimeLoop += gameDelta;
    }
  }

  setRenderHz(hz) {
    gameState.globalParameters.renderHz = hz;
    this.start();
    changeGlobalStyle('.progress-bar', 'transition', `width ${Math.max(5, 1000 / hz)}ms linear`);
  }

  setLogicHz(hz) {
    gameState.globalParameters.logicHz = hz;
  }

  setTimeDilation(multiplier) {
    const clamped = Math.min(Math.max(multiplier, 0.05), 100);
    gameState.globalParameters.timeDilation = clamped;
    eventBus.emit('time-dilation-changed', { timeDilation: clamped });
  }
}

let totalTicks = 0;

eventBus.on('heartbeat', () => {
  totalTicks += 1;
  const info = document.getElementById('debug-info');
  if (!info) return;

  if (gameState.debugMode) {
    const paused = (typeof isGamePaused === 'function') ? isGamePaused() : false;
    info.textContent =
      `Render Hz: ${gameState.globalParameters.renderHz}\n` +
      `Logic Hz: ${gameState.globalParameters.logicHz}\n` +
      `Total Ticks: ${totalTicks}\n` +
      `Paused: ${paused}`;
  } else {
    info.textContent = '';
  }
});

window.addEventListener('load', () => {
  window.gameClock = new GlobalClock();
  eventBus.on('heartbeat', () => {
    if (gameState.debugMode) console.log('Tick!');
  });
});
