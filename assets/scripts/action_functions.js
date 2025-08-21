// THE ACTION CLASS
class GameAction {
  constructor(id) {
      // Initialize properties
      this.id = id;
      this.timeMultiplier = 1;
      this.needsRender = false;
      this._lastAnimElapsed = 0;

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
              progressBarMastery: this.container.querySelector('.action-progress-bar-mastery')

                        }
      // Allow clicking anywhere on the action body to toggle the action
      this.container.addEventListener('click', () => toggleAction(id));

      this.calculateTimeStart();
      this.render();
      this.needsRender = false;
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
                                  logPopupCombo(msg, 'action_failure');
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

                this.calculateTimeStart();
                this.calculateTimeMultiplier();
                const coreMs = this.data.length;
                const rate = this.timeMultiplier || 1;
                const elapsed = this.progress.timeCurrent / rate;
                const paused = isGamePaused();
                ProgressAnimationManager.start(
                  this.id,
                  this.elements.progressBarCurrent,
                  coreMs,
                  rate,
                  elapsed,
                  paused ? "paused" : "running",
                  paused
                );
                this._lastAnimElapsed = elapsed;
    if (gameState.debugMode) console.log(`Action ${this.id} started`);
                return true;
        }

        stop() {
                if (gameState.debugMode) console.log(`Action ${this.id} stopped`);
                ProgressAnimationManager.pause(this.id);
                this.syncProgress();
        }

  calculateTimeMultiplier() {
    let multiplier = 1;
    const data = this.data;

    if (doSkillsExist(data.skills)) {
      multiplier = multiplyTimeChangeBySkills(multiplier, data.skills);
    }

    const mods = challengeMods[data.challengeType];
    if (mods) {
      multiplier *= mods.speedMult ?? 1;
    }

    const locMeta = getLocationMeta(this.id);
    if (locMeta.timeMultiplier) {
      multiplier *= locMeta.timeMultiplier;
    }

    this.timeMultiplier = multiplier;
  }

  step(timeChange = 0) {
    if (typeof this.progress.timeCurrent !== 'number' || isNaN(this.progress.timeCurrent)) {
      this.progress.timeCurrent = 0;
    }
    if (typeof this.progress.timeStart !== 'number' || isNaN(this.progress.timeStart)) {
      this.progress.timeStart = 0;
    }

    if (this.progress.timeCurrent < this.progress.timeStart) {
      this.progress.timeCurrent = this.progress.timeStart;
    }

    this.syncProgress();
    this.calculateTimeStart();
    this.needsRender = true;
  }

  syncProgress() {
    const snap = ProgressAnimationManager.snapshot(this.id);
    if (!snap) return 0;
    const delta = snap.elapsedMs - this._lastAnimElapsed;
    if (delta > 0) {
      this._lastAnimElapsed = snap.elapsedMs;
      runActionTick(this, delta);
      this.needsRender = true;
    }
    return delta;
  }

  render() {
    const completedPercentage = (this.progress.timeCurrent / this.data.length) * 100;
    const masteryPercentage = (this.progress.timeStart / this.data.length) * 100;
    const label =
      completedPercentage.toFixed(1) + '% Completed (' + masteryPercentage.toFixed(1) + '% Mastery)';
    this.elements.progressText.innerText = label;
  }

  finish() {
    this.progress.completions += 1;
    if (gameState.debugMode) console.log(`Action ${this.id} finished`);
    ProgressAnimationManager.complete(this.id);
    this.progress.mastery += this.data.length;
    this.calculateTimeStart();
    this.progress.timeCurrent = this.progress.timeStart;
    if (this.elements && this.elements.progressBarMastery) {
      const masteryPercentage = (this.progress.timeStart / this.data.length) * 100;
      this.elements.progressBarMastery.style.width = masteryPercentage + '%';
    }
    deactivateAction(this.id);

    if (doSkillsExist(this.data.skills)) {
      const xpPerSkill = this.data.length / this.data.skills.length;
      this.data.skills.forEach(skill => updateSkill(skill, xpPerSkill));
    }

    this.data.completionEffects.each(this.id);

    if (this.data.completionEffects.hasOwnProperty(this.progress.completions)) {
      this.data.completionEffects[this.progress.completions](this.id);
    }

    if (this.progress.completions >= this.data.completionMax) {
      this.data.completionEffects.last(this.id);
    }

    if (gameState.debugMode) console.log(this.id);
    this.needsRender = true;
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

    this.progress.timeStart = masteryImpact * this.data.length;
    if (this.progress.timeCurrent < this.progress.timeStart) {
      this.progress.timeCurrent = this.progress.timeStart;
      if (this.elements && this.elements.progressBarCurrent) {
        const pct = (this.progress.timeCurrent / this.data.length) * 100;
        this.elements.progressBarCurrent.style.transition = 'none';
        this.elements.progressBarCurrent.style.width = pct + '%';
      }
    }
    this.needsRender = true;
  }
}

