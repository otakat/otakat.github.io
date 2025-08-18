const itemData = {
  healing_potion: {
    label: 'Healing Potion',
    emoji: '🧪',
    description: 'Restores 10 seconds of loop time.',
    type: 'usable',
    effect() {
      setTimeRemaining(gameState.timeRemaining + 10);
      logPopupCombo('You feel time wind back a little.', 'success');
    }
  },
  smoke_bomb: {
    label: 'Smoke Bomb',
    emoji: '💣',
    description: 'Creates a smokescreen to escape.',
    type: 'usable',
    effect() {
      logPopupCombo('Poof! The smoke bomb fizzles harmlessly.', 'secondary');
    }
  },
  magic_lantern: {
    label: 'Magic Lantern',
    emoji: '🏮',
    description: 'Reveals hidden paths for a moment.',
    type: 'usable',
    effect() {
      logPopupCombo('The lantern glows, but nothing happens…', 'info');
    }
  },
  fairy_dust: {
    label: 'Fairy Dust',
    emoji: '✨',
    description: 'A pinch might hasten your step.',
    type: 'usable',
    effect() {
      logPopupCombo('You sparkle briefly.', 'info');
    }
  },
  throwing_stone: {
    label: 'Throwing Stone',
    emoji: '🪨',
    description: 'Distracts small foes when tossed.',
    type: 'usable',
    effect() {
      logPopupCombo('You toss the stone. It skitters away.', 'info');
    }
  },
  bread: {
    label: 'Bread',
    emoji: '🍞',
    description: 'A simple snack to keep you going.',
    type: 'usable',
    effect() {
      logPopupCombo('Tasty! But you\'re still hungry.', 'secondary');
    }
  },
  lucky_clover: {
    label: 'Lucky Clover',
    emoji: '🍀',
    description: 'Passively increases your luck.',
    type: 'static'
  },
  hourglass_charm: {
    label: 'Hourglass Charm',
    emoji: '⏳',
    description: 'Adds 5 seconds to your loop time.',
    type: 'static',
    apply() {
      setTimeRemaining(gameState.timeRemaining + 5);
    }
  },
  silver_feather: {
    label: 'Silver Feather',
    emoji: '🪶',
    description: 'Makes your steps lighter.',
    type: 'static'
  },
  library_card: {
    label: 'Library Card',
    emoji: '🪪',
    description: 'Grants access to certain stacks.',
    type: 'static'
  },
  mystic_orb: {
    label: 'Mystic Orb',
    emoji: '🔮',
    description: 'Whispers of distant futures surround it.',
    type: 'static'
  },
  ancient_map: {
    label: 'Ancient Map',
    emoji: '🗺️',
    description: 'Shows paths long forgotten.',
    type: 'static'
  }
};

function addItem(id, qty = 1) {
  const data = itemData[id];
  if (!data) return;
  if (!gameState.inventory[id]) {
    gameState.inventory[id] = 0;
  }
  gameState.inventory[id] += Number(qty);
  if (data.type === 'static' && typeof data.apply === 'function') {
    data.apply();
  }
  refreshInventoryUI();
}

function useItem(id) {
  const data = itemData[id];
  if (!data || data.type !== 'usable') return;
  const count = gameState.inventory[id] || 0;
  if (count <= 0) return;
  if (typeof data.effect === 'function') {
    data.effect();
  }
  gameState.inventory[id] = count - 1;
  if (gameState.inventory[id] <= 0) {
    delete gameState.inventory[id];
  }
  refreshInventoryUI();
}

function refreshInventoryUI() {
  const usable = document.getElementById('usable-items');
  const statics = document.getElementById('static-items');
  if (!usable || !statics) return;
  usable.innerHTML = '';
  statics.innerHTML = '';
  const inv = gameState.inventory || {};
  Object.keys(inv).forEach(id => {
    const count = inv[id];
    if (count <= 0) return;
    const data = itemData[id];
    if (!data) return;
    const el = document.createElement('div');
    el.className = 'item-icon';
    el.textContent = data.emoji;
    if (data.type === 'usable') {
      el.classList.add('usable');
      el.addEventListener('click', () => useItem(id));
    }
    if (count > 1) {
      const bubble = document.createElement('div');
      bubble.className = 'item-count';
      bubble.textContent = count;
      el.appendChild(bubble);
    }
    const tip = document.createElement('div');
    tip.innerHTML = `<strong>${data.label}</strong><div class="item-desc">${data.description}</div>`;
    if (data.type === 'usable') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-sm mt-1';
      btn.textContent = 'Use';
      btn.addEventListener('click', (e) => { e.stopPropagation(); useItem(id); });
      tip.appendChild(btn);
    }
    tippy(el, { content: tip, allowHTML: true, interactive: true, trigger: 'mouseenter focus', touch: ['hold', 500] });
    if (data.type === 'usable') {
      usable.appendChild(el);
    } else {
      statics.appendChild(el);
    }
  });
}


