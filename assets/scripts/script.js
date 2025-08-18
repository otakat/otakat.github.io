function doSkillsExist(skillOrSkills) {
  // Define valid skills
  const validSkills = skillList;

  // Initialize skills in gameState if not present
  if (!gameState.hasOwnProperty("skills")) {
    gameState.skills = {};
  }

  // Abort if no skills were provided
  if (skillOrSkills === undefined) {return false;}

  function checkAndInitSkill(skill) {
    if (!validSkills.includes(skill)) {
      return false;
    } else {
      if (!gameState.skills.hasOwnProperty(skill)) {
        gameState.skills[skill] = {
          current_level: 0,
          current_progress: 0,
          permanent_level: 0,
          permanent_progress: 0
        };
      }
      return true;
    }
  }

  if (Array.isArray(skillOrSkills)) { // If an array was provided
    for (let skill of skillOrSkills) {
      if (!checkAndInitSkill(skill)) {return false;}
    }
    return true;
  } else { // If single skill provided
    return checkAndInitSkill(skillOrSkills);
  }
}

function multiplyTimeChangeBySkills(timeChange, skills){
  let multipliers = skills.map(skill => {
    const currentLevel = gameState.skills[skill].current_level
    const permanentLevel = gameState.skills[skill].permanent_level

    return Math.pow(1.1, currentLevel) * Math.pow(1.01, permanentLevel);
  });

  let sum = multipliers.reduce((accumulator, currentValue) =>
    accumulator + currentValue,
  );
  let averageMultiplier = sum / multipliers.length;
  if (gameState.artifacts?.timeCharm) {
    averageMultiplier *= 1.1;
  }

  const newTimeChange = timeChange * averageMultiplier
  return newTimeChange;
}

const currentExperienceToLevel = 3000;
const permanentExperienceToLevel = 3000;

const alertTypeData = {
  action_complete: { label: 'Action Completion', bootstrap: 'success' },
  action_unlock: { label: 'Action Unlock', bootstrap: 'primary' },
  story: { label: 'Story', bootstrap: 'info' },
  action_failure: { label: 'Action Failure', bootstrap: 'danger' },
  skill_level: { label: 'Skill Level Up', bootstrap: 'success' },
  artifact: { label: 'Artifact Unlock', bootstrap: 'primary' },
  item: { label: 'Item', bootstrap: 'info' },
  system: { label: 'System', bootstrap: 'secondary' }
};

function updateSkill(skill, timeChange) {
  if (!doSkillsExist(skill)) {return false;}

  let skill_to_update = gameState.skills[skill]

  const skillEl = document.getElementById(skill);
  const currentLevelEl = document.getElementById(skill + '-current-level');
  const currentProgressEl = document.getElementById(skill + '-current-progress');
  const permanentLevelEl = document.getElementById(skill + '-permanent-level');
  const permanentProgressEl = document.getElementById(skill + '-permanent-progress');

  skill_to_update.current_progress += timeChange;
  if (skill_to_update.current_progress >= currentExperienceToLevel) {
    skill_to_update.current_level += 1;
    skill_to_update.current_progress -= currentExperienceToLevel;
    const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
    logPopupCombo(`${skillName} improved to ${skill_to_update.current_level}.`, 'skill_level');
  }
  let currentProgressPercentage = skill_to_update.current_progress / currentExperienceToLevel * 100;


  skill_to_update.permanent_progress += timeChange;
  if (skill_to_update.permanent_progress >= permanentExperienceToLevel) {
    skill_to_update.permanent_level += 1;
    skill_to_update.permanent_progress -= permanentExperienceToLevel;
    const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
    logPopupCombo(`${skillName} mastery increased to ${skill_to_update.permanent_level}.`, 'skill_level');
  }
  let permanentProgressPercentage = skill_to_update.permanent_progress / permanentExperienceToLevel * 100;

  currentLevelEl.innerText = 'Current Loop: ' + skill_to_update.current_level;
  currentProgressEl.style.width = currentProgressPercentage + '%';
  permanentLevelEl.innerText = 'Permanent: ' + skill_to_update.permanent_level;
  permanentProgressEl.style.width = permanentProgressPercentage + '%';

  skillEl.classList.remove('d-none');
}

