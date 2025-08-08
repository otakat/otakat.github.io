function sanitizeNumber(value, defaultValue = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  } else {
    console.error("Value (" + value + ") is not a number, using default (" + defaultValue + ")");
    return defaultValue;
  }
}

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
  // Abort if any skill is illegal
  if (!doSkillsExist(skills)) {return timeChange;}

  let multipliers = skills.map(skill => {
    currentLevel = gameState.skills[skill].current_level
    permanentLevel = gameState.skills[skill].permanent_level

    return Math.pow(1.1, currentLevel) * Math.pow(1.01, permanentLevel);
  });

  let sum = multipliers.reduce((accumulator, currentValue) =>
    accumulator + currentValue,
  );
  let averageMultiplier = sum / multipliers.length;

  const newTimeChange = timeChange * averageMultiplier
  return newTimeChange;
}

function updateSkill(skill, timeChange) {
  const currentExperienceToLevel = 3000;
  const permanentExperienceToLevel = 3000;

  if (!doSkillsExist(skill)) {return false;}

  let skill_to_update = gameState.skills[skill]



  skill_to_update.current_progress += timeChange;
  if (skill_to_update.current_progress > currentExperienceToLevel) {
    skill_to_update.current_level += 1;

    skill_to_update.current_progress -= currentExperienceToLevel;
  }
  let currentProgressPercentage = skill_to_update.current_progress / currentExperienceToLevel * 100;


  skill_to_update.permanent_progress += timeChange;
  if (skill_to_update.permanent_progress > permanentExperienceToLevel) {
    skill_to_update.permanent_level += 1;
    skill_to_update.permanent_progress -= permanentExperienceToLevel;
  }
  let permanentProgressPercentage = skill_to_update.permanent_progress / permanentExperienceToLevel * 100;

  document.getElementById(skill + '-current-level').innerText = 'Current Loop: ' + skill_to_update.current_level;
  document.getElementById(skill + '-current-progress').style.width = currentProgressPercentage + '%';
  document.getElementById(skill + '-permanent-level').innerText = 'Permanent: ' + skill_to_update.permanent_level;
  document.getElementById(skill + '-permanent-progress').style.width = permanentProgressPercentage + '%';

  if (Math.max(skill_to_update.current_level, skill_to_update.current_progress, skill_to_update.permanent_level, skill_to_update.permanent_progress) <= 0) {
    document.getElementById(skill).classList.add('d-none');
  } else {
    document.getElementById(skill).classList.remove('d-none');
  }
}

