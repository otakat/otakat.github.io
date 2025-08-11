(function(global){
  const operators = {};

  function hasIn(col, id){
    if (!col) return false;
    if (col instanceof Set) return col.has(id);
    if (Array.isArray(col)) {
      return col.includes(id) || col.some(it => (typeof it === 'object' && it.id === id));
    }
    if (typeof col === 'object') return !!col[id];
    return false;
  }

  function getItemCount(state, id){
    const inv = state?.inventory;
    if (!inv) return 0;
    if (inv instanceof Set) return inv.has(id) ? 1 : 0;
    if (Array.isArray(inv)) {
      return inv.reduce((t,it)=>{
        if (typeof it === 'string') return it === id ? t+1 : t;
        if (it && typeof it === 'object') {
          if (it.id === id) return t + (typeof it.qty === 'number' ? it.qty : 1);
        }
        return t;
      },0);
    }
    if (typeof inv === 'object') {
      const v = inv[id];
      if (typeof v === 'number') return v;
      return v ? 1 : 0;
    }
    return 0;
  }

  operators.hasItem = function(state,id,qty=1){
    return getItemCount(state,id) >= qty;
  };
  operators.hasArtifact = function(state,id){
    return hasIn(state?.artifacts, id);
  };
  operators.skillAtLeast = function(state,id,level){
    const s = state?.skills?.[id];
    const lvl = Math.max(s?.current_level || 0, s?.permanent_level || 0);
    return lvl >= level;
  };
  operators.flag = function(state,id){
    return hasIn(state?.flags, id);
  };
  operators.loopFlag = function(state,id){
    return hasIn(state?.loopFlags, id);
  };
  operators.status = function(state,id){
    return hasIn(state?.statuses, id);
  };
  operators.companion = function(state,id){
    return hasIn(state?.companions, id);
  };
  operators.timeAtLeast = function(state,seconds){
    return (state?.timeRemaining || 0) >= seconds;
  };
  operators.discovered = function(state,id){
    return operators.flag(state, `knows_${id}`);
  };
  operators.notArtifact = function(state,id){
    return !operators.hasArtifact(state,id);
  };

  function evalClause(clause,state){
    if (!Array.isArray(clause) || clause.length === 0) return false;
    const [op, ...args] = clause;
    const fn = operators[op];
    if (!fn) {
      if (typeof console !== 'undefined') {
        console.warn(`Unknown operator: ${op}`);
      }
      return false;
    }
    return fn(state, ...args);
  }

  function evaluate(conditions, state){
    if (conditions == null) return true;
    const {allOf=[], anyOf=[], noneOf=[]} = conditions;

    if (!allOf.every(cl=>evalClause(cl,state))) return false;
    if (anyOf.length && !anyOf.some(cl=>evalClause(cl,state))) return false;
    if (!noneOf.every(cl=>!evalClause(cl,state))) return false;
    return true;
  }

  function runConditionDemo(){
    const state = {inventory:{}, artifacts:{}, skills:{agility:{current_level:0, permanent_level:0}}, flags:{}, loopFlags:{}, statuses:{}, companions:[], timeRemaining:0};
    console.log('Has pocket watch?', evaluate({allOf:[["hasArtifact","pocket_watch"]]}, state));
    state.artifacts.pocket_watch = true;
    console.log('Has pocket watch after gain?', evaluate({allOf:[["hasArtifact","pocket_watch"]]}, state));
    console.log('Rope bridge discovered?', evaluate({allOf:[["discovered","rope_bridge"]]}, state));
    state.flags.knows_rope_bridge = true;
    console.log('Rope bridge discovered after flag?', evaluate({allOf:[["discovered","rope_bridge"]]}, state));
    console.log('Agility ≥1?', evaluate({allOf:[["skillAtLeast","agility",1]]}, state));
    state.skills.agility.current_level = 1;
    console.log('Agility ≥1 after raise?', evaluate({allOf:[["skillAtLeast","agility",1]]}, state));
    console.log('Nimble status?', evaluate({allOf:[["status","nimble"]]}, state));
    state.statuses.nimble = true;
    console.log('Nimble status after add?', evaluate({allOf:[["status","nimble"]]}, state));
    delete state.statuses.nimble;
    console.log('Nimble status after remove?', evaluate({allOf:[["status","nimble"]]}, state));
  }

  global.conditionOperators = operators;
  global.evaluate = evaluate;
  global.runConditionDemo = runConditionDemo;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {evaluate, conditionOperators: operators, runConditionDemo};
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