function refreshSkillsUI() {
  skillList.forEach(skill => {
    updateSkill(skill, 0);
  });
}

function generateUniqueId() {
    // Simple implementation (consider a more robust approach for a larger project)
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function cmpGE(actual, min) { return actual >= min; }
function cmpEQ(actual, expected) { return actual === expected; }

const requirementEvaluators = {
  skill(req) {
    const s = gameState.skills?.[req.key];
    const lvl = Math.max(s?.current_level || 0, s?.permanent_level || 0);
    return { ok: cmpGE(lvl, req.min ?? 0), actual: lvl };
  },
  artifact(req) {
    const owned = !!gameState.artifacts?.[req.id];
    return { ok: req.owned ? owned : !owned, actual: owned };
  },
  actionCompleted(req) {
    const prog = gameState.actionsProgress?.[req.id]?.completions || 0;
    return { ok: cmpGE(prog, req.min ?? 1), actual: prog };
  },
  flag(req) {
    const cur = gameState.flags?.[req.key];
    return { ok: cmpEQ(cur, req.equals), actual: cur };
  },
  mastery(req) {
    const p = gameState.actionsProgress?.[req.id];
    const base = getActionConfig(req.id)?.length || 1;
    const ratio = p ? (p.timeStart / base) : 0;
    return { ok: cmpGE(ratio, req.minRatio ?? 0), actual: ratio };
  },
  book(req) {
    const cur = gameState.currentBook || 'book1';
    return { ok: cmpEQ(cur, req.id), actual: cur };
  },
  custom(req) {
    const fn = customRequirementFns[req.fn];
    return fn ? fn(req, gameState) : { ok: false, actual: null };
  }
};

const customRequirementFns = {};

function evaluateRequirementClause(clause) {
  const fn = requirementEvaluators[clause.type];
  if (!fn) return { ok: false, actual: null };
  return fn(clause);
}

function evaluateRequirements(req) {
  if (!req || !Array.isArray(req.clauses) || req.clauses.length === 0) {
    return { ok: true, unmet: [] };
  }
  const modeAll = (req.mode || 'all') === 'all';
  const unmet = [];
  let passCount = 0;

  for (const c of req.clauses) {
    if (c.mode) {
      const r = evaluateRequirements(c);
      if (r.ok) passCount++;
      else unmet.push({ clause: c, detail: r.unmet });
      continue;
    }
    const r = evaluateRequirementClause(c);
    if (r.ok) passCount++;
    else unmet.push({ clause: c, actual: r.actual });
  }

  const ok = modeAll ? unmet.length === 0 : passCount > 0;
  return { ok, unmet };
}

function humanizeClause(c) {
  const cl = c.clause || c;
  switch (cl.type) {
    case 'skill': return `Requires ${cl.key} ${cl.min}+`;
    case 'artifact': return cl.owned ? `Requires artifact: ${artifactData[cl.id]?.label || cl.id}` 
                                     : `Artifact must be absent: ${cl.id}`;
    case 'actionCompleted': return `Complete ${getActionConfig(cl.id)?.label || cl.id} ×${cl.min}`;
    case 'flag': return `${cl.key} = ${String(cl.equals)}`;
    case 'mastery': return `Mastery of ${getActionConfig(cl.id)?.label || cl.id} ≥ ${(cl.minRatio*100)|0}%`;
    case 'book': return `Be in ${cl.id}`;
    case 'custom': return `Special condition: ${cl.fn}`;
    default: return `Requirement not met`;
  }
}

function buildRequirementsMessage(unmet) {
  const flat = [];
  (function collect(arr) {
    for (const u of arr) {
      if (u.detail) collect(u.detail);
      else flat.push(u);
    }
  })(unmet);

  const parts = flat.map(humanizeClause);
  return parts.length === 1 ? parts[0] : `Requirements not met:\n• ` + parts.join('\n• ');
}

let startingPermanentLevels = {};
let gameOver = false;

function updateArtifactsUI() {
  const container = document.getElementById('artifact-list');
  const tab = document.getElementById('artifacts-tab');
  const button = document.getElementById('artifacts-button');
  if (!container || !tab || !button) {return;}
  container.innerHTML = '';
  const unlocked = Object.keys(gameState.artifacts || {}).filter(id => gameState.artifacts[id]);
  if (unlocked.length === 0 && !gameState.debugMode) {
    tab.classList.add('d-none');
    tab.classList.remove('d-md-block');
    button.classList.add('d-none');
    return;
  }
  tab.classList.add('d-md-block');
  tab.classList.remove('d-none');
  button.classList.remove('d-none');
  unlocked.forEach(id => {
    const art = artifactData[id];
    if (!art) {return;}
    const div = document.createElement('div');
    div.className = 'artifact-container';
    const name = document.createElement('div');
    name.className = 'artifact-name';
    name.textContent = art.label;
    const desc = document.createElement('div');
    desc.className = 'artifact-description';
    desc.textContent = art.description;
    div.appendChild(name);
    div.appendChild(desc);
    container.appendChild(div);
  });
}

function applyArtifactEffects(id) {
  if (id === 'skillbook') {
    updateSkillsUI();
  }
}

function updateSkillsUI() {
  const skillsTab = document.getElementById('skills-tab');
  const skillsButton = document.getElementById('skills-button');
  if (!skillsTab || !skillsButton) {return;}
  const skillbookUnlocked = !!gameState.artifacts?.skillbook;
  if (gameState.debugMode || skillbookUnlocked) {
    skillsTab.classList.add('d-md-block');
    skillsTab.classList.remove('d-none');
    skillsButton.classList.remove('d-none');
  } else {
    skillsTab.classList.add('d-none');
    skillsTab.classList.remove('d-md-block');
    skillsButton.classList.add('d-none');
  }
}

function updateLibraryButton() {
  const libraryButton = document.getElementById('library-button');
  if (!libraryButton) {return;}
  const libraryUnlocked = !!gameState.flags?.libraryUnlocked;
  if (gameState.debugMode || libraryUnlocked) {
    libraryButton.classList.remove('d-none');
  } else {
    libraryButton.classList.add('d-none');
  }
}

function updateMenuButtons() {
  updateLibraryButton();
  updateSkillsUI();
  updateArtifactsUI();
}

function unlockArtifact(id) {
  if (!artifactData.hasOwnProperty(id)) {return;}
  if (!gameState.artifacts[id]) {
    gameState.artifacts[id] = true;
    if (id === 'pocketwatch') {
      hasPocketWatch = true;
      gameState.hasPocketWatch = true;
      updateTimerUI();
    }
    updateArtifactsUI();
    applyArtifactEffects(id);
    logPopupCombo('You discovered ' + artifactData[id].label + '!', 'artifact');
  }
}

function recordStartingPermanentLevels() {
  startingPermanentLevels = {};
  skillList.forEach(skill => {
    if (gameState.skills.hasOwnProperty(skill)) {
      startingPermanentLevels[skill] = gameState.skills[skill].permanent_level;
    } else {
      startingPermanentLevels[skill] = 0;
    }
  });
}

function addLogEntry(text, id = generateUniqueId(), tag = 'default') {
    //if (id === undefined) {
    //  id = generateUniqueId();
    //}
    const currentDate = new Date(Date.now())
    const timestamp = currentDate.toLocaleDateString('en-US');

    const logEntry = {
        id: id, // Implement this function to generate unique IDs
        tag: tag,
        text: text,
        date: timestamp
    };
    gameState.gameLog.push(logEntry);
    updateLogUI();
    updateStoryUI();
}

function updateLogUI() {
  const logTab = document.getElementById('log-tab');
  const log = document.getElementById('game-log');

  // Check if the scrollbar is at the bottom before updating the content
  const isScrolledToBottom = logTab.scrollHeight - logTab.clientHeight <= logTab.scrollTop + 1;

  log.textContent = '';
  gameState.gameLog.forEach(entry => {
    log.textContent += entry.date + ' (';
    log.textContent += entry.id + ', ';
    log.textContent += entry.tag + ') '
    log.textContent += entry.text + '\n\n';
  })

  // If the scrollbar was at the bottom, keep it at the bottom after the update
  if (isScrolledToBottom) {
    logTab.scrollTop = logTab.scrollHeight;
  }
}

function updateStoryUI() {
  const storyHeader = document.getElementById('story-header-text');
  if (!storyHeader) return;

  storyHeader.innerHTML = '';
  const wrapper = document.createElement('span');
  const storyEntries = gameState.gameLog.filter(entry => entry.tag === 'story');

  storyEntries.forEach((entry, index) => {
    if (index === storyEntries.length - 1) {
      const latest = document.createElement('span');
      latest.textContent = entry.text;
      latest.classList.add('latest-story');
      wrapper.appendChild(latest);
    } else {
      wrapper.appendChild(document.createTextNode(entry.text + ' '));
    }
  });

  storyHeader.appendChild(wrapper);
  storyHeader.scrollTop = storyHeader.scrollHeight;
}

function createPopup(text, alertType = 'system') {
    const data = alertTypeData[alertType] || alertTypeData.system;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${data.bootstrap} fade show d-flex align-items-center`;
    alertDiv.role = 'alert';

    alertDiv.innerHTML = `
        <div class="alert-timer me-2">
            <svg viewBox="0 0 44 44">
                <circle class="arc-track" cx="22" cy="22" r="20"></circle>
                <circle class="arc-progress" cx="22" cy="22" r="20" pathLength="100"></circle>
            </svg>
        </div>
        <div class="flex-grow-1">${text}</div>`;

    document.getElementById('popup-container').appendChild(alertDiv);

    const duration = 3000;
    const arc = alertDiv.querySelector('.arc-progress');
    arc.style.transition = `stroke-dashoffset ${duration}ms linear`;
    setTimeout(() => { arc.style.strokeDashoffset = 100; }, 0);

    const hide = () => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    };
    const timeoutId = setTimeout(hide, duration);
    alertDiv.addEventListener('click', () => {
        clearTimeout(timeoutId);
        hide();
    });
}

function logPopupCombo(text, alertType = 'system', id, tag) {
  if (!gameState.alertSettings[alertType]) {
    const defaults = emptyGameState.alertSettings?.[alertType] || { popup: true, log: true };
    gameState.alertSettings[alertType] = { ...defaults };
    saveGame();
  }
  const settings = gameState.alertSettings[alertType];
  const logTag = tag || alertType;
  if (settings.log) { addLogEntry(text, id, logTag); }
  if (settings.popup) { createPopup(text, alertType); }
}

function initAlertSettingsUI() {
  const container = document.getElementById('alert-settings');
  if (!container) return;
  container.innerHTML = '';
  Object.entries(alertTypeData).forEach(([key, data]) => {
    const row = document.createElement('div');
    row.className = 'mb-1';
    row.innerHTML = `
      <strong class="me-2">${data.label}</strong>
      <div class="form-check form-check-inline">
        <input class="form-check-input" type="checkbox" id="alert-popup-${key}">
        <label class="form-check-label" for="alert-popup-${key}">Popup</label>
      </div>
      <div class="form-check form-check-inline">
        <input class="form-check-input" type="checkbox" id="alert-log-${key}">
        <label class="form-check-label" for="alert-log-${key}">Log</label>
      </div>`;
    container.appendChild(row);
    const popupBox = row.querySelector(`#alert-popup-${key}`);
    const logBox = row.querySelector(`#alert-log-${key}`);
    const setting = gameState.alertSettings[key];
    popupBox.checked = setting?.popup;
    logBox.checked = setting?.log;
    popupBox.addEventListener('change', () => {
      gameState.alertSettings[key].popup = popupBox.checked;
      saveGame();
    });
    logBox.addEventListener('change', () => {
      gameState.alertSettings[key].log = logBox.checked;
      saveGame();
    });
  });
}

