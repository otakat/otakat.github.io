const artifactData = {
  skillbook: {
    label: "Ancient Skillbook",
    description: "Reveals the skills menu.",
  },
  timeCharm: {
    label: "Time Charm",
    description: "Increases all action speed by 10%.",
  },
  pocketwatch: {
    label: "Pocket Watch",
    description: "Reveals the flow of time left in this loop.",
  }
};

function applyArtifactEffects(id) {
  if (id === 'skillbook') {
    updateSkillsUI();
  }
}

function unlockArtifact(id) {
  if (!artifactData.hasOwnProperty(id)) {return;}
  if (!gameState.artifacts[id]) {
    gameState.artifacts[id] = true;
    if (id === 'pocketwatch') {
      hasPocketWatch = true;
      gameState.hasPocketWatch = true;
      updateTimerUI();
    }
    updateArtifactsUI();
    applyArtifactEffects(id);
    logPopupCombo('You discovered ' + artifactData[id].label + '!', 'artifact');
    if (typeof eventBus?.emit === 'function') {
      eventBus.emit('skills-change', { artifact: id });
    }
  }
}
