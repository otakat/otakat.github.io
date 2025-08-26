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

// Listen for each fixed tick
eventBus.on('tick-fixed-critical', ({ gameDelta }) => runGameTick(gameDelta));

// Core game logic each variable game tick
eventBus.on('gameTick-critical', () => {
  processActiveAndQueuedActions();
});

// Medium-frequency UI updates
eventBus.on('clockTick-high', () => {
  Object.values(actionsConstructed).forEach(action => {
    if (action.needsRender === true) {
      action.render();
      action.needsRender = false;
    }
  });
});

eventBus.on('gameTick-high', () => {
  updateTimerUI();
});

// Low-frequency refreshers
eventBus.on('gameTick-low', () => {
  checkTimeWarnings();
});

window.addEventListener('load', () => {
  window.gameClock = new GlobalClock();
});

function runGameTick(stepMs) {
  // Auto pause when no actions remain
  if (gameState.actionsActive.length === 0 && !gameState.pausedReasons.includes(pauseStates.INACTIVE)) {
    addPauseState(pauseStates.INACTIVE);
  } else if (gameState.actionsActive.length > 0 && gameState.pausedReasons.includes(pauseStates.INACTIVE)) {
    deletePauseState(pauseStates.INACTIVE);
  }

  framesTotal += 1;
  if (!isGamePaused()) {
    timeTotal += stepMs;
    gameState.actionsActive.forEach(actionId => {
      actionsConstructed[actionId].step(stepMs);
    });
    processScheduledEvents();
  }
}

function checkTimeWarnings() {
  const fraction = timeRemaining / timeMax;
  if (timeRemaining <= 0 && !gameOver) {
    timeRemaining = 0;
    gameState.timeRemaining = 0;
    showResetPopup();
    return;
  }
  if (!hasPocketWatch) {
    if (fraction <= 0.25 && !timeWarnings.quarter) {
      logPopupCombo('Your vision swims; the world feels less steady.', 'system');
      timeWarnings.quarter = true;
    } else if (fraction <= 0.5 && !timeWarnings.half) {
      logPopupCombo('You feel a strange heaviness in your limbs.', 'system');
      timeWarnings.half = true;
    }
  }
}

function applyPendingTime() {
  timeRemaining -= pendingTimeCost;
  if (timeRemaining < 0) timeRemaining = 0;
  gameState.timeRemaining = timeRemaining;
  pendingTimeCost = 0;
  refreshScheduled = false;
  checkTimeWarnings();
  gameState.timeWarnings = { ...timeWarnings };
  updateTimerUI();
}

function consumeTime(cost) {
  const c = Number(cost) || 0;
  pendingTimeCost += c;
  if (!refreshScheduled) {
    refreshScheduled = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(applyPendingTime);
    } else {
      setTimeout(applyPendingTime, 50);
    }
  }
}


/* ===== Time Dilation API (non-destructive) =====
Lets gameplay and debug stack multiple multipliers.
- Base dilation comes from gameState.globalParameters.timeDilationBase (or timeDilation, else 1).
- Effective dilation = base * product(modifiers).
- If GlobalClock.setTimeDilation exists, we call it; else we set gameState.globalParameters.timeDilation and emit an event.
*/
(function () {
  if (window.TimeDilationAPI) return; // already installed

  function clamp01to100(x, def = 1) {
    const n = Number(x);
    if (!Number.isFinite(n)) return def;
    return Math.min(Math.max(n, 0.05), 100);
  }

  const api = (function () {
    const mods = new Map(); // key -> multiplier (number)

    function getBase() {
      const gp = (window.gameState && gameState.globalParameters) || {};
      if (Number.isFinite(gp.timeDilationBase)) return gp.timeDilationBase;
      if (Number.isFinite(gp.timeDilation)) return gp.timeDilation; // backward compat
      return 1;
    }

    function setBase(x) {
      const clamped = clamp01to100(x, 1);
      if (!window.gameState) window.gameState = { globalParameters: {} };
      if (!gameState.globalParameters) gameState.globalParameters = {};
      gameState.globalParameters.timeDilationBase = clamped;
      return apply();
    }

    function addMod(key, mult) {
      if (!key) return false;
      mods.set(String(key), clamp01to100(mult, 1));
      return apply();
    }

    function removeMod(key) {
      mods.delete(String(key));
      return apply();
    }

    function clearMods() {
      mods.clear();
      return apply();
    }

    function getEffective() {
      const product =
      Array.from(mods.values()).reduce((a, b) => a * b, 1);
      return getBase() * product;
    }

    function apply() {
      const eff = getEffective();

      // Maintain compatibility with legacy global variable if present
      if (typeof timeDilation !== 'undefined') {
        try {
          timeDilation = eff;
        } catch (_e) { /* ignore */ }
      }

      // Prefer GlobalClock API if present
      if (window.gameClock && typeof gameClock.setTimeDilation === 'function') {
        gameClock.setTimeDilation(eff);
      } else {
        // Fallback: set param and emit event so listeners can react
        if (window.gameState && gameState.globalParameters) {
          gameState.globalParameters.timeDilation = eff;
        }
        eventBus.emit('time-dilation-changed', { timeDilation: eff });
      }
      return eff;
    }

    return {
      // public
      setBase, addMod, removeMod, clearMods, getEffective, apply,
      // exposed for debugging/inspection (read-only usage recommended)
      _mods: mods
    };
  })();

  window.TimeDilationAPI = api;

  // Convenience debug hooks (safe no-ops if methods missing)
  if (!window.setTimeDilation) window.setTimeDilation = (x) => api.setBase(x);
  if (!window.addTimeDilationMod) window.addTimeDilationMod = (k, m) => api.addMod(k, m);
  if (!window.removeTimeDilationMod) window.removeTimeDilationMod = (k) => api.removeMod(k);
  if (!window.clearTimeDilationMods) window.clearTimeDilationMods = () => api.clearMods();
  if (!window.setRefreshHz) window.setRefreshHz = (hz) => window.gameClock?.setRefreshHz?.(hz);

  // Optional: lightweight console trace when dilation changes (only attach once)
  if (!window.__td_logger_attached__) {
    eventBus.on('time-dilation-changed', ({ timeDilation }) => {
      if (timeDilation != null) {
        console.debug('[TimeDilation] effective =', timeDilation);
      }
    });
    window.__td_logger_attached__ = true;
  }
})();