let scheduledEvents = [];

function scheduleEvent(delay, callback) {
  delay = sanitizeNumber(delay, 0);
  if (typeof callback !== 'function') {
    console.error('scheduleEvent requires a callback function');
    return;
  }
  scheduledEvents.push({ time: timeTotal + delay, callback });
}

function processScheduledEvents() {
  scheduledEvents = scheduledEvents.filter(event => {
    if (event.time <= timeTotal) {
      try {
        event.callback();
      } catch (e) {
        console.error('Scheduled event error:', e);
      }
      return false;
    }
    return true;
  });
}

function runGameTick(stepMs) {
  // Auto pause when no actions remain
  if (gameState.actionsActive.length === 0) {
    addPauseState(pauseStates.INACTIVE);
  } else {
    deletePauseState(pauseStates.INACTIVE);
  }

  framesTotal += 1;
  if (!isGamePaused()) {
    timeTotal += stepMs;
    gameState.actionsActive.forEach(actionId => {
      actionsConstructed[actionId].update(stepMs);
    });
    processScheduledEvents();
    processActiveAndQueuedActions();
  }
}

// Listen for each fixed clock beat
eventBus.on('tick-fixed', ({ stepMs }) => runGameTick(stepMs));

function buttonPause() {
  if (gameState.pausedReasons.includes(pauseStates.MANUAL)) {
    deletePauseState(pauseStates.MANUAL);
  } else {
    addPauseState(pauseStates.MANUAL);
  }
}

