class GameAction {
    constructor(id, label, length, effect) {
        // Pull in default action properties
        this.id = id;
        this.label = actionsList[id].label;
        this.length = actionsList[id].length;
        this.effect = actionsList[id].effect;

        // Define DOM objects
        this.container = document.getElementById(id);
        this.progressBarContainer = this.container.querySelector('.progress-bar-container');
        this.progressBar = this.container.querySelector('.progress-bar');
        this.progressBarMastery = this.container.querySelector('.progress-bar-mastery');
        this.progressBarText = this.container.querySelector('.progress-bar-text');
        this.buttonActivate = this.container.querySelector('.action-button');
        this.buttonQueue = this.container.querySelector('.queue-button');
        this.queueList = this.container.querySelector('.queue-list')

        // Add button effects
        this.buttonActivate.addEventListener('click', () => toggleAction(id));
        this.buttonQueue.addEventListener('click', () => queueAction(id));

        this.initializeActionProgress();
        this.calculateTimeStart();
        this.update();

        actionsConstructed[id] = this;
    }

    update(timeChange = 0) {
      if (typeof this.progress.timeCurrent !== 'number' || isNaN(this.progress.timeCurrent)) {
        this.progress.timeCurrent = 0;
      }
      if (typeof this.progress.timeStart !== 'number' || isNaN(this.progress.timeStart)) {
        this.progress.timeStart = 0;
      }

      if (this.progress.timeCurrent < this.progress.timeStart) {
        this.progress.timeCurrent = this.progress.timeStart;
      }
      this.progress.timeCurrent += timeChange;
      this.progress.mastery += timeChange;

      if (this.progress.timeCurrent >= this.length) {
        this.finish();
      }

      this.calculateTimeStart();

      const currentPercentage = (this.progress.timeCurrent / this.length) * 100;
      const masteryPercentage = (this.progress.timeStart / this.length) * 100;
      const label = masteryPercentage.toFixed(1) + '% Mastery + ' + (currentPercentage - masteryPercentage).toFixed(1) + '% Current';

      this.progressBar.style.width = currentPercentage + '%';
      this.progressBarText.innerText = label;
      this.progressBarMastery.style.width = masteryPercentage + '%';

    }

    finish() {
      this.progress.completions += 1;
      this.calculateTimeStart();
      this.progress.timeCurrent = this.progress.timeStart;
      this.update();
      //deactivateAction(this.id);
      this.effect();

      console.log(this.progress);
    }

    initializeActionProgress() {
      if (gameState.actionsProgress.hasOwnProperty(this.id) === false) {
        gameState.actionsProgress[this.id] = {
          timeStart: 0,
          timeCurrent: 0,
          mastery: 0,
          completions: 0
        };
      }
      this.progress = gameState.actionsProgress[this.id];
    }

    calculateTimeStart() {
      const maxRatio = 0.9;
      const growthRate = 0.0000001;

      let masteryImpact = 0;
      if (this.progress.mastery === 0) {
        masteryImpact = 0;
      } else {
        masteryImpact = maxRatio * Math.atan(growthRate * this.progress.mastery);
      }
      masteryImpact = Math.max(0, Math.min(masteryImpact, maxRatio));

      this.progress.timeStart = masteryImpact * this.length
      if (this.progress.timeCurrent < this.progress.timeStart) {
        this.progress.timeCurrent = this.progress.timeStart;
      }
    }
}

function createNewAction(id) {
  if (actionsConstructed.hasOwnProperty(id)) {
    console.error('Action is already constructed:',id)
    return;
  }

  let label = actionsList[id].label

  // Create the HTML structure for the action container
  const container = document.createElement('div');
  container.id = id;
  container.className = 'action-container';
  container.innerHTML = `
      <button class='queue-button'>➕</button>
      <button class='action-button'>${label}</button>
      <div class='queue-list'></div>
      <div class='progress-bar-container'>
          <div class='progress-bar' style='width: 0%'></div>
          <div class='progress-bar-mastery' style='width: 0%'></div>
          <div class='progress-bar-text'>0%</div>
      </div>
  `;

  // Add the new container to the game
  document.getElementById('actions-container').appendChild(container);
  container.addEventListener('mouseover', (event) => showTooltip(event, id))
  container.addEventListener('mouseout', hideTooltip);

  // Hide the container if the action is not currently available
  if (gameState.actionsAvailable.includes(id) === false) {
    container.style.display = "none";
  }

  // Initialize the GameAction for this container
  new GameAction(id);
}

function removeAction(actionId) {
  // Remove HTML elements
    const actionElement = document.getElementById(actionId);
    if (actionElement) {
        actionElement.parentNode.removeChild(actionElement);
    }

    // Remove from gameState and arrays
    delete actionsConstructed[actionId];
    gameState.actionsAvailable = gameState.actionsAvailable.filter(id => id !== actionId);
    gameState.actionsActive = gameState.actionsActive.filter(id => id !== actionId);
    gameState.actionsQueued = gameState.actionsQueued.filter(id => id !== actionId);
    processActiveAndQueuedActions();

    // Any additional cleanup...
}

function toggleAction(actionId) {
  const index = gameState.actionsActive.indexOf(actionId);
  if (index === 0) {
    deactivateAction(actionId);
  } else {
    activateAction(actionId);
  }
}

