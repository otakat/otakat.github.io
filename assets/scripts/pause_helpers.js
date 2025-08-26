function addPauseState(state) {
  if (gameState.pausedReasons.includes(state)){ return; }

  const wasPaused = isGamePaused();
  if (!gameState.pausedReasons.includes(state)) {
    gameState.pausedReasons.unshift(state);
  }
  if (!wasPaused && isGamePaused()) {
    ProgressAnimationManager.pauseAll();
    gameState.actionsActive.forEach(id => {
      const a = actionsConstructed[id];
      if (a) a.syncProgress();
    });
  }
  processPauseButton();

  console.log('Added pause state: ' + state)
}

function deletePauseState(state) {
  if (!gameState.pausedReasons.includes(state)){ return; }

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

  console.log('Deleted pause state: ' + state)
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
// const addPauseReason = addPauseState;
// const removePauseReason = deletePauseState;
// const clearPauseReasons = deletePauseState;

// Optional property shim for old `gameState.paused` checks
window.addEventListener('load', () => {
  const gs = window.gameState;
  if (gs && !Object.getOwnPropertyDescriptor(gs, 'paused')) {
    Object.defineProperty(gs, 'paused', {
      get() { return isGamePaused(); }
    });
  }
});

function buttonPause() {
  if (gameState.pausedReasons.includes(pauseStates.MANUAL)) {
    deletePauseState(pauseStates.MANUAL);
  } else {
    addPauseState(pauseStates.MANUAL);
  }
}
