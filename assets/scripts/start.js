/// INITIALIZATION ///

// Initialize legacy timeDilation variable from base game state
let timeDilation = emptyGameState.globalParameters.timeDilation;
let gameState = JSON.parse(JSON.stringify(emptyGameState));
let framesTotal = 0;    // Counts clock ticks since load
let timeTotal = 0;      // Accumulates clock ms for scheduling
let timeRemaining = defaultLoopTime; // seconds left in loop
let timeMax = defaultLoopTime;       // maximum loop time in seconds
let hasPocketWatch = false;
let timeWarnings = { half: false, quarter: false };

function updateDebugToggle() {
  const debugToggle = document.getElementById('debug-toggle');
  if (debugToggle) {
    debugToggle.checked = gameState.debugMode;
  }
  const renderSlider = document.getElementById('render-rate-slider');
  if (renderSlider) {
    renderSlider.value = gameState?.globalParameters?.renderHz ?? 30;
    updateRenderRateDisplay();
  }
  const controls = document.getElementById('time-dilation-controls');
  if (controls) {
    if (gameState.debugMode) {
      controls.classList.remove('d-none');
    } else {
      controls.classList.add('d-none');
    }
  }
  const slider = document.getElementById('time-dilation-slider');
  if (slider) {
    const base = gameState?.globalParameters?.timeDilationBase ?? gameState?.globalParameters?.timeDilation ?? 1;
    slider.value = base;
    updateTimeDilationDisplay();
  }
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    if (gameState.debugMode) {
      debugInfo.classList.remove('d-none');
    } else {
      debugInfo.classList.add('d-none');
    }
  }

  const artTab = document.getElementById('artifacts-tab');
  const artBtn = document.getElementById('artifacts-button');
  const skillTab = document.getElementById('skills-tab');
  const skillBtn = document.getElementById('skills-button');

  if (gameState.debugMode) {
    if (artTab) { artTab.classList.add('d-md-block'); artTab.classList.remove('d-none'); }
    if (artBtn) { artBtn.classList.remove('d-none'); }
    if (skillTab) { skillTab.classList.add('d-md-block'); skillTab.classList.remove('d-none'); }
    if (skillBtn) { skillBtn.classList.remove('d-none'); }
  } else {
    if (typeof updateArtifactsUI === 'function') { updateArtifactsUI(); }
    if (!gameState.artifacts?.skillbook) {
      if (skillTab) { skillTab.classList.add('d-none'); skillTab.classList.remove('d-md-block'); }
      if (skillBtn) { skillBtn.classList.add('d-none'); }
    }
  }

  if (typeof updateMenuButtons === 'function') { updateMenuButtons(); }

  if (gameState.debugMode) {
    window.DEBUG = {
      giveArtifact(id) {
        console.log('[DEBUG] giveArtifact', id);
        if (typeof unlockArtifact === 'function') {
          unlockArtifact(id);
        } else {
          gameState.artifacts[id] = true;
        }
      },
      giveItem(id, qty = 1) {
        console.log('[DEBUG] giveItem', id, qty);
        if (!gameState.inventory[id]) {
          gameState.inventory[id] = 0;
        }
        gameState.inventory[id] += Number(qty);
      },
      setTime(seconds) {
        console.log('[DEBUG] setTime', seconds);
        if (typeof setTimeRemaining === 'function') {
          setTimeRemaining(seconds);
        } else {
          timeRemaining = Math.max(0, Number(seconds));
        }
      },
      tp(id) {
        console.log('[DEBUG] tp', id);
        gameState.locationId = id;
      },
      setSkill(skill, level = 1) {
        console.log('[DEBUG] setSkill', skill, level);
        if (typeof doSkillsExist === 'function' && doSkillsExist(skill)) {
          gameState.skills[skill].current_level = Number(level);
          gameState.skills[skill].permanent_level = Number(level);
          gameState.skills[skill].current_progress = 0;
          gameState.skills[skill].permanent_progress = 0;
          if (typeof updateSkill === 'function') {
            updateSkill(skill, 0);
          }
        }
      },
      discoverAll() {
        console.log('[DEBUG] discoverAll');
        if (typeof artifactData === 'object') {
          Object.keys(artifactData).forEach(id => {
            if (typeof unlockArtifact === 'function') {
              unlockArtifact(id);
            }
          });
        }
        if (typeof book1_actions === 'object') {
          Object.keys(book1_actions).forEach(id => {
            if (typeof makeActionAvailable === 'function') {
              makeActionAvailable(id);
            }
          });
        }
      }
    };
  } else {
    delete window.DEBUG;
  }
}

