if (!window.eventBus) {
  console.error('Emittery not loaded; using no-op event bus');
  window.eventBus = {
    on() {},
    off() {},
    emit: async () => {}
  };
}

// States allowed for gameState.paused
const pauseStates = {
  MANUAL: 'Paused (Manual)',
  INACTIVE: 'Paused (No Actions)',
  MODAL: 'Paused (Dialog Open)',
};

// Default loop time in seconds
const defaultLoopTime = 60;

const emptyGameState = {
  debugMode: true,
  actionsAvailable: [],
  actionsActive: [],
  actionsProgress: {},
  progressAnimations: {},
  // Countdown timer replaces health mechanic
  timeRemaining: defaultLoopTime,
  timeMax: defaultLoopTime,
  hasPocketWatch: false,
  pausedReasons: [pauseStates.INACTIVE],
  gameLog: [],
  skills: {},
  artifacts: {},
  flags: {},
  inventory: {},
  companions: [],
  loopFlags: {},
  statuses: {},
  locationId: '',
  currentBook: 'book1',
  timeWarnings: { half: false, quarter: false },
  alertSettings: {
    action_complete: { popup: false, log: true },
    action_unlock: { popup: true, log: true },
    story: { popup: false, log: true },
    action_failure: { popup: true, log: true },
    skill_level: { popup: false, log: true },
    artifact: { popup: true, log: true },
    item: { popup: true, log: true },
    system: { popup: true, log: true }
  },
  globalParameters: {
    refreshHz: 30,      // Master clock refresh rate in ticks per second
    timeDilation: 1.0,  // Scales all gameplay time
    masteryMaxRatio: 0.9,
    masteryGrowthRate: 5e-6,
    actionsMaxActive: 1,
    experienceToLevelCurrent: 5000,
    experienceToLevelPermanent: 5000,
  },
  // Time accounting (milliseconds)
  clock: {
    totalClockTimeAll: 0,      // Real-world elapsed time since game start
    totalGameTimeAll: 0,       // Game-time elapsed since game start
    unpausedClockTimeAll: 0,   // Real-world elapsed time while not paused
    unpausedGameTimeAll: 0,    // Game-time elapsed while not paused
    totalClockTimeLoop: 0,     // Real-world elapsed time this loop
    totalGameTimeLoop: 0,      // Game-time elapsed this loop
    unpausedClockTimeLoop: 0,  // Real-world elapsed time this loop while not paused
    unpausedGameTimeLoop: 0,   // Game-time elapsed this loop while not paused
  },
};

let scheduledEvents = [];
let actionsConstructed = {};
let startingPermanentLevels = {};
let gameOver = false;
const currentExperienceToLevel = 3000;
const permanentExperienceToLevel = 3000;
const customRequirementFns = {};
let pendingTimeCost = 0;
let refreshScheduled = false;

function aggregateObjectProperties(base, incoming) {
  const out = { ...base };
  for (const k in incoming) {
    const v = incoming[k];
    if (v instanceof Set) {
      out[k] = new Set(v);
    } else if (Array.isArray(v)) {
      out[k] = v.slice();
    } else if (v && typeof v === 'object') {
      out[k] = aggregateObjectProperties(out[k] ?? {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
