function sanitizeNumber(value, defaultValue = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  } else {
    console.error("Value (" + value + ") is not a number, using default (" + defaultValue + ")");
    return defaultValue;
  }
}

function initializeSkills(skills) {
  if (!Array.isArray(skills)) {
    skills = [skills];
  }
  skills.forEach(skill => {
    if (!skillList.includes(skill)) {
      console.error('Skill is not in skill list:', skill);
      return;
    }
    let gameData = gameState.skills;
    const defaultSkill = {
      current_level: 0,
      current_progress: 0,
      permanent_level: 0,
      permanent_progress: 0
    };

    if (skill in gameData) {
      gameData[skill] = aggregateObjectProperties(defaultSkill, gameData[skill]);
    } else {
      gameData[skill] = defaultSkill;
    }

    refreshSkillElement(skill);
  });
}

function refreshSkillElement(skill){
  const toLevelCurrent = gameState.globalParameters.experienceToLevelCurrent;
  const toLevelPermanent = gameState.globalParameters.experienceToLevelPermanent;
  const skillData = gameState.skills[skill];

  const currentPercentage = skillData.current_progress / toLevelCurrent * 100;
  const permanentPercentage = skillData.permanent_progress / toLevelPermanent * 100;

  const currentLevelElement = document.getElementById(skill + '-current-level');
  currentLevelElement.innerText = 'Current Loop: ' + skillData.current_level;
  const currentProgressElement = document.getElementById(skill + '-current-progress')
  currentProgressElement.style.width = currentPercentage + '%';
  const permanentLevelElement = document.getElementById(skill + '-permanent-level')
  permanentLevelElement.innerText = 'Permanent: ' + skillData.permanent_level;
  const permanentLevelProgress = document.getElementById(skill + '-permanent-progress')
  permanentLevelProgress.style.width = permanentPercentage + '%';

  if (Math.max(skillData.current_level, skillData.current_progress, skillData.permanent_level, skillData.permanent_progress) <= 0) {
    document.getElementById(skill).classList.add('d-none');
  } else {
    document.getElementById(skill).classList.remove('d-none');
  }
}

function multiplyTimeChangeBySkills(timeChange, skills){
  // Abort if any skill is illegal
  //if (!doSkillsExist(skills)) {return timeChange;}

  let multipliers = skills.map(skill => {
    currentLevel = gameState.skills[skill].current_level
    permanentLevel = gameState.skills[skill].permanent_level

    return Math.pow(1.05, currentLevel + permanentLevel);
  });

  let sum = multipliers.reduce((accumulator, currentValue) =>
    accumulator + currentValue,
  );
  let averageMultiplier = sum / multipliers.length;

  const newTimeChange = timeChange * averageMultiplier
  return newTimeChange;
}

function updateSkill(skill, timeChange) {
  const toLevelCurrent = gameState.globalParameters.experienceToLevelCurrent;
  const toLevelPermanent = gameState.globalParameters.experienceToLevelPermanent;
  let skill_to_update = gameState.skills[skill]

  skill_to_update.current_progress += timeChange;
  if (skill_to_update.current_progress > toLevelCurrent) {
    skill_to_update.current_level += 1;

    skill_to_update.current_progress -= toLevelCurrent;
  }

  skill_to_update.permanent_progress += timeChange;
  if (skill_to_update.permanent_progress > toLevelPermanent) {
    skill_to_update.permanent_level += 1;
    skill_to_update.permanent_progress -= toLevelPermanent;
  }

  refreshSkillElement(skill);
}

function generateUniqueId() {
  return (Date.now() + sanitizeNumber(gameState.gameLog.length)).toString(36)
}

function addLogEntry(text, id = generateUniqueId(), tag = 'default') {
  const currentDate = new Date(Date.now())

  const logEntry = {
      id: id,
      tag: tag,
      text: text,
      date: currentDate.toLocaleDateString('en-US')
  };
  gameState.gameLog.push(logEntry);
  appendLogEntryUI(logEntry);
}