function updateTimerVisibility() {
  const container = document.getElementById('timer-container');
  if (!container) return;
  if (hasPocketWatch) container.classList.remove('d-none');
  else container.classList.add('d-none');
}

function updateTimerUI() {
  updateTimerVisibility();
  if (!hasPocketWatch) return;
  if (typeof updateLoopTimer === 'function') {
    updateLoopTimer(timeRemaining * 1000);
  }
}

function checkTimeWarnings() {
  const fraction = timeRemaining / timeMax;
  if (timeRemaining <= 0 && !gameOver) {
    timeRemaining = 0;
    gameState.timeRemaining = 0;
    showResetPopup();
    return;
  }
  if (!hasPocketWatch) {
    if (fraction <= 0.25 && !timeWarnings.quarter) {
        logPopupCombo('Your vision swims; the world feels less steady.', 'system');
      timeWarnings.quarter = true;
    } else if (fraction <= 0.5 && !timeWarnings.half) {
        logPopupCombo('You feel a strange heaviness in your limbs.', 'system');
      timeWarnings.half = true;
    }
  }
}

let pendingTimeCost = 0;
let refreshScheduled = false;

function applyPendingTime() {
  timeRemaining -= pendingTimeCost;
  if (timeRemaining < 0) timeRemaining = 0;
  gameState.timeRemaining = timeRemaining;
  pendingTimeCost = 0;
  refreshScheduled = false;
  checkTimeWarnings();
  gameState.timeWarnings = { ...timeWarnings };
  updateTimerUI();
}

