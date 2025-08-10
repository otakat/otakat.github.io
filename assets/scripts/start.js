// States allowed for gameState.paused
const pauseStates = {
  NOT_PAUSED: 'not paused',
  SOFT_PAUSE: 'softly paused', // Can be broken by starting a new action
  FULL_PAUSE: 'fully paused' // Cannot be broken except via pause button
}

const emptyGameState = {
  debugMode: false,
  actionsAvailable: ["book1_action1"],
  actionsActive: [],
  actionsQueued: [],
  actionsProgress: {},
  health: {
      current: 25000,
      max: 25000
  },
  paused: pauseStates.NOT_PAUSED,
  gameLog: [],
  skills: {},
  artifacts: {},
  globalParameters: {
    masteryMaxRatio: 0.9,
    masteryGrowthRate: 5e-6,
    actionsMaxActive: 1,
    renderHz: 60,
    logicHz: 20,
    timeDilation: 1
  },
  clock: {
    totalClockTimeAll: 0,
    totalGameTimeAll: 0,
    totalClockTimeLoop: 0,
    totalGameTimeLoop: 0,
    unpausedClockTimeAll: 0,
    unpausedGameTimeAll: 0,
    unpausedClockTimeLoop: 0,
    unpausedGameTimeLoop: 0
  }
}

/// INITIALIZATION ///
let gameActive = true;
let manualPause = false;
let frameRate = 60;
let timeDilation = 2;
let gameState = JSON.parse(JSON.stringify(emptyGameState));



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
