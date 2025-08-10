// THE ACTION CLASS
class GameAction {
  constructor(id) {
      // Initialize properties
      this.id = id;

			// For static properties
			this.data = aggregateObjectProperties(default_action, book1_actions[id]);

			// For progress-based properties
			this.initializeActionProgress();
			this.progress = new Proxy(gameState.actionsProgress[id], {
				get (target, property) {return target[property];},
				set (target, property, value) {
					target[property] = sanitizeNumber(value);
					return true;
				}
			});

                        this.container = document.getElementById(id);
                        this.elements = {
                                container: this.container,
              progressContainer: this.container.querySelector('.action-progress-container'),
              progressText: this.container.querySelector('.action-progress-text'),
              progressBarCurrent: this.container.querySelector('.action-progress-bar-current'),
              progressBarMastery: this.container.querySelector('.action-progress-bar-mastery'),
              buttonActivate: this.container.querySelector('.action-button'),
              buttonQueue: this.container.querySelector('.queue-button'),
              queueList: this.container.querySelector('.queue-list')
                        }
      // Allow clicking anywhere on the action body to toggle the action
      this.container.addEventListener('click', () => toggleAction(id));

      // Add button effects
      this.elements.buttonActivate.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleAction(id);
      });
      this.elements.buttonQueue.addEventListener('click', (event) => {
        event.stopPropagation();
        queueAction(id);
      });

      this.calculateTimeStart();
      this.update();
			processActiveAndQueuedActions()
  }

        get isAvailable() {return gameState.actionsAvailable.includes(this.id);}
        get isActive() {return gameState.actionsActive.includes(this.id);}
        get isQueued() {return gameState.actionsQueued.includes(this.id);}

        canStart() {
                if (!this.data || !this.progress) {return false;}
                if (!this.isAvailable) {return false;}
                if (this.progress.completions >= this.data.completionMax) {return false;}
                const req = this.data.requirements;
                const res = evaluateRequirements(req);
                return res.ok;
        }

        start() {
                if (!this.data || !this.progress) {
        console.error('Invalid action data');
        return false;
    }
                const req = this.data.requirements;
                const res = evaluateRequirements(req);
                if (!res.ok) {
                  const msg = buildRequirementsMessage(res.unmet);
                  logPopupCombo(msg, 'warning');
                  return false;
                }

                const effects = this.data.startEffects;
                const completions = this.progress.completions;

		// Execute the unavailable effect (and usually halt start)
		if ('unavailable' in effects && !this.isAvailable) {
			const continueAfterUnavailable = effects.unavailable(this.id);
			if (!continueAfterUnavailable) {return false;}
		}

		// Execute the completions-based effect and halt start if needed
		if (completions in effects) {
			const continueAfterCompletions = effects[completions](this.id);
			if (!continueAfterCompletions)	{return false};
		}

                if ('each' in effects) {
                        const continueAfterEach = effects.each(this.id);
                        if (!continueAfterEach) {return false;}
                }
                if (gameState.debugMode) console.log(`Action ${this.id} started`);
                return true;
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
                if (doSkillsExist(this.data.skills)) {
                        newTimeChange = multiplyTimeChangeBySkills(timeChange, this.data.skills);
                        this.data.skills.forEach(skill => {
                                updateSkill(skill, newTimeChange / this.data.skills.length);
                        });
                }

                const mods = challengeMods[this.data.challengeType];
                if (mods) {
                  newTimeChange *= mods.speedMult ?? 1;
                  this.data.healthCostMultiplier = mods.healthCostMultiplier ?? this.data.healthCostMultiplier;
                }

                // Process time change
    this.progress.timeCurrent += newTimeChange;
    this.progress.mastery += newTimeChange;

    if (this.progress.timeCurrent >= this.data.length) {
      this.finish();
    }

    this.calculateTimeStart();

    const currentPercentage = (this.progress.timeCurrent / this.data.length) * 100;
    const masteryPercentage = (this.progress.timeStart / this.data.length) * 100;
    const label = masteryPercentage.toFixed(1) + '% Mastery + ' + (currentPercentage - masteryPercentage).toFixed(1) + '% Current';

    this.elements.progressBarCurrent.style.width = currentPercentage + '%';
    this.elements.progressText.innerText = label;
    this.elements.progressBarMastery.style.width = masteryPercentage + '%';

  }

    finish() {
      this.progress.completions += 1;
      if (gameState.debugMode) console.log(`Action ${this.id} finished`);
      this.calculateTimeStart();
      this.progress.timeCurrent = this.progress.timeStart;
      this.update();
      deactivateAction(this.id);

    this.data.completionEffects.each(this.id);

		if (this.data.completionEffects.hasOwnProperty(this.progress.completions)) {
			this.data.completionEffects[this.progress.completions](this.id);
		}

    if (this.progress.completions >= this.data.completionMax) {
      this.data.completionEffects.last(this.id);
    }

    console.log(this.id);
  }

  initializeActionProgress() {
		let progress = gameState.actionsProgress;
		const defaultProgress = {
			timeStart: 0,
			timeCurrent: 0,
			mastery: 0,
			completions: 0
		};

		if (!(this.id in progress)) {
			progress[this.id] = defaultProgress;
		} else {
			progress[this.id] = aggregateObjectProperties(defaultProgress, progress[this.id]);
		}
  }

  calculateTimeStart() {
    const parameters = gameState.globalParameters;

    let masteryImpact = 0;
    if (this.progress.mastery === 0) {
      masteryImpact = 0;
    } else {
      masteryImpact = parameters.masteryMaxRatio * Math.atan(parameters.masteryGrowthRate * this.progress.mastery);
    }
    masteryImpact = Math.max(0, Math.min(masteryImpact, parameters.masteryMaxRatio));

    this.progress.timeStart = masteryImpact * this.data.length
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
      <span class="queue-list"></span>
      <span class="action-button-container">
        <button class="action-button" data-bs-toggle="tooltip" data-bs-title="Start">⏵</button>
        <button class="queue-button" data-bs-toggle="tooltip" data-bs-title="Queue">⨮</button>
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
  const tooltipButtons = container.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipButtons.forEach(el => new bootstrap.Tooltip(el));

  // Hide the container if the action is not currently available
  if (gameState.actionsAvailable.includes(id) === false) {
    container.style.display = "none";
  }

  // Initialize the GameAction for this container
  actionsConstructed[id] = new GameAction(id);
}

