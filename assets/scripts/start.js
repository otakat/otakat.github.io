/// INITIALIZATION ///
let gameActive = true;
let manualPause = false;
let frameRate = 60;
let timeDilation = 2;
let gameState = JSON.parse(JSON.stringify(emptyGameState));

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
      saveGame();
      if (typeof processActiveAndQueuedActions === 'function') {
        processActiveAndQueuedActions();
      }
    });
  }
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
window.onload = loadGame;
setInterval(saveGame, 10000);
