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

// Backwards compatibility helpers
function addPauseReason(state, _logText, label) {
  addPauseState(state);
  if (label !== undefined) {
    processPauseButton(label);
  }
}

function removePauseReason(state, _logText, label) {
  deletePauseState(state);
  if (label !== undefined) {
    processPauseButton(label);
  }
}

function clearPauseReasons() {
  deletePauseState();
}

// Optional property shim for old `gameState.paused` checks
window.addEventListener('load', () => {
  if (typeof gameState === 'object' && !Object.getOwnPropertyDescriptor(gameState, 'paused')) {
    Object.defineProperty(gameState, 'paused', {
      get() { return isGamePaused(); }
    });
  }
});
