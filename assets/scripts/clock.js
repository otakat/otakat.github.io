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
    this.rafId = null;
    this.logicTimerId = null;
    this.lastClockTime = null;
    this.renderAccumulator = 0;
    this.start();
  }

  start() {
    if (this.rafId) this.stop();
    this.lastClockTime = null;
    this.renderAccumulator = 0;

    // Fixed-step logic timer
    this._restartLogicTimer();

    const loop = (timestamp) => {
      if (this.lastClockTime === null) {
        this.lastClockTime = timestamp;
      }
      const clockDelta = timestamp - this.lastClockTime;
      this.lastClockTime = timestamp;

      this.renderAccumulator += clockDelta;
      const renderInterval = 1000 / gameState.globalParameters.renderHz;
      if (this.renderAccumulator >= renderInterval) {
        const delta = this.renderAccumulator;
        this.renderAccumulator = 0;
        this._beat(delta);
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.logicTimerId) {
      const timers = window.workerTimers || window;
      timers.clearInterval(this.logicTimerId);
      this.logicTimerId = null;
    }
  }

  _beat(clockDelta) {
    const gameDelta = clockDelta * gameState.globalParameters.timeDilation;

    // Emit events
    eventBus.emit('heartbeat', { clockDelta });

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
    changeGlobalStyle('.progress-bar', 'transition', `width ${Math.max(5, 1000 / hz)}ms linear`);
  }

  setLogicHz(hz) {
    gameState.globalParameters.logicHz = hz;
    this._restartLogicTimer();
  }

  setTimeDilation(multiplier) {
    const clamped = Math.min(Math.max(multiplier, 0.05), 100);
    gameState.globalParameters.timeDilation = clamped;
    eventBus.emit('time-dilation-changed', { timeDilation: clamped });
    this._restartLogicTimer();
  }

  _restartLogicTimer() {
    if (this.logicTimerId) {
      const timers = window.workerTimers || window;
      timers.clearInterval(this.logicTimerId);
    }
    const timers = window.workerTimers || window;
    const stepMs = 1000 / gameState.globalParameters.logicHz;
    const intervalMs = stepMs / gameState.globalParameters.timeDilation;
    this.logicTimerId = timers.setInterval(() => {
      eventBus.emit('tick-fixed', { stepMs });
    }, intervalMs);
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
//   eventBus.on('heartbeat', () => {
//     if (gameState.debugMode) console.log('Tick!');
//   });
});
