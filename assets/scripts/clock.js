function changeGlobalStyle(selector, property, value) {
  for (let sheet of document.styleSheets) {
    for (let rule of sheet.cssRules) {
      if (rule.selectorText === selector) {
        rule.style[property] = value;
      }
    }
  }
}

class GlobalClock {
  constructor() {
    this.timer = null;
    this.lastClockTime = performance.now();
    this.accumulator = 0;
    this.start();
  }

  start() {
    if (this.timer) this.stop();
    this.lastClockTime = performance.now();
    const intervalMs = 1000 / gameState.globalParameters.renderHz;
    this.timer = setInterval(() => this._beat(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  _beat() {
    const now = performance.now();
    const clockDelta = now - this.lastClockTime; // real-world ms
    this.lastClockTime = now;

    const gameDelta = clockDelta * gameState.globalParameters.timeDilation;

    // Emit events
    document.dispatchEvent(new CustomEvent('heartbeat', { detail: { clockDelta } }));

    // Fixed-step logic accumulator
    const stepMs = 1000 / gameState.globalParameters.logicHz;
    this.accumulator += gameDelta;
    while (this.accumulator >= stepMs) {
      document.dispatchEvent(new CustomEvent('tick-fixed', { detail: { stepMs } }));
      this.accumulator -= stepMs;
    }

    // Variable-step game tick
    document.dispatchEvent(new CustomEvent('tick', { detail: { gameDelta } }));

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
    document.dispatchEvent(new CustomEvent('time-dilation-changed', { detail: { timeDilation: clamped } }));
  }
}

window.addEventListener('load', () => {
  window.gameClock = new GlobalClock();
  document.addEventListener('heartbeat', () => {
    if (gameState.debugMode) console.log('Tick!');
  });
});
