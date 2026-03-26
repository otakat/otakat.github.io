function syncTimeState() {
  gameState.timeRemainingMs = timeRemainingMs;
  gameState.timeMaxMs = timeMaxMs;
  gameState.timeRemaining = timeRemainingMs / 1000;
  gameState.timeMax = timeMaxMs / 1000;
}

function setLoopTimeMs(remainingMs, maxMs = timeMaxMs) {
  timeMaxMs = Math.max(0, Number(maxMs) || 0);
  timeRemainingMs = Math.max(0, Math.min(timeMaxMs, Number(remainingMs) || 0));
  syncTimeState();
}

function spendLoopTime(stepMs) {
  const spend = Math.max(0, Number(stepMs) || 0);
  if (spend <= 0) return 0;

  const applied = Math.min(spend, timeRemainingMs);
  timeRemainingMs -= applied;
  syncTimeState();
  return applied;
}

function getTimeRemainingSeconds() {
  return timeRemainingMs / 1000;
}

function getTimeMaxSeconds() {
  return timeMaxMs / 1000;
}

class ClockEngine {
  constructor() {
    this.rafId = null;
    this.lastFrameTime = null;
    this.accumulatorMs = 0;
    this.tickCount = 0;
    this.lastRawDeltaMs = 0;
    this.lastGameDeltaMs = 0;
    this.lastStepCount = 0;
    this.smoothedFps = 0;
    this.boundFrame = this.frame.bind(this);
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    this.stop();
    this.resetFrameTime();
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    this.rafId = requestAnimationFrame(this.boundFrame);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
  }

  resetFrameTime() {
    this.lastFrameTime = null;
    this.accumulatorMs = 0;
  }

  setTimeDilation(multiplier) {
    const clamped = Math.min(Math.max(Number(multiplier) || 1, 0.05), 100);
    gameState.globalParameters.timeDilation = clamped;
    this.resetFrameTime();
    eventBus.emit('time-dilation-changed', { timeDilation: clamped });
  }

  handleVisibilityChange() {
    if (document.hidden) {
      addPauseState(pauseStates.HIDDEN);
    } else {
      deletePauseState(pauseStates.HIDDEN);
      this.resetFrameTime();
    }
  }

  frame(now) {
    if (this.lastFrameTime === null) {
      this.lastFrameTime = now;
      this.render();
      this.rafId = requestAnimationFrame(this.boundFrame);
      return;
    }

    const rawDeltaMs = Math.max(0, now - this.lastFrameTime);
    this.lastFrameTime = now;
    this.lastRawDeltaMs = rawDeltaMs;
    const instantFps = rawDeltaMs > 0 ? 1000 / rawDeltaMs : 0;
    this.smoothedFps = this.smoothedFps === 0
      ? instantFps
      : (this.smoothedFps * 0.9) + (instantFps * 0.1);

    const clock = gameState.clock;
    clock.totalClockTimeAll += rawDeltaMs;
    clock.totalClockTimeLoop += rawDeltaMs;

    updateAutoPauseState();
    const paused = isGamePaused();
    updateDebugInfo(paused);

    if (paused) {
      this.accumulatorMs = 0;
      this.lastGameDeltaMs = 0;
      this.lastStepCount = 0;
      this.render();
      this.rafId = requestAnimationFrame(this.boundFrame);
      return;
    }

    const maxFrameDeltaMs = gameState.globalParameters.maxFrameDeltaMs ?? 250;
    const fixedStepMs = gameState.globalParameters.fixedStepMs ?? (1000 / 30);
    const maxCatchUpSteps = gameState.globalParameters.maxCatchUpSteps ?? 5;
    const clampedDeltaMs = Math.min(rawDeltaMs, maxFrameDeltaMs);
    const gameDeltaMs = clampedDeltaMs * (gameState.globalParameters.timeDilation || 1);
    this.lastGameDeltaMs = gameDeltaMs;

    clock.totalGameTimeAll += gameDeltaMs;
    clock.totalGameTimeLoop += gameDeltaMs;
    clock.unpausedClockTimeAll += rawDeltaMs;
    clock.unpausedClockTimeLoop += rawDeltaMs;
    clock.unpausedGameTimeAll += gameDeltaMs;
    clock.unpausedGameTimeLoop += gameDeltaMs;

    this.accumulatorMs += gameDeltaMs;

    let steps = 0;
    while (this.accumulatorMs >= fixedStepMs && steps < maxCatchUpSteps) {
      runGameTick(fixedStepMs);
      this.accumulatorMs -= fixedStepMs;
      this.tickCount += 1;
      steps += 1;
    }
    this.lastStepCount = steps;

    if (steps === maxCatchUpSteps && this.accumulatorMs > fixedStepMs) {
      this.accumulatorMs = fixedStepMs;
    }

    this.render();
    this.rafId = requestAnimationFrame(this.boundFrame);
  }

