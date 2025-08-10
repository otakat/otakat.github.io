/// INITIALIZATION ///
let gameState = JSON.parse(JSON.stringify(emptyGameState));
let framesTotal = 0;    // Counts clock ticks since load
let timeTotal = 0;      // Accumulates clock ms for scheduling

function updateDebugToggle() {
  const debugToggle = document.getElementById('debug-toggle');
  if (debugToggle) {
    debugToggle.checked = gameState.debugMode;
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
    });
  }
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipTriggerList].forEach(el => new bootstrap.Tooltip(el));
  updateDebugToggle();
});

// Kickoff at clock zero
window.onload = loadGame;