function updateTimeDilationDisplay() {
  const slider = document.getElementById('time-dilation-slider');
  const disp = document.getElementById('time-dilation-display');
  if (slider && disp) {
    disp.textContent = Number(slider.value).toFixed(2);
  }
}

function updateRenderRateDisplay() {
  const slider = document.getElementById('render-rate-slider');
  const disp = document.getElementById('render-rate-display');
  if (slider && disp) {
    disp.textContent = Number(slider.value);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const debugToggle = document.getElementById('debug-toggle');
  if (debugToggle) {
    debugToggle.addEventListener('change', e => {
      gameState.debugMode = e.target.checked;
      if (typeof processActiveAndQueuedActions === 'function') {
        processActiveAndQueuedActions();
      }
      updateDebugToggle();
    });
  }
  const timeSlider = document.getElementById('time-dilation-slider');
  if (timeSlider) {
    timeSlider.addEventListener('input', e => {
      if (typeof setTimeDilation === 'function') {
        setTimeDilation(e.target.value);
      }
      updateTimeDilationDisplay();
    });
  }
  const renderSlider = document.getElementById('render-rate-slider');
  if (renderSlider) {
    renderSlider.addEventListener('input', e => {
      const hz = Number(e.target.value);
      if (window.gameClock && typeof gameClock.setRenderHz === 'function') {
        gameClock.setRenderHz(hz);
      } else {
        if (!gameState.globalParameters) gameState.globalParameters = {};
        gameState.globalParameters.renderHz = hz;
      }
      updateRenderRateDisplay();
    });
  }
  const resetButton = document.getElementById('reset-game-button');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetGameState();
      saveGame().catch(console.error);
    });
  }
  const restartBtn = document.querySelector('#restart-button');
  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
  }
  const settingsBtn = document.querySelector('#settings-button');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => openTab('settings-pane'));
  }
  const saveBtn = document.querySelector('#save-button');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveGame(true).catch(console.error));
  }
  const pauseBtn = document.querySelector('#pause-button');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', buttonPause);
  }
  const mainBtn = document.querySelector('#main-button');
  if (mainBtn) {
    mainBtn.addEventListener('click', showBook);
  }
  const libraryBtn = document.querySelector('#library-button');
  if (libraryBtn) {
    libraryBtn.addEventListener('click', showLibrary);
  }
  const bookBtn = document.querySelector('#book-button');
  if (bookBtn) {
    bookBtn.addEventListener('click', showBook);
  }
  const logBtn = document.querySelector('#log-button');
  if (logBtn) {
    logBtn.addEventListener('click', showLog);
  }
  const artifactsBtn = document.querySelector('#artifacts-button');
  if (artifactsBtn) {
    artifactsBtn.addEventListener('click', openArtifacts);
  }
  const skillsBtn = document.querySelector('#skills-button');
  if (skillsBtn) {
    skillsBtn.addEventListener('click', openSkills);
  }
  const book1Btn = document.querySelector('#book1-option');
  if (book1Btn) {
    book1Btn.addEventListener('click', () => selectBook('book1'));
  }
  eventBus.on('time-dilation-changed', () => {
    const slider = document.getElementById('time-dilation-slider');
    if (slider) {
      const base = gameState?.globalParameters?.timeDilationBase ?? gameState?.globalParameters?.timeDilation ?? 1;
      slider.value = base;
    }
    updateTimeDilationDisplay();
  });
  tippy('[data-tippy-content]', { animation: 'shift-away', touch: true });
  updateDebugToggle();
});

// Kickoff at clock zero
window.addEventListener('load', async () => {
  try {
    await loadGame();
  } catch (error) {
    console.error(error);
  }
});
