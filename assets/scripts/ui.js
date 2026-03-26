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

let uiFlushScheduled = false;
let uiFlushRafId = null;
let pendingActionIds = new Set();
let pendingActionListRefresh = false;
let pendingSkillUpdates = new Set();
let pendingPopups = [];
let pendingLogEntries = [];

function scheduleUiFlush() {
  if (uiFlushScheduled) return;
  uiFlushScheduled = true;
  uiFlushRafId = requestAnimationFrame(() => {
    uiFlushRafId = null;
    flushUiWork();
  });
}

function resetUiBatchState() {
  if (uiFlushRafId !== null) {
    cancelAnimationFrame(uiFlushRafId);
    uiFlushRafId = null;
  }
  uiFlushScheduled = false;
  pendingActionIds.clear();
  pendingActionListRefresh = false;
  pendingSkillUpdates.clear();
  pendingPopups = [];
  pendingLogEntries = [];
}

function flushUiWork() {
  uiFlushScheduled = false;

  if (pendingActionIds.size > 0) {
    const actionIds = Array.from(pendingActionIds);
    pendingActionIds.clear();
    actionIds.forEach(actionId => {
      if (!actionsConstructed[actionId]) {
        createNewAction(actionId, {
          processState: false,
          initTooltip: false,
          refreshSkillIcons: false
        });
      }
    });
    initializeQueuedActionTooltips(actionIds);
    updateActionSkillIcons();
    pendingActionListRefresh = true;
  }

  if (pendingSkillUpdates.size > 0) {
    const skillIds = Array.from(pendingSkillUpdates);
    pendingSkillUpdates.clear();
    skillIds.forEach(skill => renderSkillUI(skill));
  }

  if (pendingLogEntries.length > 0) {
    const entries = pendingLogEntries;
    pendingLogEntries = [];
    entries.forEach(entry => {
      appendLogEntryToUI(entry);
      if (entry.tag === 'story') {
        appendStoryEntryToUI(entry);
      }
    });
  }

  if (pendingPopups.length > 0) {
    const popups = pendingPopups;
    pendingPopups = [];
    popups.forEach(({ text, alertType }) => renderPopup(text, alertType));
  }

  if (pendingActionListRefresh) {
    pendingActionListRefresh = false;
    processActiveAndQueuedActions();
  }
}

function queueActionCreation(actionId) {
  pendingActionIds.add(actionId);
  scheduleUiFlush();
}

function queueActionListRefresh() {
  pendingActionListRefresh = true;
  scheduleUiFlush();
}

function queueSkillUpdate(skill) {
  pendingSkillUpdates.add(skill);
  scheduleUiFlush();
}

function queuePopup(text, alertType = 'system') {
  pendingPopups.push({ text, alertType });
  scheduleUiFlush();
}

function formatLogEntry(entry) {
  return `${entry.date} (${entry.id}, ${entry.tag}) ${entry.text}\n\n`;
}

function ensureStoryWrapper() {
  const storyHeader = document.getElementById('story-header-text');
  if (!storyHeader) return null;
  let wrapper = storyHeader.querySelector('.story-header-wrapper');
  if (!wrapper) {
    storyHeader.innerHTML = '';
    wrapper = document.createElement('span');
    wrapper.className = 'story-header-wrapper';
    storyHeader.appendChild(wrapper);
  }
  return wrapper;
}

function appendLogEntryToUI(entry) {
  const logTab = document.getElementById('log-tab');
  const log = document.getElementById('game-log');
  if (!logTab || !log) return;

  const isScrolledToBottom = logTab.scrollHeight - logTab.clientHeight <= logTab.scrollTop + 1;
  log.appendChild(document.createTextNode(formatLogEntry(entry)));

  if (isScrolledToBottom) {
    logTab.scrollTop = logTab.scrollHeight;
  }
}

function appendStoryEntryToUI(entry) {
  const storyHeader = document.getElementById('story-header-text');
  const wrapper = ensureStoryWrapper();
  if (!storyHeader || !wrapper) return;

  const latest = wrapper.querySelector('.latest-story:last-of-type');
  if (latest) {
    const textNode = document.createTextNode(latest.textContent + ' ');
    latest.replaceWith(textNode);
  }

  const current = document.createElement('span');
  current.textContent = entry.text;
  current.classList.add('latest-story');
  wrapper.appendChild(current);
  storyHeader.scrollTop = storyHeader.scrollHeight;
}

