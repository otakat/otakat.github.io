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

/*
Event tiers emitted by GlobalClock:
  - heartbeat-critical / tick-critical: every refresh cycle.
  - heartbeat-high / tick-high: every 2 cycles (aggregated deltas).
  - heartbeat-low / tick-low: every 4 cycles (aggregated deltas).
  - tick-fixed-* counterparts fire from the fixed-step timer.

Example subscription:
  eventBus.on('tick-high', ({ gameDelta }) => {
    // medium-frequency logic
  });
*/

class GlobalClock {
  constructor() {
    this.rafId = null;
    this.logicTimerId = null;
    this.lastClockTime = null;
    this.renderAccumulator = 0;
    this.beatCount = 0;
    this.highClockAccum = 0;
    this.highGameAccum = 0;
    this.lowClockAccum = 0;
    this.lowGameAccum = 0;
    this.start();
  }

  start() {
    if (this.rafId) this.stop();
    this.lastClockTime = null;
    this.renderAccumulator = 0;
    this.beatCount = 0;
    this.highClockAccum = 0;
    this.highGameAccum = 0;
    this.lowClockAccum = 0;
    this.lowGameAccum = 0;

    // Fixed-step logic timer
    this._restartLogicTimer();

    const loop = (timestamp) => {
      if (this.lastClockTime === null) {
        this.lastClockTime = timestamp;
      }
      const clockDelta = timestamp - this.lastClockTime;
      this.lastClockTime = timestamp;

      this.renderAccumulator += clockDelta;
      const refreshInterval = 1000 / gameState.globalParameters.refreshHz;
      if (this.renderAccumulator >= refreshInterval) {
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

    this.beatCount += 1;
    this.highClockAccum += clockDelta;
    this.highGameAccum += gameDelta;
    this.lowClockAccum += clockDelta;
    this.lowGameAccum += gameDelta;

    // Emit events
    eventBus.emit('heartbeat-critical', { clockDelta });
    eventBus.emit('tick-critical', { clockDelta, gameDelta });

    if (this.beatCount % 2 === 0) {
      eventBus.emit('heartbeat-high', {
        clockDelta: this.highClockAccum,
        gameDelta: this.highGameAccum,
      });
      eventBus.emit('tick-high', {
        clockDelta: this.highClockAccum,
        gameDelta: this.highGameAccum,
      });
      this.highClockAccum = 0;
      this.highGameAccum = 0;
    }

    if (this.beatCount % 4 === 0) {
      eventBus.emit('heartbeat-low', {
        clockDelta: this.lowClockAccum,
        gameDelta: this.lowGameAccum,
      });
      eventBus.emit('tick-low', {
        clockDelta: this.lowClockAccum,
        gameDelta: this.lowGameAccum,
      });
      this.lowClockAccum = 0;
      this.lowGameAccum = 0;
    }

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

  setRefreshHz(hz) {
    gameState.globalParameters.refreshHz = hz;
    changeGlobalStyle('.progress-bar', 'transition', `width ${Math.max(5, 1000 / hz)}ms linear`);
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
    const stepMs = 1000 / gameState.globalParameters.refreshHz;
    const intervalMs = stepMs / gameState.globalParameters.timeDilation;
    let fixedBeatCount = 0;
    let highClock = 0;
    let highGame = 0;
    let lowClock = 0;
    let lowGame = 0;
    this.logicTimerId = timers.setInterval(() => {
      fixedBeatCount += 1;
      highClock += intervalMs;
      highGame += stepMs;
      lowClock += intervalMs;
      lowGame += stepMs;
      eventBus.emit('tick-fixed-critical', { clockDelta: intervalMs, gameDelta: stepMs });
      if (fixedBeatCount % 2 === 0) {
        eventBus.emit('tick-fixed-high', { clockDelta: highClock, gameDelta: highGame });
        highClock = 0;
        highGame = 0;
      }
      if (fixedBeatCount % 4 === 0) {
        eventBus.emit('tick-fixed-low', { clockDelta: lowClock, gameDelta: lowGame });
        lowClock = 0;
        lowGame = 0;
      }
    }, intervalMs);
  }
}

eventBus.on('heartbeat-low', () => {
  const info = document.getElementById('debug-info');
  if (!info) return;

  if (gameState.debugMode) {
    const paused = (typeof isGamePaused === 'function') ? isGamePaused() : false;
    const beats = window.gameClock?.beatCount ?? 0;
    info.textContent =
      `Refresh Hz: ${gameState.globalParameters.refreshHz}\n` +
      `Total Beats: ${beats}\n` +
      `Paused: ${paused}`;
  } else {
    info.textContent = '';
  }
});

window.addEventListener('load', () => {
  window.gameClock = new GlobalClock();
});