function generateUniqueId() {
    // Simple implementation (consider a more robust approach for a larger project)
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

let startingPermanentLevels = {};
let gameOver = false;

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

function createPopup(text, alertType = 'alert-primary') {
    // Check alertType for legal entry, correct if applicable, or use default
    fullType = alertType.startsWith('alert-') ? alertType : 'alert-' + alertType
    const allAlertTypes = new Set(['alert-primary', 'alert-secondary', 'alert-success', 'alert-danger', 'alert-warning', 'alert-info', 'alert-light', 'alert-dark'])
    if (!allAlertTypes.has(fullType)) {
      console.error('Illegal alert type: ', alertType);
      fullType = 'alert-primary';
    }

    // Create alert div
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${fullType} alert-dismissible fade show`;
    alertDiv.role = 'alert';

    // Add message and close button to alert
    alertDiv.innerHTML = `
        ${text}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        <div class="progress" style="height: 3px;">
            <div class="progress-bar" role="progressbar" style="width: 100%;"></div>
        </div>`;

    // Append alert to the popup-container
    document.getElementById('popup-container').appendChild(alertDiv);

    // Calculate timeout duration based on message length (e.g., 5000ms + 100ms per word)
    const duration = 3000 + text.split(' ').length * 100;
    const progressBar = alertDiv.querySelector('.progress-bar');

    // Animate progress bar
    progressBar.style.transition = `width ${duration}ms linear`;
    setTimeout(() => progressBar.style.width = '0%', 0);

    // Set timeout to remove the alert
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150); // Wait for fade out
    }, duration);
}

function logPopupCombo(text, alertType, id, tag) {
  addLogEntry(text, id, tag);
  createPopup(text, alertType);
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

function updateFrameClock(currentTime) {
  // Start the first item in the queue if nothing is active
  if (
    gameState.actionsActive.length < gameState.globalParameters.actionsMaxActive &&
    gameState.actionsQueued.length >= 1 &&
    gameState.paused !== pauseStates.FULL_PAUSE
  ) {
    let newAction = gameState.actionsQueued.shift();
    activateAction(newAction);
  }

  // Soft pause the game if there are no active or queued actions
  if (
    (gameState.actionsActive.length + gameState.actionsQueued.length) === 0 &&
    gameState.paused === pauseStates.NOT_PAUSED
  ) {
    setPauseState(pauseStates.SOFT_PAUSE);
  }

  // Unpause a soft paused game if there are any actions
  if (
    (gameState.actionsActive.length + gameState.actionsQueued.length) > 0 &&
    gameState.paused === pauseStates.SOFT_PAUSE
  ) {
    setPauseState(pauseStates.NOT_PAUSED);
  }

  if (currentTime === undefined) {
    currentTime = performance.now();
  }

  accumulatedTime += (currentTime - lastUpdateTime) * timeDilation;
  lastUpdateTime = currentTime;

  const maxAccumulatedTime = frameDuration * 5;
  if (accumulatedTime > maxAccumulatedTime) {
    accumulatedTime = maxAccumulatedTime;
  }

  while (accumulatedTime >= frameDuration) {
    framesTotal += 1;

    if (!isGamePaused()) {
      timeTotal += frameDuration;

      gameState.actionsActive.forEach(actionId => {
        actionsConstructed[actionId].update(frameDuration);
      });

      updateHealthBar(frameDuration);
      processScheduledEvents();
    }

    accumulatedTime -= frameDuration;
  }

  window.requestAnimationFrame(updateFrameClock);
}

function buttonPause() {
  if (gameState.paused !== pauseStates.FULL_PAUSE) {
    setPauseState(pauseStates.FULL_PAUSE, 'Paused (Manual)', 'Paused (Manual)')
  } else {
    setPauseState(pauseStates.NOT_PAUSED) // Frame clock will auto pause if needed
  }
}

function setPauseState(newState, logText, buttonLabel) {
  if ([pauseStates.NOT_PAUSED, pauseStates.SOFT_PAUSE, pauseStates.FULL_PAUSE].includes(newState)) {
    gameState.paused = newState;

    if (logText !== undefined) {
      logPopupCombo(logText, 'secondary');
    }
    processPauseButton(buttonLabel);
  } else {
    console.error('Invalid pause state: ', newState)
  }
}

function processPauseButton(buttonLabel) {
  if (buttonLabel === undefined) {
    if (gameState.paused === pauseStates.NOT_PAUSED) {
      buttonLabel = 'Running (▶)';
    } else if (gameState.paused === pauseStates.SOFT_PAUSE) {
      buttonLabel = 'Paused (Auto)';
    } else {
      buttonLabel = 'Paused (Manual)';
    }
  }

  document.getElementById('pause-button').innerText = buttonLabel
}

function isGamePaused() {
  if (gameState.paused === pauseStates.NOT_PAUSED) {
    return false;
  } else {
    return true;
  }
}

function updateHealthBar(timeChange = 0) {
    gameState.health.current -= timeChange;
    if (gameState.health.current <= 0 && !gameOver) {
        gameState.health.current = 0;
        showResetPopup();
    }
    percentHealth = gameState.health.current / gameState.health.max * 100;
    document.getElementById('health-bar').style.width = percentHealth + '%';

    innerText = gameState.health.current.toFixed(0) + ' / ' + gameState.health.max;
    document.getElementById('health-bar-text').innerText = innerText;
}

function openTab(tabId = 'None') {
    // Hide all tab content
    var tabContents = document.getElementsByClassName("mobile-tab");
    for (var i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.add('d-none');
    }

    // Show the specific tab content
    if (tabId !== 'None') {
      document.getElementById(tabId).classList.remove('d-none');
    }
}

function showTooltip(event, text = 'Default') {
  if (window.matchMedia('(pointer: coarse)').matches) {return;}

  let tooltip = document.getElementById('tooltip');
  tooltip.innerHTML = text;
  tooltip.style.display = 'block';

  let scrollX = window.scrollX || document.documentElement.scrollLeft;
  let scrollY = window.scrollY || document.documentElement.scrollTop;

  tooltip.style.left = (event.clientX + scrollX + 20) + 'px';
  tooltip.style.top = (event.clientY + scrollY) + 'px';
}

function showResetPopup(){
  gameOver = true;
  setPauseState(pauseStates.FULL_PAUSE, undefined, 'Paused (Manual)');
  document.querySelectorAll('button:not(.menu-button)').forEach(btn => btn.disabled = true);

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

  document.getElementById('reset-popup').classList.remove('d-none');
}

function restartGame(){
  document.getElementById('reset-popup').classList.add('d-none');
  document.querySelectorAll('button:not(.menu-button)').forEach(btn => btn.disabled = false);

  gameState.health.current = gameState.health.max;
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
  gameState.actionsQueued = [];
  gameState.actionsAvailable = ["book1_action1"];

  Object.values(gameState.actionsProgress).forEach(action => {
    action.completions = 0;
    action.timeCurrent = 0;
  })

  gameOver = false;
  initializeGame();
  setPauseState(pauseStates.NOT_PAUSED);
}

function hideTooltip() {
    let tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function resetGameState() {
  gameState = JSON.parse(JSON.stringify(emptyGameState));

  Object.keys(actionsConstructed).forEach(action => {
    removeAction(action);
  })
  actionsConstructed = {};

  initializeGame();
}

function saveGame(isManualSave = false) {
    try {
      localStorage.setItem('gameState', JSON.stringify(gameState));
      if (isManualSave) {logPopupCombo('Game Saved', 'secondary');}
    } catch (error) {
      const errorMessage = 'Error saving to local storage';
      logPopupCombo(errorMessage, 'danger');
      console.error(errorMessage);
    }

}

function aggregateObjectProperties(originalObject, newObject) {
  // The new object take precedence;

  let aggregateObject = {...originalObject};

  for (let key in newObject) {
    if (Array.isArray(newObject[key])) {
        // If it's an array, replace it entirely from the saved state
        aggregateObject[key] = newObject[key];
    } else if (typeof newObject[key] === 'object' && newObject[key] !== null) {
        // For objects, do a deep merge
        aggregateObject[key] = {...originalObject[key], ...newObject[key]};
    } else {
        // For primitive types, just assign the saved state value
        aggregateObject[key] = newObject[key];
    }
  }
  return aggregateObject;
}

function loadGame() {
  const savedState = localStorage.getItem('gameState');
  if (savedState) {
    const savedGameState = JSON.parse(savedState);

    // Merge the saved game state with the empty game state
    // This ensures new variables in emptyGameState are initialized properly
    gameState = aggregateObjectProperties(emptyGameState, savedGameState);


    logPopupCombo('Data Loaded', 'secondary');
  }

  initializeGame();
}

function initializeGame() {
  if (gameState.actionsAvailable.length === 0) {
    logPopupCombo(storylines.book1_opener, 'info');
    gameState.actionsAvailable = ['book1_action1'];
  }

  gameState.actionsAvailable.forEach(actionId => {
    createNewAction(actionId);
  });

  processPauseButton();
  processActiveAndQueuedActions();
  updateHealthBar();
  updateSkill("courage", 0);
  updateSkill("creativity", 0);
  updateSkill("curiosity", 0);
  updateSkill("integrity", 0);
  updateSkill("perseverance", 0);
  updateSkill("resourcefulness", 0);
  recordStartingPermanentLevels();
}
