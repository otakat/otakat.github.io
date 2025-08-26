function scheduleEvent(delay, callback) {
  delay = sanitizeNumber(delay, 0);
  if (typeof callback !== 'function') {
    console.error('scheduleEvent requires a callback function');
    return;
  }
  scheduledEvents.push({ time: timeTotal + delay, callback });
}

function processScheduledEvents() {
  scheduledEvents = scheduledEvents.filter(event => {
    if (event.time <= timeTotal) {
      try {
        event.callback();
      } catch (e) {
        console.error('Scheduled event error:', e);
      }
      return false;
    }
    return true;
  });
}

function restartGame(){
  const modal = bootstrap.Modal.getInstance(document.getElementById('resetModal'));
  if (modal) {modal.hide();}
  document.querySelectorAll('button').forEach(btn => btn.disabled = false);

  timeRemaining = timeMax;
  gameState.timeRemaining = timeRemaining;
  timeWarnings = { half: false, quarter: false };
  gameState.timeWarnings = { ...timeWarnings };
  gameState.timeMax = timeMax;
  skillList.forEach(skill => {
    if (gameState.skills.hasOwnProperty(skill)) {
      gameState.skills[skill].current_level = 0;
      gameState.skills[skill].current_progress = 0;
    }
  })

  Object.keys(actionsConstructed).forEach(actionId => {
    removeAction(actionId);
  })

  gameState.actionsActive = [];
  gameState.actionsAvailable = ["book1.hemlockForest.followWhisperingTrail"];

  Object.values(gameState.actionsProgress).forEach(action => {
    action.completions = 0;
    action.timeCurrent = 0;
  })

  gameOver = false;
  initializeGame();
  deletePauseState(pauseStates.MODAL); // clock resumes
  updateTimerUI();
}

function resetGameState() {
  // Preserve base time dilation before wiping state
  const base =
  gameState?.globalParameters?.timeDilationBase ??
  gameState?.globalParameters?.timeDilation ??
  1;

  // Remove all time dilation modifiers but keep base multiplier
  if (window.TimeDilationAPI?.clearMods) {
    TimeDilationAPI.clearMods();
  }

  // Reset game state
  gameState = JSON.parse(JSON.stringify(emptyGameState));

  // Restore preserved base dilation
  if (window.TimeDilationAPI?.setBase) {
    TimeDilationAPI.setBase(base);
  } else {
    if (!gameState.globalParameters) gameState.globalParameters = {};
    gameState.globalParameters.timeDilation = base;
    try { timeDilation = base; } catch (_e) { /* ignore */ }
  }

  Object.keys(actionsConstructed).forEach(action => {
    removeAction(action);
  })
  actionsConstructed = {};

  timeMax = defaultLoopTime;
  timeRemaining = timeMax;
  hasPocketWatch = false;
  timeWarnings = { half: false, quarter: false };
  gameState.timeRemaining = timeRemaining;
  gameState.timeMax = timeMax;
  gameState.hasPocketWatch = hasPocketWatch;
  gameState.timeWarnings = { ...timeWarnings };
  if (window.gameClock && typeof gameClock.setRefreshHz === 'function') {
    gameClock.setRefreshHz(gameState.globalParameters.refreshHz);
  }
  updateTimerUI();

  const skillsTab = document.getElementById('skills-tab');
  if (skillsTab && !gameState.debugMode) {skillsTab.classList.add('d-none'); skillsTab.classList.remove('d-md-block');}
  const skillsButton = document.getElementById('skills-button');
  if (skillsButton && !gameState.debugMode) {skillsButton.classList.add('d-none');}

  initializeGame();
  if (typeof updateDebugToggle === 'function') { updateDebugToggle(); }
  initAlertSettingsUI();
}

async function saveGame(isManualSave = false) {
  try {
    gameState.actionsActive.forEach(id => {
      const a = actionsConstructed[id];
      if (a) a.syncProgress();
    });
    gameState.progressAnimations = ProgressAnimationManager.snapshotAll();
    await localforage.setItem('gameState', gameState);
    if (isManualSave) { logPopupCombo('Game Saved', 'system'); }
  } catch (error) {
    const errorMessage = 'Error saving game data';
    logPopupCombo(errorMessage, 'system');
    console.error(errorMessage, error);
  }
}

