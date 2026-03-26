function runActionTick(actionObj) {
  if (actionObj.progress.timeCurrent >= actionObj.getTimeCost()) {
    actionObj.finish();
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.runActionTick = runActionTick;
}
