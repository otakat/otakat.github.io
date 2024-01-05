const skillList = ["courage", "creativity", "curiosity", "integrity", "perseverance", "resourcefulness"];

const default_action = {
  label: "Default Action Name",
  length: 5000,
  skills: skillList,
  startEffects: {
    each: function(actionId) {return true;},
    unavailable: function(actionId) {
      logPopupCombo(getAction(actionId).data.label + ' is not available to perform.', 'danger')
      return false;
    }
  },
  completionMax: 1,
  completionEffects: {
    each: function(actionId) {
      logPopupCombo('You completed ' + getAction(actionId).data.label + '.', 'success');
    },
    last: function (actionId) {
      logPopupCombo('You cannot perform ' + getAction(actionId).data.label + ' anymore.', 'warning');
      makeActionUnavailable(actionId);
    }
  }
}

const book1_actions = {
  book1_action1: {
    label: "Action1: Curiosity x2 + Perseverance",
    length: 5000,
    skills: ["curiosity", "curiosity", "perseverance"],
    completionMax: 5,
    startEffects: {
      each: function(actionId) {
        if (gameState.health.current < gameState.health.max / 2) {
          logPopupCombo('You are too tired to attempt this action.', 'danger')
          return false;
        }
        return true;
      },
    },
    completionEffects: {
      1: function (actionId) {
        logPopupCombo('You unlocked ' + book1_actions['book1_action2'].label + '.', 'primary');
        makeActionAvailable('book1_action2');
      },
    }
  },
  book1_action2: {
    label: "Action2: Courage",
    length: 6000,
    skills: ["curiosity", "curiosity", "perseverance"],
    completionMax: 5,
    completionEffects: {
      1: function (actionId) {
        logPopupCombo('You unlocked ' + book1_actions['book1_action3'].label + '.', 'primary');
        makeActionAvailable('book1_action3');
      },
    }
  },
  book1_action3: {
    label: "Action3: Integrity + Resourcefulness",
    length: 7000,
    skills: ["integrity", "resourcefulness"],
    completionMax: 5,
    completionEffects: {
      1: function (actionId) {
        logPopupCombo('You unlocked ' + book1_actions['book1_action4'].label + '.', 'primary');
        makeActionAvailable('book1_action4');
      },
    }
  },
  book1_action4: {
    label: "Action4: Creativity x3 + Courage",
    length: 8000,
    skills: ["creativity", "creativity", "creativity", "courage"],
    completionMax: 5,
    completionEffects: {
      1: function (actionId) {
        logPopupCombo('You unlocked ' + book1_actions['book1_action5'].label + '.', 'primary');
        makeActionAvailable('book1_action5');
      },
    }
  },
  book1_action5: {
    label: "Action5: Courage, Creativity, Curiosity, Integrity, Perseverance",
    length: 9000,
    skills: ["courage", "creativity", "curiosity", "integrity", "perseverance"],
    completionMax: 5,
    completionEffects: {
      1: function (actionId) {
        logPopupCombo('You unlocked ' + book1_actions['book1_action6'].label + '.', 'primary');
        makeActionAvailable('book1_action6');
      },
    }
  },
  book1_action6: {
    label: "Action6: Resourcefulness Part 1",
    length: 10000,
    skills: ["resourcefulness"],
    completionMax: 5,
    completionEffects: {
      1: function (actionId) {
        logPopupCombo('You unlocked ' + book1_actions['book1_action7'].label + '.', 'primary');
        makeActionAvailable('book1_action7');
      },
    }
  },
  book1_action7: {
    label: "Action7: Resourcefulness Part 2",
    length: 11000,
    skills: ["resourcefulness"],
    completionMax: 5,
  }
}

const storylines = {
  book1_opener: 'Once upon a time, in a quaint village nestled among lush green hills and meandering streams, there lived a young girl named Goldilocks. Known for her radiant locks that shimmered like spun gold in the sunlight, she was as spirited as she was curious. On this particular day, Goldilocks had been entrusted with an important errand by her mother. With a small basket tucked under her arm, she set out early in the morning, the dew still fresh on the grass and the air filled with the sweet chorus of birds.',
  book1_action1_complete: 'You have completed ' + book1_actions.book1_action1.label + ' and have unlocked ' + book1_actions.book1_action2.label + '.',
  book2_action1_complete: 'You have completed ' + book1_actions.book1_action2.label + ' and have unlocked ' + book1_actions.book1_action3.label + '.',
  book3_action1_complete: 'You have completed ' + book1_actions.book1_action3.label + ' and have unlocked ' + book1_actions.book1_action4.label + '.',
  book4_action1_complete: 'You have completed ' + book1_actions.book1_action4.label + ' and have unlocked ' + book1_actions.book1_action5.label + '.',
  book5_action1_complete: 'You have completed ' + book1_actions.book1_action5.label + ' and have unlocked ' + book1_actions.book1_action6.label + '.',
  book6_action1_complete: 'You have completed ' + book1_actions.book1_action6.label + ' and have unlocked ' + book1_actions.book1_action7.label + '.',
  book7_action1_complete: 'You have completed ' + book1_actions.book1_action7.label + ' and have unlocked ' + 'nothing.'
}
