// States allowed for gameState.paused
const pauseStates = {
  NOT_PAUSED: 'not paused',
  SOFT_PAUSE: 'softly paused', // Can be broken by starting a new action
  FULL_PAUSE: 'fully paused' // Cannot be broken except via pause button
}

/// INITIALIZATION ///
let gameActive = true;
let manualPause = false;
let frameRate = 60;
let timeDilation = 5;
let actionsConstructed = {};
let gameState = {
    actionsAvailable: [],
    actionsActive: [],
    actionsQueued: [],
    actionsProgress: {},
    health: {
        current: 10000,
        max: 10000
    },
    maxActions: 1,
    paused: pauseStates.NOT_PAUSED,
    gameLog: [],
    skills: {
      courage: 0,
      perseverance: 0,
      resourcefulness: 0,
      curiosity: 0,
      creativity: 0,
      integrity: 0
    }
}

// Initialize clock variables
let frameDuration = 1000 / frameRate;
let framesTotal = 0;
let timeTotal = 0;
let lastUpdateTime = Date.now();



// Initialize an action
//createNewAction('action1', 'Pull Weeds', 5000, book1_pull_weeds, 'Test1');
//createNewAction('action2', 'Talk to Mom', 5000, book1_talk_mom, 'Test2');

//openTab('actions-tab');
window.requestAnimationFrame(updateFrameClock);
window.onload = loadGame();
setInterval(saveGame(), 10000);
