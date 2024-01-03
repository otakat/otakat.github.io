// THE ACTION CLASS
class GameAction {
  constructor(id, label, length, effect) {
      // Pull in default action properties
      this.id = id;
      this.label = book1_actions[id].label;
      this.length = book1_actions[id].length;
      this.effect = book1_actions[id].effect;
      this.maxCompletions = book1_actions[id].maxCompletions;
      this.maxCompletionsEffect = book1_actions[id].maxCompletionsEffect;
			this.skills = book1_actions[id].skills;

      // Define DOM objects
      this.container = document.getElementById(id);
      this.progressContainer = this.container.querySelector('.action-progress-container');
      this.progressText = this.container.querySelector('.action-progress-text');
      this.progressBarCurrent = this.container.querySelector('.action-progress-bar-current');
      this.progressBarMastery = this.container.querySelector('.action-progress-bar-mastery');
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

		let newTimeChange = timeChange;
		if (doSkillsExist(this.skills)) {
			newTimeChange = multiplyTimeChangeBySkills(timeChange, this.skills);
			this.skills.forEach(skill => {
				updateSkill(skill, newTimeChange / this.skills.length);
			});
		}

		// Process time change
    this.progress.timeCurrent += newTimeChange;
    this.progress.mastery += newTimeChange;

    if (this.progress.timeCurrent >= this.length) {
      this.finish();
    }

    this.calculateTimeStart();

    const currentPercentage = (this.progress.timeCurrent / this.length) * 100;
    const masteryPercentage = (this.progress.timeStart / this.length) * 100;
    const label = masteryPercentage.toFixed(1) + '% Mastery + ' + (currentPercentage - masteryPercentage).toFixed(1) + '% Current';

    this.progressBarCurrent.style.width = currentPercentage + '%';
    this.progressText.innerText = label;
    this.progressBarMastery.style.width = masteryPercentage + '%';

  }

  finish() {
    this.progress.completions += 1;
    this.calculateTimeStart();
    this.progress.timeCurrent = this.progress.timeStart;
    this.update();
    deactivateAction(this.id);
    this.effect();

    if (this.progress.completions >= this.maxCompletions) {
      this.maxCompletionsEffect();
    }

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
    const growthRate = 0.00001;

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

// PROCEDURES
function createNewAction(id) {
  if (actionsConstructed.hasOwnProperty(id)) {
    console.error('Action is already constructed:',id)
    return;
  }

  let label = book1_actions[id].label

  // Create the HTML structure for the action container
  const container = document.createElement('div');
  container.id = id;
  container.className = 'action-container';
  container.innerHTML = `
    <div class="action-header">
      <span class="action-label">${label}</span>
      <span class="queue-list">Queue: 1 2 3 (+5)</span>
      <span class="action-button-container">
        <button class="action-button">⏵</button>
        <button class="queue-button">⨮</button>
      </span>
    </div>
    <div class="action-progress-container">
      <div class="action-progress-text">0% Mastery + 0% Current</div>
      <div class="action-progress-bar-mastery"></div>
      <div class="action-progress-bar-current"></div>
    </div>
  `;

  // Add the new container to the game
  document.getElementById('all-actions-container').appendChild(container);
  //container.addEventListener('mouseover', (event) => showTooltip(event, id))
  //container.addEventListener('mouseout', hideTooltip);

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

function makeActionAvailable(actionId) {
  if (gameState.actionsAvailable.includes(actionId)) {
    actionsConstructed[actionId].container.style.display = 'block';
  } else {
    gameState.actionsAvailable.push(actionId)
    createNewAction(actionId)
  }
}

function makeActionUnavailable(actionId) {
  gameState.actionsAvailable = gameState.actionsAvailable.filter(
    value => value !== actionId
  )
  gameState.actionsActive = gameState.actionsActive.filter(
    value => value !== actionId
  )
  gameState.actionsQueued = gameState.actionsQueued.filter(
    value => value !== actionId
  )
  processActiveAndQueuedActions();

  actionsConstructed[actionId].container.style.background = '#888'
  //removeAction(actionId);
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
  if (gameState.actionsAvailable.includes(actionId)) {
      const index = gameState.actionsActive.indexOf(actionId);
      if (index === 0) {return;}
      if (index > 0) {gameState.actionsActive.splice(index, 1);}
      gameState.actionsActive.unshift(actionId);
  }

  processActiveAndQueuedActions();
}

function deactivateAction(actionId) {
  gameState.actionsActive = gameState.actionsActive.filter(
    value => value !== actionId
  )
  processActiveAndQueuedActions();
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
  Object.values(actionsConstructed).forEach(actionObject => {
    // Color each active action blue, otherwise black
    if (gameState.actionsActive.includes(actionObject.id) === true) {
      actionObject.progressContainer.style.border = '2px solid blue';
      actionObject.progressBarCurrent.classList.add('active');
    } else {
      actionObject.progressContainer.style.border = '2px solid black';
      actionObject.progressBarCurrent.classList.remove('active');
    }

    // Build the queue text for each action
    actionObject.queueList.innerText = '';

    let queueText = '';
    let queueCount = 0;

    gameState.actionsQueued.forEach((queuedActionId, index) => {
      if (queuedActionId === actionObject.id) {
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
