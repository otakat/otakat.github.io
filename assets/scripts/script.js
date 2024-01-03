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
  const currentExperienceToLevel = 5000;
  const permanentExperienceToLevel = 5000;

  if (!doSkillsExist(skill)) {return false;}

  let skill_to_update = gameState.skills[skill]



  skill_to_update.current_progress += timeChange;
  if (skill_to_update.current_progress > currentExperienceToLevel) {
    skill_to_update.current_level += 1;
    document.getElementById(skill + '-current-level').innerText = 'Current Loop: ' + skill_to_update.current_level;
    skill_to_update.current_progress -= currentExperienceToLevel;
  }
  let currentProgressPercentage = skill_to_update.current_progress / currentExperienceToLevel * 100;
  document.getElementById(skill + '-current-progress').style.width = currentProgressPercentage + '%';

  skill_to_update.permanent_progress += timeChange;
  if (skill_to_update.permanent_progress > permanentExperienceToLevel) {
    skill_to_update.permanent_level += 1;
    document.getElementById(skill + '-permanent-level').innerText = 'Permanent: ' + skill_to_update.permanent_level;
    skill_to_update.permanent_progress -= permanentExperienceToLevel;
  }
  let permanentProgressPercentage = skill_to_update.permanent_progress / permanentExperienceToLevel * 100;
  document.getElementById(skill + '-permanent-progress').style.width = permanentProgressPercentage + '%';

  console.log(skill);
  console.log(document.getElementById(skill).classList);

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

function addLogEntry(text, id, tag = 'default') {
    if (id === undefined) {
      id = generateUniqueId();
    }
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

function updateFrameClock() {
  // Start the first item in the queue if nothing is active
  if (gameState.actionsActive.length < gameState.maxActions && gameState.paused !== pauseStates.HARD_PAUSE) {
    let newAction = gameState.actionsQueued.shift()
    activateAction(newAction)
  }

  // Soft pause the game if there are no active or queued actions
  if ((gameState.actionsActive.length + gameState.actionsQueued.length) === 0 && gameState.paused === pauseStates.NOT_PAUSED) {
    setPauseState(pauseStates.SOFT_PAUSE);
  }

  // Unpause a soft paused game if there are any actions
  if ((gameState.actionsActive.length + gameState.actionsQueued.length) > 0 && gameState.paused === pauseStates.SOFT_PAUSE) {
    setPauseState(pauseStates.NOT_PAUSED);
  }

  let currentTime = Date.now();
  let timeElapsed = (currentTime - lastUpdateTime) * timeDilation;

  if (timeElapsed >= frameDuration) {
    framesTotal += timeElapsed / frameDuration;
    let fps = 1000 / timeElapsed;

    if (isGamePaused() === false) {
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
      addLogEntry(logText);
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
  addLogEntry("You run has ended. Restarting...");

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
  gameState = JSON.parse(JSON.stringify(emptyGameState));

  Object.keys(actionsConstructed).forEach(action => {
    removeAction(action);
  })
  actionsConstructed = {};

  initializeGame();
}

function saveGame() {
    addLogEntry('Game Saved');
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGame() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        gameState = JSON.parse(savedState);

        if (typeof gameState.health.current !== 'number' || isNaN(gameState.health.current)) {
          gameState.health.current = 0;
        }

        if (gameState.gameLog === undefined) {
          gameState.gameLog = [];
        }

        addLogEntry('Data Loaded');
    }

    initializeGame();
}

function initializeGame() {
  if (gameState.actionsAvailable.length === 0) {
    addLogEntry(storylines.book1_opener);
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
}
