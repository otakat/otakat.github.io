function addPauseState(state) {
  const wasPaused = isGamePaused();
  if (!gameState.pausedReasons.includes(state)) {
    gameState.pausedReasons.unshift(state);
  }
  if (!wasPaused && isGamePaused()) {
    ProgressAnimationManager.pauseAll();
  }
  processPauseButton();
}

function deletePauseState(state) {
  const wasPaused = isGamePaused();
  if (state === undefined) {
    gameState.pausedReasons = [];
  } else {
    gameState.pausedReasons = gameState.pausedReasons.filter(reason => reason !== state);
  }
  if (wasPaused && !isGamePaused()) {
    ProgressAnimationManager.resumeAll();
  }
  processPauseButton();
}

function isGamePaused() {
  return gameState.pausedReasons.length > 0;
}

function processPauseButton(label) {
  let text = '';
  if (label !== undefined) {
    text = label;
  } else if (gameState.pausedReasons.includes(pauseStates.MANUAL)) {
    text = pauseStates.MANUAL;
  } else if (gameState.pausedReasons.includes(pauseStates.MODAL)) {
    text = pauseStates.MODAL;
  } else if (gameState.pausedReasons.includes(pauseStates.INACTIVE)) {
    text = pauseStates.INACTIVE;
  } else {
    text = 'Running';
  }
  const el = document.getElementById('pause-button');
  if (el) {
    const labelSpan = el.querySelector('.label');
    if (labelSpan) {
      labelSpan.innerText = text;
    } else {
      el.innerText = text;
    }
  }
}

// Backwards compatibility aliases
const addPauseReason = addPauseState;
const removePauseReason = deletePauseState;
const clearPauseReasons = deletePauseState;

// Optional property shim for old `gameState.paused` checks
window.addEventListener('load', () => {
  const gs = window.gameState;
  if (gs && !Object.getOwnPropertyDescriptor(gs, 'paused')) {
    Object.defineProperty(gs, 'paused', {
      get() { return isGamePaused(); }
    });
  }
});
