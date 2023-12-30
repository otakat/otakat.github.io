const book1_actions = {
  book1_action1: {
    label: "Action1",
    length: 5000,
    effect: function () {
      gameState.health.current = gameState.health.max;
      updateHealthBar();
      addLogEntry(storylines.book1_action1_complete);
      makeActionAvailable('book1_action2')
    },
    maxCompletions: 10,
    maxCompletionsEffect: function () {
      addLogEntry('You cannot perform this action anymore.');
      makeActionUnavailable('book1_action1');
    }
  },
  book1_action2: {
    label: "Action2",
    length: 5000,
    effect: function () {
      gameState.health.current = gameState.health.max;
      updateHealthBar();
      addLogEntry(storylines.book2_action1_complete);
      makeActionAvailable('book1_action3')
    },
    maxCompletions: 10,
    maxCompletionsEffect: function () {
      addLogEntry('You cannot perform this action anymore.');
      makeActionUnavailable('book1_action2');
    }
  },
  book1_action3: {
    label: "Action3",
    length: 5000,
    effect: function () {
      gameState.health.current = gameState.health.max;
      updateHealthBar();
      addLogEntry(storylines.book3_action1_complete);
      makeActionAvailable('book1_action4')
    },
    maxCompletions: 10,
    maxCompletionsEffect: function () {
      addLogEntry('You cannot perform this action anymore.');
      makeActionUnavailable('book1_action3');
    }
  },
  book1_action4: {
    label: "Action4",
    length: 5000,
    effect: function () {
      gameState.health.current = gameState.health.max;
      updateHealthBar();
      addLogEntry(storylines.book4_action1_complete);
      makeActionAvailable('book1_action5')
    },
    maxCompletions: 10,
    maxCompletionsEffect: function () {
      addLogEntry('You cannot perform this action anymore.');
      makeActionUnavailable('book1_action4');
    }
  },
  book1_action5: {
    label: "Action5",
    length: 5000,
    effect: function () {
      gameState.health.current = gameState.health.max;
      updateHealthBar();
      addLogEntry(storylines.book5_action1_complete);
      makeActionAvailable('book1_action6')
    },
    maxCompletions: 10,
    maxCompletionsEffect: function () {
      addLogEntry('You cannot perform this action anymore.');
      makeActionUnavailable('book1_action5');
    }
  },
  book1_action6: {
    label: "Action6",
    length: 5000,
    effect: function () {
      gameState.health.current = gameState.health.max;
      updateHealthBar();
      addLogEntry(storylines.book6_action1_complete);
      makeActionAvailable('book1_action7')
    },
    maxCompletions: 10,
    maxCompletionsEffect: function () {
      addLogEntry('You cannot perform this action anymore.');
      makeActionUnavailable('book1_action6');
    }
  },
  book1_action7: {
    label: "Action7",
    length: 5000,
    effect: function () {
      gameState.health.current = gameState.health.max;
      updateHealthBar();
      addLogEntry(storylines.book7_action1_complete);
    },
    maxCompletions: 10,
    maxCompletionsEffect: function () {
      addLogEntry('You cannot perform this action anymore.');
      makeActionUnavailable('book1_action7');
    }
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