function appendLogEntryUI(logEntry) {
    const logTab = document.getElementById('log-tab');
    const log = document.getElementById('game-log');

    // Check if the scrollbar is at the bottom before adding the new content
    const isScrolledToBottom = logTab.scrollHeight - logTab.clientHeight <= logTab.scrollTop + 1;

    // Create the new log entry text and append it
    let entryText = logEntry.date + ' (' + logEntry.id + ', ' + logEntry.tag + ') ' + logEntry.text + '\n\n';
    log.innerHTML += entryText;

    // If the scrollbar was at the bottom, keep it at the bottom after the update
    if (isScrolledToBottom) {
      scrollBottomLogUI();
    }
}

function refreshLogUI() {
    // This function refreshes the whole log
    const log = document.getElementById('game-log');
    log.textContent = '';
    gameState.gameLog.forEach(entry => appendLogEntryUI(entry));

    scrollBottomLogUI();
}

function scrollBottomLogUI() {
  const logTab = document.getElementById('log-tab');
  logTab.scrollTop = logTab.scrollHeight;
}

function createPopup(text, alertType = 'alert-primary') {
  // Ensure valid alert type
  const validAlertTypes = new Set(['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark']);
  const sanitizedAlertType = validAlertTypes.has(alertType) ? 'alert-' + alertType : 'alert-primary';

  // Find existing popup with the same text if exists
  let popup = Array.from(document.getElementsByClassName('alert')).find(element => element.textContent.includes(text));

  if (popup) {
    // Update existing popup
    const regex = /\((\d+)\)$/;
    const textContent = popup.querySelector('.alert-text').textContent;
    const match = textContent.match(regex);
    const count = match ? parseInt(match[1]) + 1 : 2;
    const newText = match ? textContent.replace(regex, `(${count})`) : `${text} (${count})`;

    popup.querySelector('.alert-text').textContent = newText;
    popup.remove();
  } else {
    // Create alert div
    popup = document.createElement('div');
    popup.className = `alert ${sanitizedAlertType} alert-dismissible fade show`;
    popup.style = 'width:fit-content';
    popup.role = 'alert';

    // Add message and close button to alert
    popup.innerHTML = `
      <span class="alert-text">${text}</span>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      <div class="progress" style="height: 3px;">
          <div class="progress-bar" role="progressbar" style="width: 100%;"></div>
      </div>
    `;
  }

  // Append alert to the popup-container
  document.getElementById('popup-container').appendChild(popup);

  // Animate the progress bar
  const duration = 3000 + text.split(' ').length * 100
  const progressBar = popup.querySelector('.progress-bar');
  progressBar.style.transition = ''; // Reset any existing transition
  progressBar.style.width = '100%'; // Set width to 100% to restart the animation
  progressBar.offsetWidth; // Force browser reflow/repaint before setting the transition
  progressBar.style.transition = `width ${duration}ms linear`;
  progressBar.style.width = '0%';

  if (popup.timeout) {clearTimeout(popup.timeout);}
  popup.timeout = setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 150); // Wait for fade out
  }, duration);
}

function logPopupCombo(text, alertType, id, tag) {
  addLogEntry(text, id, tag);
  createPopup(text, alertType);
}

function createModal(text) {
  const modalEl = document.getElementById('modal-popup');
  const modalObj = new bootstrap.Modal(modalEl);
  const modalTextEl = document.getElementById('modal-popup-text');

  modalTextEl.innerHTML = text;

  pauseFromModal(modalEl);
  modalObj.show();
}

function pauseFromModal(modalElement) {
  console.log(modalElement.classList);
  if (!modalElement.classList.contains('modal')) {
    console.error('Element is not a modal element:', modalElement);
    return false;
  }
  addPauseState(pauseStates.MODAL);
  modalElement.addEventListener('hidden.bs.modal', function (event) {
    deletePauseState(pauseStates.MODAL);
  })
}

function logModalCombo(text, id, tag) {
  addLogEntry(text, id, tag);
  createModal(text);
}

