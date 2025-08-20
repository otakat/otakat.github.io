const USE_SCALEX_ANIMATION = false;

const ProgressAnimationManager = (() => {
  const animations = new Map();
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setPercent(el, percent) {
    if (!el) return;
    if (USE_SCALEX_ANIMATION) {
      el.style.transformOrigin = 'left center';
      el.style.transform = `scaleX(${percent / 100})`;
    } else {
      el.style.width = `${percent}%`;
    }
  }

  function snap(el, percent) {
    if (!el) return;
    el.style.transition = 'none';
    setPercent(el, percent);
    // Force reflow to apply the width immediately
    void el.offsetWidth;
  }

  function start(id, el, coreMs, rateBonus, initialElapsedMs = 0, initialStatus = 'running') {
    const totalMs = coreMs / rateBonus;
    const anim = {
      el,
      totalMs,
      elapsedMs: Math.min(initialElapsedMs, totalMs),
      status: initialStatus,
      startedAt: null,
    };
    animations.set(id, anim);

    const pct = (anim.elapsedMs / totalMs) * 100;
    snap(el, pct);

    if (initialStatus === 'running' && anim.elapsedMs < totalMs) {
      anim.startedAt = performance.now();
      const remaining = totalMs - anim.elapsedMs;
      const dur = prefersReduced ? 1 : remaining;
      const prop = USE_SCALEX_ANIMATION ? 'transform' : 'width';
      el.style.transition = `${prop} ${dur}ms linear`;
      setPercent(el, 100);
    }
  }

  function pause(id) {
    const anim = animations.get(id);
    if (!anim || anim.status !== 'running') return;
    anim.elapsedMs = Math.min(
      anim.totalMs,
      anim.elapsedMs + (performance.now() - anim.startedAt)
    );
    anim.status = 'paused';
    const pct = (anim.elapsedMs / anim.totalMs) * 100;
    snap(anim.el, pct);
  }

  function resume(id) {
    const anim = animations.get(id);
    if (!anim || anim.status !== 'paused') return;
    const remaining = anim.totalMs - anim.elapsedMs;
    if (remaining <= 0) {
      complete(id);
      return;
    }
    anim.startedAt = performance.now();
    anim.status = 'running';
    const dur = prefersReduced ? 1 : remaining;
    const prop = USE_SCALEX_ANIMATION ? 'transform' : 'width';
    anim.el.style.transition = `${prop} ${dur}ms linear`;
    setPercent(anim.el, 100);
  }

  function complete(id) {
    const anim = animations.get(id);
    if (!anim) return;
    anim.elapsedMs = anim.totalMs;
    anim.status = 'completed';
    snap(anim.el, 100);
  }

  function reset(id) {
    const anim = animations.get(id);
    if (!anim) return;
    animations.delete(id);
    snap(anim.el, 0);
  }

  function snapshot(id) {
    const anim = animations.get(id);
    if (!anim) return null;
    let elapsed = anim.elapsedMs;
    if (anim.status === 'running') {
      elapsed = Math.min(anim.totalMs, elapsed + (performance.now() - anim.startedAt));
    }
    return {
      totalMs: anim.totalMs,
      elapsedMs: elapsed,
      status: anim.status,
    };
  }

  function snapshotAll() {
    const out = {};
    animations.forEach((_, id) => {
      const snapObj = snapshot(id);
      if (snapObj) out[id] = snapObj;
    });
    return out;
  }

  function restore(id, el, snapObj) {
    const anim = {
      el,
      totalMs: snapObj.totalMs,
      elapsedMs: Math.min(snapObj.elapsedMs, snapObj.totalMs),
      status: snapObj.status,
      startedAt: null,
    };
    animations.set(id, anim);
    const pct = (anim.elapsedMs / anim.totalMs) * 100;
    snap(el, pct);

    if (anim.status === 'running' && anim.elapsedMs < anim.totalMs) {
      const remaining = anim.totalMs - anim.elapsedMs;
      anim.startedAt = performance.now();
      const dur = prefersReduced ? 1 : remaining;
      const prop = USE_SCALEX_ANIMATION ? 'transform' : 'width';
      el.style.transition = `${prop} ${dur}ms linear`;
      setPercent(el, 100);
    }
  }

  function pauseAll() {
    animations.forEach((_, id) => pause(id));
  }

  function resumeAll() {
    animations.forEach((_, id) => resume(id));
  }

  return {
    start,
    pause,
    resume,
    complete,
    reset,
    snapshot,
    snapshotAll,
    restore,
    pauseAll,
    resumeAll,
  };
})();

function runActionTick(actionObj, timeChange) {
  const multiplier = actionObj.timeMultiplier ?? 1;
  const newTimeChange = timeChange * multiplier;
  const data = actionObj.data;

  actionObj.progress.timeCurrent += newTimeChange;
  actionObj.progress.mastery += newTimeChange;
  if (newTimeChange > 0) consumeTime(newTimeChange / 1000);

  if (actionObj.progress.timeCurrent >= data.length) {
    actionObj.finish();
  }

  return newTimeChange;
}

if (typeof globalThis !== 'undefined') {
  globalThis.runActionTick = runActionTick;
  globalThis.ProgressAnimationManager = ProgressAnimationManager;
}
