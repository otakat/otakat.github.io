function runActionTick(actionObj, timeChange) {
  let newTimeChange = timeChange;
  const data = actionObj.data;

  if (doSkillsExist(data.skills)) {
    newTimeChange = multiplyTimeChangeBySkills(timeChange, data.skills);
    data.skills.forEach(skill => {
      updateSkill(skill, newTimeChange / data.skills.length);
    });
  }

  const mods = challengeMods[data.challengeType];
  if (mods) {
    newTimeChange *= mods.speedMult ?? 1;
  }

  const locMeta = getLocationMeta(actionObj.id);
  if (locMeta.timeMultiplier) {
    newTimeChange *= locMeta.timeMultiplier;
  }

  actionObj.progress.timeCurrent += newTimeChange;
  actionObj.progress.mastery += newTimeChange;
  if (newTimeChange > 0) consumeTime(newTimeChange / 1000);

  if (actionObj.progress.timeCurrent >= data.length) {
    actionObj.finish();
  }

  return newTimeChange;
}

if (typeof globalThis !== 'undefined') {
  globalThis.runActionTick = runActionTick;
}