function updateFrameClock() {
  // Start the first item in the queue if nothing is active
  if (gameState.actionsActive.length < gameState.globalParameters.actionsMaxActive && gameState.actionsQueued.length >= 1 && !gameState.pausedReasons.includes(pauseStates.MANUAL)) {
    activateActionQueue();
  }

  // Process pausing due to no actions in active or queue
  if ((gameState.actionsActive.length + gameState.actionsQueued.length) <= 0) {
    addPauseState(pauseStates.INACTIVE);
  } else {
    deletePauseState(pauseStates.INACTIVE);
  }

  let currentTime = Date.now();
  let timeElapsed = (currentTime - lastUpdateTime) * timeDilation;

  if (timeElapsed >= frameDuration) {
    framesTotal += timeElapsed / frameDuration;
    let fps = 1000 / timeElapsed;

    if (!isGamePaused()) {
      timeTotal += timeElapsed;

      gameState.actionsActive.forEach(actionId => {
        actionsConstructed[actionId].update(timeElapsed)
      })

      updateHealthBar(timeElapsed);
    }

    lastUpdateTime = currentTime;
  }
  window.requestAnimationFrame(updateFrameClock)
}

function buttonPause() {
  if (gameState.pausedReasons.includes(pauseStates.MANUAL)) {
    deletePauseState(pauseStates.MANUAL);
  } else {
    addPauseState(pauseStates.MANUAL);
  }
}

function addPauseState(newState) {
  if (!Object.values(pauseStates).includes(newState)) {
    console.error('Illegal pause state:', newState);
  } else if (!gameState.pausedReasons.includes(newState)) {
    gameState.pausedReasons.unshift(newState);
  }

  processPauseButton();
}

function deletePauseState(newState) {
  if (newState === undefined) {
    gameState.pausedReasons.clear()
  } else if (!Object.values(pauseStates).includes(newState)) {
    console.error('Illegal pause state:', newState)
  } else if (gameState.pausedReasons.includes(newState)) {
    gameState.pausedReasons = gameState.pausedReasons.filter(reason => reason !== newState);
  }

  processPauseButton();
}

function processPauseButton(manualLabel) {
  let newLabel = '';
  if (manualLabel !== undefined) {
    newLabel = manualLabel;
  } else if (gameState.pausedReasons.includes(pauseStates.MANUAL)) {
    newLabel = pauseStates.MANUAL;
  } else if (gameState.pausedReasons.includes(pauseStates.MODAL)) {
    newLabel = pauseStates.MODAL;
  } else if (gameState.pausedReasons.includes(pauseStates.INACTIVE)) {
    newLabel = pauseStates.INACTIVE;
  } else if (gameState.pausedReasons.size >= 1) {
    newLabel = 'Paused';
  } else {
    newLabel = 'Running';
  }

  document.getElementById('pause-button').innerText = newLabel;
}

function isGamePaused() {
  return gameState.pausedReasons.length >= 1;
}

function updateHealthBar(timeChange = 0) {
    gameState.health.current -= timeChange;
    if (gameState.health.current <= 0) {
        endLoop();
        // Reset or other logic when progress bar reaches 0
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

function endLoop(){
  logPopupCombo("You run has ended. Restarting...", 'danger');

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

  initializeGame();
}

function hideTooltip() {
    let tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function resetGameState() {
  localStorage.removeItem('gameState');
  gameState = aggregateObjectProperties(emptyGameState);

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
    if (newObject[key] instanceof Set) {
      // Directly assign the Set
      aggregateObject[key] = new Set(newObject[key]);
    } else if (Array.isArray(newObject[key])) {
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
    logModalCombo(storylines.book1_opener);
    gameState.actionsAvailable = ['book1_action1'];
  }

  gameState.actionsAvailable.forEach(actionId => {
    createNewAction(actionId);
  });

  processPauseButton();
  processActiveAndQueuedActions();
  updateHealthBar();
  initializeSkills(skillList);
  refreshLogUI();
}
