// THE ACTION CLASS
class GameAction {
  constructor(id) {
    this.id = id;
    this.tickHandler = this.tickHandler.bind(this);
    this._listening = false;

    // Merge defaults with data
    this.data = aggregateObjectProperties(default_action, book1_actions[id]);

    // Initialize progress and skills
    this.initializeActionProgress();
    this.progress = gameState.actionsProgress[id];
    initializeSkills(this.data.skills);

    // Cache DOM elements
    this.container = document.getElementById(id);
    this.elements = {
      container: this.container,
      actionLabel: this.container.querySelector('.action-label'),
      progressContainer: this.container.querySelector('.action-progress-container'),
      progressText: this.container.querySelector('.action-progress-text'),
      progressBarCurrent: this.container.querySelector('.action-progress-bar-current'),
      progressBarMastery: this.container.querySelector('.action-progress-bar-mastery'),
      buttonStart: this.container.querySelector('#start-button'),
      buttonStop: this.container.querySelector('#stop-button'),
      buttonQueue: this.container.querySelector('#queue-button'),
      queueList: this.container.querySelector('.queue-list'),
    };

    this.calculateTimeStart();
    this.refreshProgressElements();
    this.setTooltips();
  }

  get isAvailable() { return gameState.actionsAvailable.includes(this.id); }
  get isActive() { return gameState.actionsActive.includes(this.id); }
  get isQueued() { return gameState.actionsQueued.includes(this.id); }

  canStart() {
    if (!this.data || !this.progress) return false;
    if (!this.isAvailable) return false;
    if (this.progress.completions >= this.data.completionMax) return false;
    const req = this.data.requirements;
    const res = evaluateRequirements(req);
    return res.ok;
  }

  start() {
    if (this._listening) return false;
    if (!this.canStart()) return false;
    document.addEventListener('tick', this.tickHandler);
    this._listening = true;
    return true;
  }

  stop() {
    if (!this._listening) return;
    document.removeEventListener('tick', this.tickHandler);
    this._listening = false;
  }

  tickHandler(e) {
    if (isGamePaused()) return;
    let dt = e.detail.gameDelta;

    if (this.progress.timeCurrent < this.progress.timeStart) {
      this.progress.timeCurrent = this.progress.timeStart;
    }

    if (typeof multiplyDurationBySkills === 'function') {
      dt = multiplyDurationBySkills(dt, this.data.skills);
    } else if (typeof multiplyTimeChangeBySkills === 'function') {
      dt = multiplyTimeChangeBySkills(dt, this.data.skills);
    }
    const perSkill = dt / this.data.skills.length;
    this.data.skills.forEach(s => updateSkill(s, perSkill));

    this.progress.timeCurrent += dt;
    this.progress.mastery += dt;

    if (this.progress.timeCurrent >= this.data.length) {
      this.finish();
      return;
    }

    this.refreshProgressElements();
  }

  finish() {
    this.progress.completions += 1;
    this.calculateTimeStart();
    this.progress.timeCurrent = this.progress.timeStart;
    this.refreshProgressElements();

    deactivateAction(this.id);

    const repeat = document.getElementById('repeat-action-checkbox');
    if (repeat && repeat.checked && gameState.actionsQueued.length === 0) {
      activateAction(this.id);
    }

    this.data.completionEffects.each(this.id);
  }

  setTooltips() {
    if (!window.bootstrap) return;
    const { actionLabel, buttonStart, buttonStop, buttonQueue } = this.elements;
    [buttonStart, buttonStop, buttonQueue].forEach(el => {
      if (!el) return;
      bootstrap.Tooltip.getOrCreateInstance(el);
    });
    if (actionLabel) {
      const tip = bootstrap.Tooltip.getOrCreateInstance(actionLabel);
      actionLabel.addEventListener('show.bs.tooltip', () => {
        tip.setContent({ '.tooltip-inner': 'Completions: ' + (this.progress.completions || 0) });
      });
    }
  }

  refreshProgressElements() {
    const currentPct = (this.progress.timeCurrent / this.data.length) * 100;
    const masteryPct = (this.progress.timeStart / this.data.length) * 100;
    const label = `${masteryPct.toFixed(1)}% Mastery + ${(currentPct - masteryPct).toFixed(1)}% Current`;
    this.elements.progressBarCurrent.style.width = currentPct + '%';
    this.elements.progressBarMastery.style.width = masteryPct + '%';
    this.elements.progressText.innerText = label;
  }

  initializeActionProgress() {
    const progress = gameState.actionsProgress;
    const defaultProgress = { timeStart: 0, timeCurrent: 0, mastery: 0, completions: 0 };
    if (this.id in progress) {
      progress[this.id] = aggregateObjectProperties(defaultProgress, progress[this.id]);
    } else {
      progress[this.id] = defaultProgress;
    }
  }