function activateAction(actionId) {
  const index = gameState.actionsActive.indexOf(actionId);
  if (index === 0) {return;}
  if (index > 0) {gameState.actionsActive.splice(index, 1);}
  gameState.actionsActive.unshift(actionId);
  processActiveAndQueuedActions();
}

function deactivateAction(actionId) {
  const index = gameState.actionsActive.indexOf(actionId);
  if (index >= 0) {
    gameState.actionsActive.splice(index, 1);
    processActiveAndQueuedActions();
  }
}

function queueAction(actionId) {
  gameState.actionsQueued.push(actionId);
  processActiveAndQueuedActions();
}

function processActiveAndQueuedActions() {
  // Transfer excess actions from active to the front of the queue
  if (gameState.actionsActive.length > gameState.maxActions) {
    let excessNumber = gameState.actionsActive.length - gameState.maxActions;
    let excessActions = gameState.actionsActive.splice(gameState.maxActions, excessNumber);
    gameState.actionsQueued.unshift(...excessActions);
  }

  const queueExtrasThreshold = 3;

  gameState.actionsAvailable.forEach(currentActionId => {
    let actionObject = actionsConstructed[currentActionId]

    // Color each active action blue, otherwise black
    if (gameState.actionsActive.includes(currentActionId) === true) {
      actionObject.progressBarContainer.style.border = '2px solid blue';
      actionObject.progressBar.classList.add('active');
    } else {
      actionObject.progressBarContainer.style.border = '2px solid black';
      actionObject.progressBar.classList.remove('active');
    }

    // Build the queue text for each action
    actionObject.queueList.innerText = '';

    let queueText = '';
    let queueCount = 0;

    gameState.actionsQueued.forEach((queuedActionId, index) => {
      if (queuedActionId === currentActionId) {
        queueCount += 1;
        if (index < queueExtrasThreshold) {
          queueText += ' ' + (index + 1);
        }
      }
    });

    if (queueCount > queueExtrasThreshold) {
      queueText += ' (+' + (queueCount - queueExtrasThreshold) + ')';
    }

    if (queueText !== ''){queueText = 'Queue:'+queueText;}
    actionObject.queueList.innerText = queueText;
  })
}

function addToGameLog(message) {
    const log = document.getElementById('game-log');
    log.textContent += message + '\n'; // Add new line

    // Keep only the last 500 lines
    const lines = log.textContent.split('\n');
    if (lines.length > 500) {
        log.textContent = lines.slice(-500).join('\n');
    }

    // Scroll to the bottom
    log.scrollTop = log.scrollHeight;
}

function generateUniqueId() {
    // Simple implementation (consider a more robust approach for a larger project)
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function addLogEntry(text, id, tag = 'default') {
    if (id === undefined) {
      id = generateUniqueId();
    }
    const logEntry = {
        id: id, // Implement this function to generate unique IDs
        tag: tag,
        text: text
    };
    gameState.gameLog.push(logEntry);
    updateLogUI();
}

function updateLogUI() {
  const log = document.getElementById('game-log');
  log.textContent = '';
  gameState.gameLog.forEach(entry => {
      log.textContent += entry.text + '\n';
  })

  log.scrollTop = log.scrollHeight;
}

function updateFrameClock() {
  if ((gameState.actionsActive.length + gameState.actionsQueued.length) === 0 && gameState.paused === pauseStates.NOT_PAUSED) {
    setPauseState(pauseStates.SOFT_PAUSE);
  }
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
          updateHealthBar(timeElapsed);

          // Start the first item in the queue if nothing is activate
          if (gameState.actionsActive.length < gameState.maxActions) {
            let newAction = gameState.actionsQueued.shift()
            activateAction(newAction)
          }

          gameState.actionsActive.forEach(actionId => {
            actionsConstructed[actionId].update(timeElapsed)
          })
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
      addToGameLog(logText);
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
        gameState.health.current = gameState.health.max;
        // Reset or other logic when progress bar reaches 0
    }
    percentHealth = gameState.health.current / gameState.health.max * 100;
    document.getElementById('health-bar').style.width = percentHealth + '%';

    innerText = gameState.health.current.toFixed(0) + ' / ' + gameState.health.max;
    document.getElementById('health-bar-text').innerText = innerText;
}

function openTab(tabId = 'None') {
    // Hide all tab content
    var tabContents = document.getElementsByClassName("tab-content");
    for (var i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
    }

    // Show the specific tab content
    if (tabId !== 'None') {
      document.getElementById(tabId).style.display = "block";
    }
}

function showTooltip(event, text = 'Default') {
    let tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = text;
    tooltip.style.display = 'block';

    let scrollX = window.scrollX || document.documentElement.scrollLeft;
    let scrollY = window.scrollY || document.documentElement.scrollTop;

    tooltip.style.left = (event.clientX + scrollX + 20) + 'px';
    tooltip.style.top = (event.clientY + scrollY) + 'px';
}

function hideTooltip() {
    let tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function resetGameState() {
  gameState = {
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
      gameLog: []
  }

  Object.keys(actionsConstructed).forEach(action => {
    removeAction(action);
  })
  actionsConstructed = {};

  initializeGame();
}

function saveGame() {
    localStorage.setItem('gameState', JSON.stringify(gameState));

    addLogEntry('Game Saved');
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
    gameState.actionsAvailable = ["book1_pull_weeds", "book1_talk_mom"];
  }

  gameState.actionsAvailable.forEach(actionId => {
    createNewAction(actionId);
  });

  processPauseButton();
  processActiveAndQueuedActions();
  updateHealthBar();
}