// PROCEDURES
// Build DOM for a new action and initialize its GameAction instance
function createNewAction(id) {
  if (id in actionsConstructed) { console.error('Action already constructed:', id); return; }
  if (!hasActionData(id)) { console.error('Action data does not exist:', id); return; }

  const data = getActionData(id);
  const label = data.label;
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const skillIcons = skills
    .map(skill => `<span class="action-skill-icon" data-skill="${skill}">${skillEmojis[skill] || ''}</span>`)
    .join('');

  const container = document.createElement('div');
  container.id = id;
  container.className = 'action-container';
  container.innerHTML = `
    <div class="action-header">
      <span class="action-label" data-tippy-content="Action Label">${label}</span>
      <span class="action-skills">${skillIcons}</span>
    </div>
    <div class="action-progress-container">
      <div class="action-progress-text">0% Completed (0% Mastery)</div>
      <div class="action-progress-bar-mastery progress-bar"></div>
      <div class="action-progress-bar-current progress-bar"></div>
    </div>
  `;
  document.getElementById('all-actions-container').appendChild(container);
  const tooltipButtons = container.querySelectorAll('[data-tippy-content]');
  tippy(tooltipButtons, { animation: 'shift-away', touch: true });

  const cond = getActionConfig(id)?.conditions;
  if (!gameState.actionsAvailable.includes(id) || !evaluate(cond, gameState)) {
    container.style.display = 'none';
  }

    actionsConstructed[id] = new GameAction(id);
    const barEl = actionsConstructed[id].elements.progressBarCurrent;
    const snap = gameState.progressAnimations?.[id];
    if (snap) {
      ProgressAnimationManager.restore(id, barEl, snap);
      actionsConstructed[id]._lastAnimElapsed = snap.elapsedMs;
    } else {
      const a = actionsConstructed[id];
      const coreMs = a.data.length - a.progress.timeStart;
      const rate = a.timeMultiplier || 1;
      const elapsed = (a.progress.timeCurrent - a.progress.timeStart) / rate;
      actionsConstructed[id]._lastAnimElapsed = elapsed;
      ProgressAnimationManager.start(id, barEl, coreMs, rate, elapsed, 'paused');
    }
    updateActionSkillIcons();
    processActiveAndQueuedActions();
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
  processActiveAndQueuedActions();
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
  if (a) {
    a.stop();
    ProgressAnimationManager.reset(actionId);
  }

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

function areSkillsVisible() {
  return gameState.debugMode || !!gameState.artifacts?.skillbook;
}

function updateActionSkillIcons() {
  const show = areSkillsVisible();
  Object.values(actionsConstructed).forEach(actionObject => {
    const skillsEl = actionObject.container.querySelector('.action-skills');
    if (skillsEl) {
      skillsEl.style.display = show ? 'flex' : 'none';
    }
  });
}

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
