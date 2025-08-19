function runActionTick(actionObj, timeChange) {
  const multiplier = actionObj.timeMultiplier ?? 1;
  const newTimeChange = timeChange * multiplier;
  const data = actionObj.data;

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
