/// INITIALIZATION ///

// Initialize legacy timeDilation variable from base game state
let timeDilation = emptyGameState.globalParameters.timeDilation;
let gameState = JSON.parse(JSON.stringify(emptyGameState));
let framesTotal = 0;    // Counts clock ticks since load
let timeTotal = 0;      // Accumulates clock ms for scheduling

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
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipTriggerList].forEach(el => new bootstrap.Tooltip(el));
  updateDebugToggle();
});

// Kickoff at clock zero
window.addEventListener('load', loadGame);
