function showLibrary() {
  document.getElementById('library-pane').classList.remove('d-none');
  document.getElementById('main-pane').classList.add('d-none');
  document.getElementById('settings-pane').classList.add('d-none');
}

function showBook() {
  document.getElementById('library-pane').classList.add('d-none');
  document.getElementById('settings-pane').classList.add('d-none');
  document.getElementById('main-pane').classList.remove('d-none');
}

function openSkills() {
  const modal = new bootstrap.Modal(document.getElementById('skillsModal'));
  modal.show();
}

function openArtifacts() {
  const modal = new bootstrap.Modal(document.getElementById('artifactsModal'));
  modal.show();
}