  calculateTimeStart() {
    const parameters = gameState.globalParameters;
    let masteryImpact = 0;
    if (this.progress.mastery !== 0) {
      masteryImpact = parameters.masteryMaxRatio * Math.atan(parameters.masteryGrowthRate * this.progress.mastery);
    }
    masteryImpact = Math.max(0, Math.min(masteryImpact, parameters.masteryMaxRatio));
    this.progress.timeStart = masteryImpact * this.data.length;
    if (this.progress.timeCurrent < this.progress.timeStart) {
      this.progress.timeCurrent = this.progress.timeStart;
    }
  }
}

// PROCEDURES
function createNewAction(id) {
  if (!(id in book1_actions)) {
    console.error('Unknown action id:', id);
    return;
  }
  if (actionsConstructed.hasOwnProperty(id)) {
    console.error('Action is already constructed:', id);
    return;
  }

  const label = book1_actions[id].label;

  const container = document.createElement('div');
  container.id = id;
  container.className = 'action-container';
  container.innerHTML = `
  <div class="action-header">
    <span class="action-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Action Label">${label}</span>
    <span class="queue-list"></span>
    <span class="action-button-container">
      <button id="start-button" class="action-button" onClick="activateAction('${id}')" data-bs-toggle="tooltip" data-bs-placement="top" title="Start this action">⏵</button>
      <button id="stop-button" class="action-button" onClick="fullyDeactivateAction('${id}')" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop this action">X</button>
      <button id="queue-button" class="action-button" onClick="queueAction('${id}')" data-bs-toggle="tooltip" data-bs-placement="top" title="Add to queue">⨮</button>
    </span>
  </div>
  <div class="action-progress-container">
    <div class="action-progress-text">0% Mastery + 0% Current</div>
    <div class="action-progress-bar-mastery progress-bar"></div>
    <div class="action-progress-bar-current progress-bar"></div>
  </div>
  `;

  document.getElementById('all-actions-container').appendChild(container);

  if (!gameState.actionsAvailable.includes(id)) {
    container.style.display = 'none';
  }

  actionsConstructed[id] = new GameAction(id);
}

function getAction(actionId) {
  return actionsConstructed.hasOwnProperty(actionId) ? actionsConstructed[actionId] : false;
}

function removeAction(actionId) {
  const actionElement = document.getElementById(actionId);
  if (actionElement) {
    actionElement.parentNode.removeChild(actionElement);
  }

  delete actionsConstructed[actionId];
  gameState.actionsAvailable = gameState.actionsAvailable.filter(id => id !== actionId);
  gameState.actionsActive = gameState.actionsActive.filter(id => id !== actionId);
  gameState.actionsQueued = gameState.actionsQueued.filter(id => id !== actionId);
  processActiveAndQueuedActions();
}

function makeActionAvailable(actionId) {
  if (gameState.actionsAvailable.includes(actionId)) {
    actionsConstructed[actionId].container.style.display = 'block';
  } else {
    gameState.actionsAvailable.push(actionId);
    createNewAction(actionId);
  }
}

function makeActionUnavailable(actionId) {
  gameState.actionsAvailable = gameState.actionsAvailable.filter(value => value !== actionId);
  gameState.actionsActive = gameState.actionsActive.filter(value => value !== actionId);
  gameState.actionsQueued = gameState.actionsQueued.filter(value => value !== actionId);
  processActiveAndQueuedActions();

  actionsConstructed[actionId].container.style.background = '#888';
}

function toggleAction(actionId) {
  const index = gameState.actionsActive.indexOf(actionId);
  if (index !== -1) {
    deactivateAction(actionId);
  } else {
    activateAction(actionId);
  }
}

function activateActionQueue() {
  const next = gameState.actionsQueued.shift();
  if (next) activateAction(next);
}

function activateAction(actionId) {
  const a = actionsConstructed[actionId];
  if (!a) {
    console.error('No GameAction object constructed:', actionId);
    return false;
  }
  const ok = a.start();
  if (ok) gameState.actionsActive.unshift(actionId);
  processActiveAndQueuedActions();
  return ok;
}

function deactivateAction(actionId) {
  const a = actionsConstructed[actionId];
  if (a) a.stop();
  gameState.actionsActive = gameState.actionsActive.filter(x => x !== actionId);
  processActiveAndQueuedActions();
}

function fullyDeactivateAction(actionId) {
  const a = actionsConstructed[actionId];
  if (a) a.stop();
  gameState.actionsActive = gameState.actionsActive.filter(x => x !== actionId);
  gameState.actionsQueued = gameState.actionsQueued.filter(x => x !== actionId);
  processActiveAndQueuedActions();
}

function queueAction(actionId) {
  gameState.actionsQueued.push(actionId);
  processActiveAndQueuedActions();
}

function processActiveAndQueuedActions() {
  // Transfer excess actions from active to the front of the queue
  if (gameState.actionsActive.length > gameState.globalParameters.actionsMaxActive) {
    const excessNumber = gameState.actionsActive.length - gameState.globalParameters.actionsMaxActive;
    const excessActions = gameState.actionsActive.splice(gameState.globalParameters.actionsMaxActive, excessNumber);
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

    if (queueText !== '') { queueText = 'Queue:' + queueText; }
    actionObject.elements.queueList.innerText = queueText;
  });
}