function showLibrary() {
  openTab('library-pane');
  updateLibrarySelection();
}

function showBook() {
  openTab('actions-tab');
  if (typeof processActiveAndQueuedActions === 'function') { processActiveAndQueuedActions(); }
}

function showLog() {
  openTab('log-tab');
}

function selectBook(bookId) {
  gameState.currentBook = bookId;
  updateBookButton();
  showBook();
  updateLibrarySelection();
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

function updateBookButton() {
  const btn = document.getElementById('book-button');
  if (!btn) return;
  const emojiEl = btn.querySelector('.emoji');
  const labelEl = btn.querySelector('.label');
  switch (gameState.currentBook) {
    case 'book1':
    default:
      if (emojiEl) emojiEl.textContent = '🐹';
      if (labelEl) labelEl.textContent = 'Book 1';
      break;
  }
}

function refreshSkillsUI() {
  skillList.forEach(skill => {
    const nameEl = document.querySelector(`#${skill} .skill-name`);
    if (nameEl) {
      const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
      nameEl.textContent = `${skillEmojis?.[skill] || ''} ${skillName}`;
    }
    renderSkillUI(skill);
  });
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
  if (typeof updateActionSkillIcons === 'function') { updateActionSkillIcons(); }
}

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

function updateMenuButtons() {
  updateLibraryButton();
  updateSkillsUI();
  updateArtifactsUI();
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

function updateLibrarySelection() {
  const current = gameState.currentBook || 'book1';
  document.querySelectorAll('.library-book-option').forEach(btn => btn.classList.remove('selected'));
  const selected = document.getElementById(current + '-option');
  if (selected) selected.classList.add('selected');
}

function bindModalPauseState(modalEl) {
  if (!modalEl || modalEl.dataset.pauseBindingInitialized === 'true') return;

  modalEl.addEventListener('show.bs.modal', () => {
    addPauseState?.(pauseStates?.MODAL);
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    deletePauseState?.(pauseStates?.MODAL);
  });

  modalEl.dataset.pauseBindingInitialized = 'true';
}

function openSkills() {
  if (typeof refreshSkillsUI === 'function') { refreshSkillsUI(); }
  const modalEl = document.getElementById('skillsModal');
  bindModalPauseState(modalEl);
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function openArtifacts() {
  const modalEl = document.getElementById('artifactsModal');
  bindModalPauseState(modalEl);
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function addLogEntry(text, id = generateUniqueId(), tag = 'default') {
  const currentDate = new Date(Date.now())
  const timestamp = currentDate.toLocaleDateString('en-US');

  const logEntry = {
    id: id, // Implement this function to generate unique IDs
    tag: tag,
    text: text,
    date: timestamp
  };
  gameState.gameLog.push(logEntry);
  pendingLogEntries.push(logEntry);
  scheduleUiFlush();
}

function updateLogUI() {
  const logTab = document.getElementById('log-tab');
  const log = document.getElementById('game-log');

  // Check if the scrollbar is at the bottom before updating the content
  const isScrolledToBottom = logTab.scrollHeight - logTab.clientHeight <= logTab.scrollTop + 1;

  log.textContent = '';
  gameState.gameLog.forEach(entry => {
    log.appendChild(document.createTextNode(formatLogEntry(entry)));
  });

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
  wrapper.className = 'story-header-wrapper';
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

function renderPopup(text, alertType = 'system') {
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

function createPopup(text, alertType = 'system') {
  queuePopup(text, alertType);
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
  if (settings.popup) { queuePopup(text, alertType); }
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
    updateLoopTimer(timeRemainingMs);
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

  // Prevent closing the reset modal by clicking outside or pressing Escape
  const modal = new bootstrap.Modal(
    document.getElementById('resetModal'),
    { backdrop: 'static', keyboard: false }
  );
  modal.show();
  if (!gameState.artifacts?.skillbook) {unlockArtifact('skillbook');}
}
