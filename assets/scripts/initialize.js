if (window.Emittery) {
  window.eventBus = new window.Emittery();
} else {
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
const defaultLoopTime = 600;

const emptyGameState = {
  debugMode: false,
  actionsAvailable: [],
  actionsActive: [],
  actionsProgress: {},
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
  timeWarnings: { half: false, quarter: false },
  globalParameters: {
    logicHz: 30,        // Gameplay logic ticks per second
    renderHz: 30,       // UI refresh rate in ticks per second
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

let actionsConstructed = {};

function isValidNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function sanitizeNumber(v, d = 0) {
  return isValidNumber(v) ? v : d;
}

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
