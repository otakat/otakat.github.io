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
  - clockTick-critical / gameTick-critical: every refresh cycle. gameTick events
    only fire while the game is unpaused.
  - clockTick-high / gameTick-high: every 2 cycles (aggregated deltas).
  - clockTick-low / gameTick-low: every 4 cycles (aggregated deltas).
  - tick-fixed-* counterparts fire from the fixed-step timer.

Example subscription:
  eventBus.on('gameTick-high', ({ clockDelta, gameDelta }) => {
    // medium-frequency logic during play
  });
*/

class GlobalClock {
  constructor() {
    this.rafId = null;
    this.logicTimerId = null;
    this.lastClockTime = null;
    this.renderAccumulator = 0;
    this.clockTickCount = 0;
    this.clockHighClockAccum = 0;
    this.clockHighGameAccum = 0;
    this.clockLowClockAccum = 0;
    this.clockLowGameAccum = 0;

    this.gameTickCount = 0;
    this.gameHighClockAccum = 0;
    this.gameHighGameAccum = 0;
    this.gameLowClockAccum = 0;
    this.gameLowGameAccum = 0;

    this.prevPaused = true;
    this.start();
  }

  start() {
    if (this.rafId) this.stop();
    this.lastClockTime = null;
    this.renderAccumulator = 0;
    this.clockTickCount = 0;
    this.clockHighClockAccum = 0;
    this.clockHighGameAccum = 0;
    this.clockLowClockAccum = 0;
    this.clockLowGameAccum = 0;

    this.gameTickCount = 0;
    this.gameHighClockAccum = 0;
    this.gameHighGameAccum = 0;
    this.gameLowClockAccum = 0;
    this.gameLowGameAccum = 0;

    this.prevPaused = true;

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
        this._tick(delta);
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

  _tick(clockDelta) {
    const paused = (typeof isGamePaused === 'function') ? isGamePaused() : false;
    const gameDelta = paused ? 0 : clockDelta * gameState.globalParameters.timeDilation;

    // Clock tick accumulation
    this.clockTickCount += 1;
    this.clockHighClockAccum += clockDelta;
    this.clockLowClockAccum += clockDelta;
    this.clockHighGameAccum += gameDelta;
    this.clockLowGameAccum += gameDelta;

    eventBus.emit('clockTick-critical', { clockDelta });
    if (this.clockTickCount % 2 === 0) {
      eventBus.emit('clockTick-high', {
        clockDelta: this.clockHighClockAccum
      });
      this.clockHighClockAccum = 0;
    }
    if (this.clockTickCount % 4 === 0) {
      eventBus.emit('clockTick-low', {
        clockDelta: this.clockLowClockAccum
      });
      this.clockLowClockAccum = 0;
    }

    // Game tick emission only while unpaused
    if (!paused) {
      this._emitGameTick(clockDelta, gameDelta);
    } else if (!this.prevPaused) {
      // Flush pending game ticks on pause
      this._emitGameTick(0, 0, true);
    }
    this.prevPaused = paused;

    // Update clock in gameState
    const c = gameState.clock;
    c.totalClockTimeAll += clockDelta;
    c.totalClockTimeLoop += clockDelta;
    if (!paused) {
      c.totalGameTimeAll += gameDelta;
      c.totalGameTimeLoop += gameDelta;
      c.unpausedClockTimeAll += clockDelta;
      c.unpausedGameTimeAll += gameDelta;
      c.unpausedClockTimeLoop += clockDelta;
      c.unpausedGameTimeLoop += gameDelta;
    }
  }

  _emitGameTick(clockDelta, gameDelta, force = false) {
    this.gameTickCount += 1;
    this.gameHighClockAccum += clockDelta;
    this.gameHighGameAccum += gameDelta;
    this.gameLowClockAccum += clockDelta;
    this.gameLowGameAccum += gameDelta;

    eventBus.emit('gameTick-critical', { gameDelta });

    if (force || this.gameTickCount % 2 === 0) {
      eventBus.emit('gameTick-high', {
        gameDelta: this.gameHighGameAccum
      });
      this.gameHighGameAccum = 0;
    }

    if (force || this.gameTickCount % 4 === 0) {
      eventBus.emit('gameTick-low', {
        gameDelta: this.gameLowGameAccum
      });
      this.gameLowGameAccum = 0;
    }

    if (force) {
      this.gameTickCount = 0;
    }
  }

  setRefreshHz(refreshHz) {

      if (!refreshHz || refreshHz <= 0) return;
      gameState.globalParameters.refreshHz = refreshHz;

      // Convert Hz → ms per frame
      const msPerFrame = 1000 / refreshHz;

      // Clamp to sensible bounds so it doesn’t blow up
      const ms = Math.max(1, Math.min(msPerFrame, 5000));

      document.documentElement.style.setProperty('--progress-tick-ms', `${ms}ms`);

      console.log('Refresh rate updated to ' + refreshHz);

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
    let fixedTickCount = 0;
    let highClock = 0;
    let highGame = 0;
    let lowClock = 0;
    let lowGame = 0;
    this.logicTimerId = timers.setInterval(() => {
      fixedTickCount += 1;
      highClock += intervalMs;
      highGame += stepMs;
      lowClock += intervalMs;
      lowGame += stepMs;
      eventBus.emit('tick-fixed-critical', { clockDelta: intervalMs, gameDelta: stepMs });
      if (fixedTickCount % 2 === 0) {
        eventBus.emit('tick-fixed-high', { clockDelta: highClock, gameDelta: highGame });
        highClock = 0;
        highGame = 0;
      }
      if (fixedTickCount % 4 === 0) {
        eventBus.emit('tick-fixed-low', { clockDelta: lowClock, gameDelta: lowGame });
        lowClock = 0;
        lowGame = 0;
      }
    }, intervalMs);
  }
}

eventBus.on('clockTick-low', () => {
  const info = document.getElementById('debug-info');
  if (!info) return;

  if (gameState.debugMode) {
    const paused = (typeof isGamePaused === 'function') ? isGamePaused() : false;
    const ticks = window.gameClock?.clockTickCount ?? 0;
    info.textContent =
      `Refresh Hz: ${gameState.globalParameters.refreshHz}\n` +
      `Total Ticks: ${ticks}\n` +
      `Paused: ${paused}`;
  } else {
    info.textContent = '';
  }
});

window.addEventListener('load', () => {
  window.gameClock = new GlobalClock();
});
