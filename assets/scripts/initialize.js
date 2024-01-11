// States allowed for gameState.paused
const pauseStates = {
  MANUAL: 'Paused (Manual)', // Cannot be broken
  INACTIVE: 'Paused (No Actions)', // Pause from no active actions
  MODAL: 'Paused (Dialog Open)', // Paused because of an open modal
}

const emptyGameState = {
  actionsAvailable: [],
  actionsActive: [],
  actionsQueued: [],
  actionsProgress: {},
  health: {
      current: 25000,
      max: 25000
  },
  pausedReasons: [pauseStates.INACTIVE],
  gameLog: [],
  skills: {},
  globalParameters: {
    masteryMaxRatio: 0.9,
    masteryGrowthRate: 5e-6,
    actionsMaxActive: 1,
    experienceToLevelCurrent: 5000,
    experienceToLevelPermanent: 5000
  }
}

/// INITIALIZATION ///
let gameActive = true;
let manualPause = false;
let frameRate = 60;
let timeDilation = 2;
let actionsConstructed = {};

// Initialize clock variables
let frameDuration = 1000 / frameRate;
let framesTotal = 0;
let timeTotal = 0;
let lastUpdateTime = Date.now();