function consumeTime(cost) {
  const c = Number(cost) || 0;
  pendingTimeCost += c;
  if (!refreshScheduled) {
    refreshScheduled = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(applyPendingTime);
    } else {
      setTimeout(applyPendingTime, 50);
    }
  }
}

function openTab(tabId = 'None') {
    // Hide all tab content
    var tabContents = document.getElementsByClassName("mobile-tab");
    for (var i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.add('d-none');
    }

    // Hide both main and settings panes
    var settingsPane = document.getElementById('settings-pane');
    var mainPane = document.getElementById('main-pane');
    var libraryPane = document.getElementById('library-pane');
    if (settingsPane) settingsPane.classList.add('d-none');
    if (mainPane) mainPane.classList.add('d-none');
    if (libraryPane) libraryPane.classList.add('d-none');

    // Show the specific pane/tab
    if (tabId === 'settings-pane') {
        if (settingsPane) settingsPane.classList.remove('d-none');
    } else if (tabId === 'library-pane') {
        if (libraryPane) libraryPane.classList.remove('d-none');
    } else {
        if (mainPane) mainPane.classList.remove('d-none');
        if (tabId !== 'None') {
            var tab = document.getElementById(tabId);
            if (tab) tab.classList.remove('d-none');
        }
    }
}

function showResetPopup(){
  // Halt clock and display results
  gameOver = true;
  addPauseState(pauseStates.MODAL);
  document.querySelectorAll('button').forEach(btn => btn.disabled = true);
  const restartBtn = document.querySelector('#resetModal button');
  if (restartBtn) {restartBtn.disabled = false;}

  const summaryList = document.getElementById('reset-summary');
  summaryList.innerHTML = '';
  skillList.forEach(skill => {
    if (!gameState.skills.hasOwnProperty(skill)) {return;}
    const startLevel = startingPermanentLevels[skill] || 0;
    const permGain = gameState.skills[skill].permanent_level - startLevel;
    const loopLevel = gameState.skills[skill].current_level;
    const li = document.createElement('li');
    let parts = [];
    if (permGain !== 0) {parts.push('+' + permGain + ' permanent');}
    if (loopLevel !== 0) {parts.push('Level ' + loopLevel + ' this loop');}
    if (parts.length === 0) {parts.push('No change');}
    li.textContent = skill.charAt(0).toUpperCase() + skill.slice(1) + ': ' + parts.join(', ');
    summaryList.appendChild(li);
  });

  const modal = new bootstrap.Modal(document.getElementById('resetModal'));
  modal.show();
  if (!gameState.artifacts?.skillbook) {unlockArtifact('skillbook');}
}