  render() {
    Object.values(actionsConstructed).forEach(action => {
      if (action.needsRender === true) {
        action.render();
        action.needsRender = false;
      }
    });
    updateTimerUI();
  }
}

function updateDebugInfo(paused = isGamePaused()) {
  const info = document.getElementById('debug-info');
  const overlay = document.getElementById('debug-overlay');
  if (!info && !overlay) return;

  if (!gameState.debugMode) {
    if (info) info.textContent = '';
    if (overlay) overlay.textContent = '';
    return;
  }

  const clock = window.gameClock;
  const debugText =
  `Fixed Step: ${gameState.globalParameters.fixedStepMs}ms\n` +
  `FPS: ${Number(clock?.smoothedFps ?? 0).toFixed(1)}\n` +
  `Frame: ${Number(clock?.lastRawDeltaMs ?? 0).toFixed(2)}ms\n` +
  `Game Delta: ${Number(clock?.lastGameDeltaMs ?? 0).toFixed(2)}ms\n` +
  `Steps/Frame: ${clock?.lastStepCount ?? 0}\n` +
  `Ticks: ${clock?.tickCount ?? 0}\n` +
  `Time Dilation: ${Number(gameState.globalParameters.timeDilation || 1).toFixed(2)}x\n` +
  `Paused: ${paused}`;

  if (info) info.textContent = debugText;
  if (overlay) overlay.textContent = debugText;
}

function updateAutoPauseState() {
  if (gameState.actionsActive.length === 0 && !gameState.pausedReasons.includes(pauseStates.INACTIVE)) {
    addPauseState(pauseStates.INACTIVE);
  } else if (gameState.actionsActive.length > 0 && gameState.pausedReasons.includes(pauseStates.INACTIVE)) {
    deletePauseState(pauseStates.INACTIVE);
  }
}

function checkTimeWarnings() {
  if (timeMaxMs <= 0) return;

  const fraction = timeRemainingMs / timeMaxMs;
  if (timeRemainingMs <= 0 && !gameOver) {
    timeRemainingMs = 0;
    syncTimeState();
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

function runGameTick(stepMs) {
  updateAutoPauseState();
  if (isGamePaused()) return;

  const effectiveStepMs = spendLoopTime(stepMs);
  framesTotal += 1;
  timeTotal += effectiveStepMs;

  gameState.actionsActive.slice().forEach(actionId => {
    actionsConstructed[actionId]?.step(effectiveStepMs);
  });

  processScheduledEvents();
  checkTimeWarnings();
  gameState.timeWarnings = { ...timeWarnings };
}

window.addEventListener('load', () => {
  window.gameClock = new ClockEngine();
  window.gameClock.start();
});

/* ===== Time Dilation API (non-destructive) =====
Lets gameplay and debug stack multiple multipliers.
- Base dilation comes from gameState.globalParameters.timeDilationBase (or timeDilation, else 1).
- Effective dilation = base * product(modifiers).
*/
(function () {
  if (window.TimeDilationAPI) return;

  function clamp01to100(x, def = 1) {
    const n = Number(x);
    if (!Number.isFinite(n)) return def;
    return Math.min(Math.max(n, 0.05), 100);
  }

  const api = (function () {
    const mods = new Map();

    function getBase() {
      const gp = (window.gameState && gameState.globalParameters) || {};
      if (Number.isFinite(gp.timeDilationBase)) return gp.timeDilationBase;
      if (Number.isFinite(gp.timeDilation)) return gp.timeDilation;
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
      const product = Array.from(mods.values()).reduce((a, b) => a * b, 1);
      return getBase() * product;
    }

    function apply() {
      const eff = getEffective();

      if (typeof timeDilation !== 'undefined') {
        try {
          timeDilation = eff;
        } catch (_e) {
          // Ignore legacy global assignment failures.
        }
      }

      if (window.gameClock && typeof gameClock.setTimeDilation === 'function') {
        gameClock.setTimeDilation(eff);
      } else {
        if (window.gameState && gameState.globalParameters) {
          gameState.globalParameters.timeDilation = eff;
        }
        eventBus.emit('time-dilation-changed', { timeDilation: eff });
      }
      return eff;
    }

    return {
      setBase,
      addMod,
      removeMod,
      clearMods,
      getEffective,
      apply,
      _mods: mods
    };
  })();

  window.TimeDilationAPI = api;

  if (!window.setTimeDilation) window.setTimeDilation = (x) => api.setBase(x);
  if (!window.addTimeDilationMod) window.addTimeDilationMod = (k, m) => api.addMod(k, m);
  if (!window.removeTimeDilationMod) window.removeTimeDilationMod = (k) => api.removeMod(k);
  if (!window.clearTimeDilationMods) window.clearTimeDilationMods = () => api.clearMods();

  if (!window.__td_logger_attached__) {
    eventBus.on('time-dilation-changed', ({ timeDilation }) => {
      if (timeDilation != null) {
        console.debug('[TimeDilation] effective =', timeDilation);
      }
    });
    window.__td_logger_attached__ = true;
  }
})();
