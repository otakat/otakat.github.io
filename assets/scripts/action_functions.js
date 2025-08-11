// THE ACTION CLASS
class GameAction {
  constructor(id) {
      // Initialize properties
      this.id = id;

			// For static properties
                        this.data = getActionData(id);

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
              buttonActivate: this.container.querySelector('#start-button'),
              buttonStop: this.container.querySelector('#stop-button')
                          
                        }
      // Allow clicking anywhere on the action body to toggle the action
      this.container.addEventListener('click', () => toggleAction(id));

      // Add button effects
      this.elements.buttonActivate.addEventListener('click', (event) => {
        event.stopPropagation();
        activateAction(id);
      });
      this.elements.buttonStop.addEventListener('click', (event) => {
        event.stopPropagation();
        fullyDeactivateAction(id);
      });

      this.calculateTimeStart();
      this.update();
			processActiveAndQueuedActions()
  }

        get isAvailable() {
                const cond = getActionConfig(this.id)?.conditions;
                return gameState.actionsAvailable.includes(this.id) && evaluate(cond, gameState);
        }
        get isActive() {return gameState.actionsActive.includes(this.id);}

        canStart() {
                if (!this.data || !this.progress) {return {ok: false};}
                if (!this.isAvailable) {return {ok: false};}
                if (this.progress.completions >= this.data.completionMax) {return {ok: false};}
                const req = this.data.requirements;
                const res = evaluateRequirements(req);
                return res;
        }

        start() {
                const res = this.canStart();
                if (!res.ok) {
                        if (res.unmet) {
                                const msg = buildRequirementsMessage(res.unmet);
                                logPopupCombo(msg, 'warning');
                        } else {
                                console.error('Invalid action data');
                        }
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

        stop() {
                // Placeholder for any future stop logic
                if (gameState.debugMode) console.log(`Action ${this.id} stopped`);
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

    runActionTick(this, timeChange);

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

    if (gameState.debugMode) console.log(this.id);
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
// Build DOM for a new action and initialize its GameAction instance
function createNewAction(id) {
  if (id in actionsConstructed) { console.error('Action already constructed:', id); return; }
  if (!hasActionData(id)) { console.error('Action data does not exist:', id); return; }

  const label = getActionData(id).label;

  const container = document.createElement('div');
  container.id = id;
  container.className = 'action-container';
  container.innerHTML = `
    <div class="action-header">
      <span class="action-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Action Label">${label}</span>
      <span class="action-button-container">

        <button id="start-button" class="action-button" data-bs-toggle="tooltip" data-bs-placement="top" title="Start">⏵</button>
        <button id="stop-button" class="action-button stop-button" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop">X</button>
      </span>
    </div>
    <div class="action-progress-container">
      <div class="action-progress-text">0% Mastery + 0% Current</div>
      <div class="action-progress-bar-mastery progress-bar"></div>
      <div class="action-progress-bar-current progress-bar"></div>
    </div>
  `;
  document.getElementById('all-actions-container').appendChild(container);
  const tooltipButtons = container.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipButtons.forEach(el => new bootstrap.Tooltip(el));

  const cond = getActionConfig(id)?.conditions;
  if (!gameState.actionsAvailable.includes(id) || !evaluate(cond, gameState)) {
    container.style.display = 'none';
  }

  actionsConstructed[id] = new GameAction(id);
}

// Access a constructed GameAction safely
function getAction(id) {
  return actionsConstructed[id];
}

// Check for existence of action data
function hasActionData(id) {
  return !!getActionConfig(id);
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
    processActiveAndQueuedActions();

    // Any additional cleanup...
}

function makeActionAvailable(actionId) {
  const cond = getActionConfig(actionId)?.conditions;
  if (gameState.actionsAvailable.includes(actionId)) {
    if (evaluate(cond, gameState)) {
      actionsConstructed[actionId].container.style.display = 'block';
    }
  } else {
    gameState.actionsAvailable.push(actionId);
    createNewAction(actionId);
    if (!evaluate(cond, gameState)) {
      actionsConstructed[actionId].container.style.display = 'none';
    }
  }
}

function makeActionUnavailable(actionId) {
  fullyDeactivateAction(actionId);
  gameState.actionsAvailable = gameState.actionsAvailable.filter(v => v !== actionId);

  if (actionsConstructed[actionId]) {
    actionsConstructed[actionId].container.style.background = '#888';
    // Optionally hide:
    // actionsConstructed[actionId].container.style.display = 'none';
  }
}

function toggleAction(actionId) {
  const index = gameState.actionsActive.indexOf(actionId);
  if (index !== -1) {
    deactivateAction(actionId);
  } else {
    activateAction(actionId);
  }
}

// Start an action and add it to the active list
function activateAction(actionId) {
  const a = getAction(actionId);
  if (!a) { console.error('No GameAction constructed:', actionId); return false; }

  // Don’t add the same id twice to active
  if (gameState.actionsActive.includes(actionId)) {
    // Ensure listener is on, just in case
    a.start();
    processActiveAndQueuedActions();
    return true;
  }

  const ok = a.start();
  if (!ok) return false;

  const maxActive = gameState.globalParameters.actionsMaxActive;
  if (gameState.actionsActive.length >= maxActive) {
    const oldest = gameState.actionsActive[gameState.actionsActive.length - 1];
    deactivateAction(oldest);
  }

  gameState.actionsActive.unshift(actionId);
  processActiveAndQueuedActions();
  return true;
}

// Stop an action and remove it from the active list
function deactivateAction(actionId) {
  const a = getAction(actionId);
  if (a) a.stop();

  gameState.actionsActive = gameState.actionsActive.filter(x => x !== actionId);
  processActiveAndQueuedActions();
}


// Stop an action and remove it from the active list

function fullyDeactivateAction(actionId) {
  const a = getAction(actionId);
  if (a) a.stop();

  gameState.actionsActive = gameState.actionsActive.filter(x => x !== actionId);
  processActiveAndQueuedActions();
}

function processActiveAndQueuedActions() {
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
    } else if (!actionObject.canStart().ok) {
      actionObject.elements.progressContainer.style.border = '2px solid red';
      actionObject.elements.progressBarCurrent.classList.remove('active');
    } else {
      actionObject.elements.progressContainer.style.border = '2px solid black';
      actionObject.elements.progressBarCurrent.classList.remove('active');
    }
  })
}