function getAction(actionId) {
	return actionsConstructed.hasOwnProperty(actionId) ? actionsConstructed[actionId] : false;
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
  if (index !== -1) {
    deactivateAction(actionId);
  } else {
    activateAction(actionId);
  }
}

function activateAction(actionId) {
	if (actionsConstructed[actionId] === undefined) {
		console.error("No GameAction object constructed: ",actionId)
	}
	const startSuccessful = actionsConstructed[actionId].start();
	console.log(startSuccessful);

  if (startSuccessful) {
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
  if (gameState.actionsActive.length > gameState.globalParameters.actionsMaxActive) {
    let excessNumber = gameState.actionsActive.length - gameState.globalParameters.actionsMaxActive;
    let excessActions = gameState.actionsActive.splice(gameState.globalParameters.actionsMaxActive, excessNumber);
    gameState.actionsQueued.unshift(...excessActions);
  }

  const queueExtrasThreshold = 3;
  Object.values(actionsConstructed).forEach(actionObject => {
    if (actionObject.progress.completions >= actionObject.data.completionMax && !gameState.debugMode) {
      actionObject.container.style.display = 'none';
      return;
    } else {
      actionObject.container.style.display = 'block';
    }

    if (gameState.actionsActive.includes(actionObject.id)) {
      actionObject.elements.progressContainer.style.border = '2px solid blue';
      actionObject.elements.progressBarCurrent.classList.add('active');
    } else if (!actionObject.canStart()) {
      actionObject.elements.progressContainer.style.border = '2px solid red';
      actionObject.elements.progressBarCurrent.classList.remove('active');
    } else {
      actionObject.elements.progressContainer.style.border = '2px solid black';
      actionObject.elements.progressBarCurrent.classList.remove('active');
    }

    // Build the queue text for each action
    actionObject.elements.queueList.innerText = '';

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
    actionObject.elements.queueList.innerText = queueText;
  })
}