function restartGame(){
  const modal = bootstrap.Modal.getInstance(document.getElementById('resetModal'));
  if (modal) {modal.hide();}
  document.querySelectorAll('button').forEach(btn => btn.disabled = false);

  timeRemaining = timeMax;
  gameState.timeRemaining = timeRemaining;
  timeWarnings = { half: false, quarter: false };
  gameState.timeWarnings = { ...timeWarnings };
  gameState.timeMax = timeMax;
  skillList.forEach(skill => {
    if (gameState.skills.hasOwnProperty(skill)) {
      gameState.skills[skill].current_level = 0;
      gameState.skills[skill].current_progress = 0;
    }
  })

  Object.keys(actionsConstructed).forEach(actionId => {
    removeAction(actionId);
  })

  gameState.actionsActive = [];
  gameState.actionsAvailable = ["book1.hemlockForest.followWhisperingTrail"];

  Object.values(gameState.actionsProgress).forEach(action => {
    action.completions = 0;
    action.timeCurrent = 0;
  })

  gameOver = false;
  initializeGame();
  deletePauseState(pauseStates.MODAL); // clock resumes
  updateTimerUI();
}

function resetGameState() {
  // Preserve base time dilation before wiping state
  const base =
    gameState?.globalParameters?.timeDilationBase ??
    gameState?.globalParameters?.timeDilation ??
    1;

  // Remove all time dilation modifiers but keep base multiplier
  if (window.TimeDilationAPI?.clearMods) {
    TimeDilationAPI.clearMods();
  }

  // Reset game state
  gameState = JSON.parse(JSON.stringify(emptyGameState));

  // Restore preserved base dilation
  if (window.TimeDilationAPI?.setBase) {
    TimeDilationAPI.setBase(base);
  } else {
    if (!gameState.globalParameters) gameState.globalParameters = {};
    gameState.globalParameters.timeDilation = base;
    try { timeDilation = base; } catch (_e) { /* ignore */ }
  }

  Object.keys(actionsConstructed).forEach(action => {
    removeAction(action);
  })
  actionsConstructed = {};

  timeMax = defaultLoopTime;
  timeRemaining = timeMax;
  hasPocketWatch = false;
  timeWarnings = { half: false, quarter: false };
  gameState.timeRemaining = timeRemaining;
  gameState.timeMax = timeMax;
  gameState.hasPocketWatch = hasPocketWatch;
  gameState.timeWarnings = { ...timeWarnings };
  if (window.gameClock && typeof gameClock.setRenderHz === 'function') {
    gameClock.setRenderHz(gameState.globalParameters.renderHz);
  }
  updateTimerUI();

  const skillsTab = document.getElementById('skills-tab');
  if (skillsTab && !gameState.debugMode) {skillsTab.classList.add('d-none'); skillsTab.classList.remove('d-md-block');}
  const skillsButton = document.getElementById('skills-button');
  if (skillsButton && !gameState.debugMode) {skillsButton.classList.add('d-none');}

  initializeGame();
  if (typeof updateDebugToggle === 'function') { updateDebugToggle(); }
  initAlertSettingsUI();
}

