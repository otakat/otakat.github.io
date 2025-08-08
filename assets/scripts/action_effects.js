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
    label: "Follow the Whispering Trail",
    length: 5000,
    skills: ["curiosity", "perseverance"],
    completionMax: 1,
    completionEffects: {
      1: function(actionId) {
        logPopupCombo('The trail leads you to a moonlit glade.', 'success');
        logPopupCombo('Unlocked: ' + book1_actions['book1_action2'].label + '.', 'primary');
        makeActionAvailable('book1_action2');
      },
    }
  },
  book1_action2: {
    label: "Brew the Lantern of Dawn",
    length: 6000,
    skills: ["creativity", "resourcefulness"],
    completionMax: 1,
    completionEffects: {
      1: function(actionId) {
        logPopupCombo('The Lantern of Dawn warms your hands.', 'success');
        logPopupCombo('Unlocked: ' + book1_actions['book1_action3'].label + '.', 'primary');
        makeActionAvailable('book1_action3');
      },
    }
  },
  book1_action3: {
    label: "Aid the Silent Knight",
    length: 7000,
    skills: ["courage", "integrity"],
    completionMax: 1,
    completionEffects: {
      1: function(actionId) {
        logPopupCombo("The knight's voice returns in a rush of light.", 'success');
        logPopupCombo('Unlocked: ' + book1_actions['book1_action4'].label + '.', 'primary');
        makeActionAvailable('book1_action4');
      },
    }
  },
  book1_action4: {
    label: "Cross the Echoing Bridge",
    length: 8000,
    skills: ["courage", "perseverance"],
    completionMax: 1,
    completionEffects: {
      1: function(actionId) {
        logPopupCombo('You silence the chasm and cross safely.', 'success');
        logPopupCombo('Unlocked: ' + book1_actions['book1_action5'].label + '.', 'primary');
        makeActionAvailable('book1_action5');
      },
    }
  },
  book1_action5: {
    label: "Meet the Dreamspinner",
    length: 9000,
    skills: ["creativity", "curiosity"],
    completionMax: 1,
    completionEffects: {
      1: function(actionId) {
        logPopupCombo('The Dreamspinner weaves a doorway from your lullaby.', 'success');
        logPopupCombo('Unlocked: ' + book1_actions['book1_action6'].label + '.', 'primary');
        makeActionAvailable('book1_action6');
      },
    }
  },
  book1_action6: {
    label: "Face the Mirror Tyrant",
    length: 10000,
    skills: ["courage", "integrity", "resourcefulness"],
    completionMax: 1,
    completionEffects: {
      1: function(actionId) {
        logPopupCombo('The Mirror Tyrant shatters into a prism heart.', 'success');
        logPopupCombo('Unlocked: ' + book1_actions['book1_action7'].label + '.', 'primary');
        makeActionAvailable('book1_action7');
      },
    }
  },
  book1_action7: {
    label: "Awaken the Kingdom",
    length: 11000,
    skills: ["courage", "creativity", "curiosity", "integrity", "perseverance", "resourcefulness"],
    completionMax: 1,
    completionEffects: {
      1: function(actionId) {
        logPopupCombo('The kingdom stirs; dawn breaks anew.', 'success');
        logPopupCombo('You have completed every task.', 'warning');
        makeActionUnavailable(actionId);
      }
    }
  }
}

const storylines = {
  book1_opener: 'You awaken at the edge of the Hemlock Forest, moonlight tracing silver across the leaves.',
  book1_action1_complete: 'The trail leads you to a quiet glade.',
  book2_action1_complete: 'A lantern of pure dawnlight hangs from your belt.',
  book3_action1_complete: 'The Silent Knight rises, voice restored.',
  book4_action1_complete: 'The Echoing Bridge lies silent behind you.',
  book5_action1_complete: 'The Dreamspinner opens a doorway to the tower.',
  book6_action1_complete: 'The Mirror Tyrant collapses into glittering dust.',
  book7_action1_complete: 'Statues breathe again as the kingdom awakens.'
}
