function addPauseState(state) {
  if (!gameState.pausedReasons.includes(state)) {
    gameState.pausedReasons.unshift(state);
  }
  processPauseButton();
}

function deletePauseState(state) {
  if (state === undefined) {
    gameState.pausedReasons = [];
  } else {
    gameState.pausedReasons = gameState.pausedReasons.filter(reason => reason !== state);
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
  if (el) el.innerText = text;
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
