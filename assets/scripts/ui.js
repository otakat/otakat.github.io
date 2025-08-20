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
    updateSkill(skill, 0);
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

function openSkills() {
  if (typeof refreshSkillsUI === 'function') { refreshSkillsUI(); }
  const modalEl = document.getElementById('skillsModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  // Ensure any backdrop is cleaned up when the modal closes so gameplay can resume
  modalEl.addEventListener('hidden.bs.modal', () => {
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    deletePauseState?.(pauseStates?.MODAL);
  }, { once: true });

  modal.show();
}

function openArtifacts() {
  const modal = new bootstrap.Modal(document.getElementById('artifactsModal'));
  modal.show();
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
    updateStoryUI();
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

function updateStoryUI() {
  const storyHeader = document.getElementById('story-header-text');
  if (!storyHeader) return;

  storyHeader.innerHTML = '';
  const wrapper = document.createElement('span');
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

function createPopup(text, alertType = 'system') {
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

function logPopupCombo(text, alertType = 'system', id, tag) {
  if (!gameState.alertSettings[alertType]) {
    const defaults = emptyGameState.alertSettings?.[alertType] || { popup: true, log: true };
    gameState.alertSettings[alertType] = { ...defaults };
    saveGame();
  }
  const settings = gameState.alertSettings[alertType];
  const logTag = tag || alertType;
  if (settings.log) { addLogEntry(text, id, logTag); }
  if (settings.popup) { createPopup(text, alertType); }
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
    updateLoopTimer(timeRemaining * 1000);
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
