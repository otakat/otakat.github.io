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