async function saveGame(isManualSave = false) {
  try {
    await localforage.setItem('gameState', gameState);
    if (isManualSave) { logPopupCombo('Game Saved', 'system'); }
  } catch (error) {
    const errorMessage = 'Error saving game data';
    logPopupCombo(errorMessage, 'system');
    console.error(errorMessage, error);
  }
}

async function loadGame() {
  try {
    const savedState = await localforage.getItem('gameState');
    if (savedState) {
      const savedGameState = savedState;

      // Merge the saved game state with the empty game state
      // This ensures new variables in emptyGameState are initialized properly
      gameState = aggregateObjectProperties(emptyGameState, savedGameState);

      timeMax = gameState.timeMax ?? gameState.timeStart ?? defaultLoopTime;
      timeRemaining = gameState.timeRemaining ?? timeMax;
      hasPocketWatch = gameState.hasPocketWatch ?? false;
      timeWarnings = gameState.timeWarnings || { half: false, quarter: false };
      gameState.timeMax = timeMax;
      if (window.gameClock && typeof gameClock.setRenderHz === 'function') {
        gameClock.setRenderHz(gameState.globalParameters?.renderHz || 30);
      }

      logPopupCombo('Data Loaded', 'system');
    }
  } catch (error) {
    const errorMessage = 'Error loading game data';
    logPopupCombo(errorMessage, 'system');
    console.error(errorMessage, error);
  }

  updateDebugToggle();
  initializeGame();
  updateTimerUI();
  initAlertSettingsUI();
  if (typeof updateBookButton === 'function') { updateBookButton(); }
  saveGame();
}

function initializeGame() {
  if (gameState.actionsAvailable.length === 0) {
    const opener = getLocationMeta('book1.hemlockForest.followWhisperingTrail').opener;
    logPopupCombo(opener, 'story', undefined, 'story');
    gameState.actionsAvailable = ['book1.hemlockForest.followWhisperingTrail'];
  }

  gameState.actionsAvailable.forEach(actionId => {
    createNewAction(actionId);
  });

  processPauseButton();
  processActiveAndQueuedActions();
  if (typeof initLoopTimer === 'function') {
    initLoopTimer(timeMax * 1000);
  }
  updateTimerUI();
  refreshSkillsUI();
  recordStartingPermanentLevels();
  Object.keys(gameState.artifacts).forEach(id => {
    if (gameState.artifacts[id]) {applyArtifactEffects(id);}
  });
  Object.keys(gameState.inventory || {}).forEach(id => {
    const data = itemData[id];
    if (data && data.type === 'static' && typeof data.apply === 'function') {
      data.apply();
    }
  });
  if (Object.keys(gameState.inventory || {}).length === 0) {
    addItem('healing_potion', 3);
    addItem('smoke_bomb', 2);
    addItem('magic_lantern', 1);
    addItem('fairy_dust', 1);
    addItem('throwing_stone', 4);
    addItem('bread', 1);
    addItem('lucky_clover', 1);
    addItem('hourglass_charm', 1);
    addItem('silver_feather', 1);
    addItem('library_card', 1);
    addItem('mystic_orb', 1);
    addItem('ancient_map', 1);
  } else {
    refreshInventoryUI();
  }
  updateMenuButtons();
}

