const skillList = ["courage", "creativity", "curiosity", "integrity", "perseverance", "resourcefulness"];

// Emoji mapping for skills
const skillEmojis = {
  courage: '🦁',
  creativity: '🎨',
  curiosity: '🔍',
  integrity: '🧭',
  perseverance: '💪',
  resourcefulness: '🛠️'
};
globalThis.skillEmojis = skillEmojis;

function doSkillsExist(skillOrSkills) {
  // Define valid skills
  const validSkills = skillList;

  // Initialize skills in gameState if not present
  if (!gameState.hasOwnProperty("skills")) {
    gameState.skills = {};
  }

  // Abort if no skills were provided
  if (skillOrSkills === undefined) {return false;}

  function checkAndInitSkill(skill) {
    if (!validSkills.includes(skill)) {
      return false;
    } else {
      if (!gameState.skills.hasOwnProperty(skill)) {
        gameState.skills[skill] = {
          current_level: 0,
          current_progress: 0,
          permanent_level: 0,
          permanent_progress: 0
        };
      }
      return true;
    }
  }

  if (Array.isArray(skillOrSkills)) { // If an array was provided
    for (let skill of skillOrSkills) {
      if (!checkAndInitSkill(skill)) {return false;}
    }
    return true;
  } else { // If single skill provided
    return checkAndInitSkill(skillOrSkills);
  }
}

function multiplyTimeChangeBySkills(timeChange, skills){
  let multipliers = skills.map(skill => {
    const currentLevel = gameState.skills[skill].current_level
    const permanentLevel = gameState.skills[skill].permanent_level

    return Math.pow(1.1, currentLevel) * Math.pow(1.01, permanentLevel);
  });

  let sum = multipliers.reduce((accumulator, currentValue) =>
    accumulator + currentValue,
  );
  let averageMultiplier = sum / multipliers.length;
  if (gameState.artifacts?.timeCharm) {
    averageMultiplier *= 1.1;
  }

  const newTimeChange = timeChange * averageMultiplier
  return newTimeChange;
}

function updateSkill(skill, timeChange) {
  if (!doSkillsExist(skill)) {return false;}

  let skill_to_update = gameState.skills[skill]

  const skillEl = document.getElementById(skill);
  const currentLevelEl = document.getElementById(skill + '-current-level');
  const currentProgressEl = document.getElementById(skill + '-current-progress');
  const permanentLevelEl = document.getElementById(skill + '-permanent-level');
  const permanentProgressEl = document.getElementById(skill + '-permanent-progress');

  skill_to_update.current_progress += timeChange;
  if (skill_to_update.current_progress >= currentExperienceToLevel) {
    skill_to_update.current_level += 1;
    skill_to_update.current_progress -= currentExperienceToLevel;
    const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
    logPopupCombo(`${skillName} improved to ${skill_to_update.current_level}.`, 'skill_level');
  }
  let currentProgressPercentage = skill_to_update.current_progress / currentExperienceToLevel * 100;

  skill_to_update.permanent_progress += timeChange;
  if (skill_to_update.permanent_progress >= permanentExperienceToLevel) {
    skill_to_update.permanent_level += 1;
    skill_to_update.permanent_progress -= permanentExperienceToLevel;
    const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
    logPopupCombo(`${skillName} mastery increased to ${skill_to_update.permanent_level}.`, 'skill_level');
  }
  let permanentProgressPercentage = skill_to_update.permanent_progress / permanentExperienceToLevel * 100;

  currentLevelEl.innerText = 'Current Loop: ' + skill_to_update.current_level;
  currentProgressEl.style.width = currentProgressPercentage + '%';
  permanentLevelEl.innerText = 'Permanent: ' + skill_to_update.permanent_level;
  permanentProgressEl.style.width = permanentProgressPercentage + '%';

  skillEl.classList.remove('d-none');
  if (typeof eventBus?.emit === 'function') {
    eventBus.emit('skills-change', { skill });
  }
}

function recordStartingPermanentLevels() {
  startingPermanentLevels = {};
  skillList.forEach(skill => {
    if (gameState.skills.hasOwnProperty(skill)) {
      startingPermanentLevels[skill] = gameState.skills[skill].permanent_level;
    } else {
      startingPermanentLevels[skill] = 0;
    }
  });
}
