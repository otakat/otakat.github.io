/// INITIALIZATION ///
let gameActive = true;
let manualPause = false;
let frameRate = 60;
// Initialize legacy timeDilation variable from base game state
let timeDilation = emptyGameState.globalParameters.timeDilation;
let gameState = JSON.parse(JSON.stringify(emptyGameState));

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
      saveGame();
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
  document.addEventListener('time-dilation-changed', () => {
    const slider = document.getElementById('time-dilation-slider');
    if (slider) {
      const base = gameState?.globalParameters?.timeDilationBase ?? gameState?.globalParameters?.timeDilation ?? 1;
      slider.value = base;
    }
    updateTimeDilationDisplay();
  });
  updateDebugToggle();
});



// Initialize clock variables
let frameDuration = 1000 / frameRate;
let framesTotal = 0;
let timeTotal = 0;
let lastUpdateTime = performance.now();
let accumulatedTime = 0;



// Initialize an action
//createNewAction('action1', 'Pull Weeds', 5000, book1_pull_weeds, 'Test1');
//createNewAction('action2', 'Talk to Mom', 5000, book1_talk_mom, 'Test2');

//openTab('actions-tab');
window.requestAnimationFrame(updateFrameClock);
window.onload = loadGame;
setInterval(saveGame, 10000);