async function loadGame() {
  try {
    const savedState = await localforage.getItem('gameState');
    if (savedState) {
      const savedGameState = savedState;

      // Merge the saved game state with the empty game state
      // This ensures new variables in emptyGameState are initialized properly
      gameState = aggregateObjectProperties(emptyGameState, savedGameState);

      timeMax = gameState.timeMax ?? gameState.timeStart ?? defaultLoopTime;
      timeRemaining = gameState.timeRemaining ?? timeMax;
      hasPocketWatch = gameState.hasPocketWatch ?? false;
      timeWarnings = gameState.timeWarnings || { half: false, quarter: false };
      gameState.timeMax = timeMax;
      if (window.gameClock && typeof gameClock.setRefreshHz === 'function') {
        gameClock.setRefreshHz(gameState.globalParameters?.refreshHz || 30);
      }

      logPopupCombo('Data Loaded', 'system');
    }
  } catch (error) {
    const errorMessage = 'Error loading game data';
    logPopupCombo(errorMessage, 'system');
    console.error(errorMessage, error);
  }

  gameClock.setRefreshHz(gameState.globalParameters.refreshHz);
  updateDebugToggle();
  initializeGame();
  updateTimerUI();
  initAlertSettingsUI();
  if (typeof updateBookButton === 'function') { updateBookButton(); }
  saveGame();
}

function initializeGame() {
  if (gameState.actionsAvailable.length === 0) {
    const opener = getLocationMeta('book1.hemlockForest.followWhisperingTrail').opener;
    logPopupCombo(opener, 'story', undefined, 'story');
    gameState.actionsAvailable = ['book1.hemlockForest.followWhisperingTrail'];
  }

  gameState.actionsAvailable.forEach(actionId => {
    createNewAction(actionId);
  });

  gameState.actionsActive.forEach(id => {
    const a = getAction(id);
    if (a) {
      a.start();
      const snap = gameState.progressAnimations?.[id];
      if (snap) {
        ProgressAnimationManager.restore(
          id,
          a.elements.progressBarCurrent,
          snap,
          isGamePaused()
        );
      }
    }
  });

  processPauseButton();
  processActiveAndQueuedActions();
  if (typeof initLoopTimer === 'function') {
    initLoopTimer(timeMax * 1000);
  }
  updateTimerUI();
  refreshSkillsUI();
  recordStartingPermanentLevels();
  Object.keys(gameState.artifacts).forEach(id => {
    if (gameState.artifacts[id]) {applyArtifactEffects(id);}
  });
  Object.keys(gameState.inventory || {}).forEach(id => {
    const data = itemData[id];
    if (data && data.type === 'static' && typeof data.apply === 'function') {
      data.apply();
    }
  });
  if (Object.keys(gameState.inventory || {}).length === 0) {
    addItem('healing_potion', 3);
    addItem('smoke_bomb', 2);
    addItem('magic_lantern', 1);
    addItem('fairy_dust', 1);
    addItem('throwing_stone', 4);
    addItem('bread', 1);
    addItem('lucky_clover', 1);
    addItem('hourglass_charm', 1);
    addItem('silver_feather', 1);
    addItem('library_card', 1);
    addItem('mystic_orb', 1);
    addItem('ancient_map', 1);
  } else {
    refreshInventoryUI();
  }
  updateMenuButtons();
}

// Debug helpers
function givePocketWatch() { unlockArtifact('pocketwatch'); }
function setTimeRemaining(x) {
  timeRemaining = Math.max(0, Math.min(timeMax, Number(x)));
  gameState.timeRemaining = timeRemaining;
  checkTimeWarnings();
  gameState.timeWarnings = { ...timeWarnings };
  updateTimerUI();
}
function showTimeRemaining() { console.log('Time remaining:', timeRemaining + '/' + timeMax); }