// Debug helpers
function givePocketWatch() { unlockArtifact('pocketwatch'); }
function setTimeRemaining(x) {
  timeRemaining = Math.max(0, Math.min(timeMax, Number(x)));
  gameState.timeRemaining = timeRemaining;
  checkTimeWarnings();
  gameState.timeWarnings = { ...timeWarnings };
  updateTimerUI();
}
function showTimeRemaining() { console.log('Time remaining:', timeRemaining + '/' + timeMax); }

/* ===== Time Dilation API (non-destructive) =====
   Lets gameplay and debug stack multiple multipliers.
   - Base dilation comes from gameState.globalParameters.timeDilationBase (or timeDilation, else 1).
   - Effective dilation = base * product(modifiers).
   - If GlobalClock.setTimeDilation exists, we call it; else we set gameState.globalParameters.timeDilation and emit an event.
*/
(function () {
  if (window.TimeDilationAPI) return; // already installed

  function clamp01to100(x, def = 1) {
    const n = Number(x);
    if (!Number.isFinite(n)) return def;
    return Math.min(Math.max(n, 0.05), 100);
  }

  const api = (function () {
    const mods = new Map(); // key -> multiplier (number)

    function getBase() {
      const gp = (window.gameState && gameState.globalParameters) || {};
      if (Number.isFinite(gp.timeDilationBase)) return gp.timeDilationBase;
      if (Number.isFinite(gp.timeDilation)) return gp.timeDilation; // backward compat
      return 1;
    }

    function setBase(x) {
      const clamped = clamp01to100(x, 1);
      if (!window.gameState) window.gameState = { globalParameters: {} };
      if (!gameState.globalParameters) gameState.globalParameters = {};
      gameState.globalParameters.timeDilationBase = clamped;
      return apply();
    }

    function addMod(key, mult) {
      if (!key) return false;
      mods.set(String(key), clamp01to100(mult, 1));
      return apply();
    }

    function removeMod(key) {
      mods.delete(String(key));
      return apply();
    }

    function clearMods() {
      mods.clear();
      return apply();
    }

    function getEffective() {
      const product =
        Array.from(mods.values()).reduce((a, b) => a * b, 1);
      return getBase() * product;
    }

    function apply() {
      const eff = getEffective();

      // Maintain compatibility with legacy global variable if present
      if (typeof timeDilation !== 'undefined') {
        try {
          timeDilation = eff;
        } catch (_e) { /* ignore */ }
      }

      // Prefer GlobalClock API if present
      if (window.gameClock && typeof gameClock.setTimeDilation === 'function') {
        gameClock.setTimeDilation(eff);
      } else {
        // Fallback: set param and emit event so listeners can react
        if (window.gameState && gameState.globalParameters) {
          gameState.globalParameters.timeDilation = eff;
        }
        eventBus.emit('time-dilation-changed', { timeDilation: eff });
      }
      return eff;
    }

    return {
      // public
      setBase, addMod, removeMod, clearMods, getEffective, apply,
      // exposed for debugging/inspection (read-only usage recommended)
      _mods: mods
    };
  })();

  window.TimeDilationAPI = api;

  // Convenience debug hooks (safe no-ops if methods missing)
  if (!window.setTimeDilation) window.setTimeDilation = (x) => api.setBase(x);
  if (!window.addTimeDilationMod) window.addTimeDilationMod = (k, m) => api.addMod(k, m);
  if (!window.removeTimeDilationMod) window.removeTimeDilationMod = (k) => api.removeMod(k);
  if (!window.clearTimeDilationMods) window.clearTimeDilationMods = () => api.clearMods();
  if (!window.setLogicHz) window.setLogicHz = (hz) => window.gameClock?.setLogicHz?.(hz);
  if (!window.setRenderHz) window.setRenderHz = (hz) => window.gameClock?.setRenderHz?.(hz);

  // Optional: lightweight console trace when dilation changes (only attach once)
  if (!window.__td_logger_attached__) {
    eventBus.on('time-dilation-changed', ({ timeDilation }) => {
      if (timeDilation != null) {
        console.debug('[TimeDilation] effective =', timeDilation);
      }
    });
    window.__td_logger_attached__ = true;
  }
})();

