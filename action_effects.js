const actionsList = {
  book1_pull_weeds: {
      label: "Pull Weeds",
      length: 5000,
      effect: function () {
        gameState.health.current = gameState.health.max;
        updateHealthBar();
        addLogEntry('Test1','id1','story');
      }
  },
  book1_talk_mom: {
      label: "Talk to Mom",
      length: 10000,
      effect: function () {
        gameState.health.max += 1000;
        updateHealthBar();
        addLogEntry('Test2','id2','story');
      }
  }
}

const storylines = {
  book1_opener: 'Once upon a time, in a quaint village nestled among lush green hills and meandering streams, there lived a young girl named Goldilocks. Known for her radiant locks that shimmered like spun gold in the sunlight, she was as spirited as she was curious. On this particular day, Goldilocks had been entrusted with an important errand by her mother. With a small basket tucked under her arm, she set out early in the morning, the dew still fresh on the grass and the air filled with the sweet chorus of birds.'
}
