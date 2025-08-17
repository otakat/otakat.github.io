const skillList = ["courage", "creativity", "curiosity", "integrity", "perseverance", "resourcefulness"];

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

const default_action = {
  label: "Default Action Name",
  length: 5000,
  skills: skillList,
  challengeType: 'generic',
  startEffects: {
    each: function(actionId) {return true;},
    unavailable: function(actionId) {
      logPopupCombo(getActionData(actionId).label + ' is not available to perform.', 'danger');
      return false;
    }
  },
  completionMax: 1,
  completionEffects: {
    each: function(actionId) {
      logPopupCombo('You completed ' + getActionData(actionId).label + '.', 'success');
    },
    last: function (actionId) {
      logPopupCombo('You cannot perform ' + getActionData(actionId).label + ' anymore.', 'warning');
      makeActionUnavailable(actionId);
    }
  }
};

const challengeMods = {
  combat:   { speedMult: 1.0 },
  explore:  { speedMult: 1.1 },
  puzzle:   { speedMult: 0.9 },
  resource: { speedMult: 1.0 }
};

const actionRegistry = {
  book1: {
    hemlockForest: {
      meta: {
        timeMultiplier: 1,
        opener:
          'You boot up at the edge of Hemlock Forest, neon dawn flickering through the branches.'
      },
      actions: {
        followWhisperingTrail: {
          label: "Follow the Whispering Trail",
          length: 5000,
          skills: ["curiosity", "perseverance"],
          challengeType: 'explore',
          story: {
            completion: 'The trail leads you to a quiet glade.'
          },
          completionMax: 1,
          completionEffects: {
            1: function(actionId) {
              logPopupCombo(getActionData(actionId).story.completion, 'success', undefined, 'story');
              unlockArtifact('pocketwatch');
              const nextId = 'book1.hemlockForest.brewLanternOfDawn';
              logPopupCombo('Unlocked: ' + getActionData(nextId).label + '.', 'primary');
              makeActionAvailable(nextId);
            },
          }
        },
        brewLanternOfDawn: {
          label: "Brew the Lantern of Dawn",
          length: 6000,
          skills: ["creativity", "resourcefulness", "courage"],
          story: {
            completion: 'A lantern of pure dawnlight hangs from your belt.'
          },
          completionMax: 10,
          completionEffects: {
            1: function(actionId) {
              logPopupCombo(getActionData(actionId).story.completion, 'success', undefined, 'story');
              const nextId = 'book1.hemlockForest.aidSilentKnight';
              logPopupCombo('Unlocked: ' + getActionData(nextId).label + '.', 'primary');
              makeActionAvailable(nextId);
            },
          }
        },
        aidSilentKnight: {
          label: "Aid the Silent Knight",
          length: 7000,
          skills: ["courage", "integrity"],
          requirements: {
            mode: 'any',
            clauses: [
              { type: 'skill', key: 'courage', min: 2 },
              { type: 'artifact', id: 'braveryAmulet', owned: true }
            ]
          },
          challengeType: 'combat',
          story: {
            completion: 'The Silent Knight rises, voice restored.'
          },
          completionMax: 1,
          completionEffects: {
            1: function(actionId) {
              logPopupCombo(getActionData(actionId).story.completion, 'success', undefined, 'story');
              const nextId = 'book1.hemlockForest.crossEchoingBridge';
              logPopupCombo('Unlocked: ' + getActionData(nextId).label + '.', 'primary');
              makeActionAvailable(nextId);
            },
          }
        },
        crossEchoingBridge: {
          label: "Cross the Echoing Bridge",
          length: 8000,
          skills: ["courage", "perseverance"],
          story: {
            completion: 'The Echoing Bridge lies silent behind you.'
          },
          completionMax: 1,
          completionEffects: {
            1: function(actionId) {
              logPopupCombo(getActionData(actionId).story.completion, 'success', undefined, 'story');
              const nextId = 'book1.hemlockForest.meetDreamspinner';
              logPopupCombo('Unlocked: ' + getActionData(nextId).label + '.', 'primary');
              makeActionAvailable(nextId);
            },
          }
        },
        meetDreamspinner: {
          label: "Meet the Dreamspinner",
          length: 9000,
          skills: ["creativity", "curiosity"],
          story: {
            completion: 'The Dreamspinner opens a doorway to the tower.'
          },
          completionMax: 1,
          completionEffects: {
            1: function(actionId) {
              logPopupCombo(getActionData(actionId).story.completion, 'success', undefined, 'story');
              const nextId = 'book1.hemlockForest.faceMirrorTyrant';
              logPopupCombo('Unlocked: ' + getActionData(nextId).label + '.', 'primary');
              makeActionAvailable(nextId);
            },
          }
        },
        faceMirrorTyrant: {
          label: "Face the Mirror Tyrant",
          length: 10000,
          skills: ["courage", "integrity", "resourcefulness"],
          story: {
            completion: 'The Mirror Tyrant collapses into glittering dust.'
          },
          completionMax: 1,
          completionEffects: {
            1: function(actionId) {
              logPopupCombo(getActionData(actionId).story.completion, 'success', undefined, 'story');
              const nextId = 'book1.hemlockForest.awakenKingdom';
              logPopupCombo('Unlocked: ' + getActionData(nextId).label + '.', 'primary');
              makeActionAvailable(nextId);
            },
          }
        },
        awakenKingdom: {
          label: "Awaken the Kingdom",
          length: 11000,
          skills: ["courage", "creativity", "curiosity", "integrity", "perseverance", "resourcefulness"],
          story: {
            completion: 'Statues breathe again as the kingdom awakens.'
          },
          completionMax: 1,
          completionEffects: {
            1: function(actionId) {
              logPopupCombo(getActionData(actionId).story.completion, 'success', undefined, 'story');
              logPopupCombo('You have completed every task.', 'warning');
              makeActionUnavailable(actionId);
            }
          }
        }
      }
    }
  }
};

function parseActionId(id) {
  const [bookId, locationId, actionId] = id.split('.');
  return { bookId, locationId, actionId };
}

function getActionConfig(id) {
  const { bookId, locationId, actionId } = parseActionId(id);
  return actionRegistry[bookId]?.[locationId]?.actions[actionId];
}

function getActionData(id) {
  const cfg = getActionConfig(id);
  if (!cfg) return null;
  return aggregateObjectProperties(default_action, cfg);
}

function getLocationMeta(id) {
  const { bookId, locationId } = parseActionId(id);
  return actionRegistry[bookId]?.[locationId]?.meta || {};
}

if (typeof globalThis !== 'undefined') {
  globalThis.skillList = skillList;
  globalThis.artifactData = artifactData;
  globalThis.default_action = default_action;
  globalThis.challengeMods = challengeMods;
  globalThis.actionRegistry = actionRegistry;
  globalThis.getActionConfig = getActionConfig;
  globalThis.getActionData = getActionData;
  globalThis.getLocationMeta = getLocationMeta;
}
