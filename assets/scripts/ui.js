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

function updateLibrarySelection() {
  const current = gameState.currentBook || 'book1';
  document.querySelectorAll('.library-book-option').forEach(btn => btn.classList.remove('selected'));
  const selected = document.getElementById(current + '-option');
  if (selected) selected.classList.add('selected');
}

function openSkills() {
  if (typeof refreshSkillsUI === 'function') { refreshSkillsUI(); }
  const modal = new bootstrap.Modal(document.getElementById('skillsModal'));
  modal.show();
}

function openArtifacts() {
  const modal = new bootstrap.Modal(document.getElementById('artifactsModal'));
  modal.show();
}
