# Ideas For Later

Future optimization and UX ideas for the clock/action system.

Scale:
- `10/10` = very high potential usefulness for Otakat
- `1/10` = low-value or niche

## Action And Clock Follow-Ups

### 1. Cache requirement results for inactive actions
- Usefulness: `9/10`
- Summary: Avoid recalculating `canStart()` and requirement clauses unless something relevant changes.
- Why it matters: Inactive actions can be numerous, and repeated requirement checks can become hidden overhead.
- Possible direction:
  - Cache `ok / blocked / unmet requirements`
  - Invalidate on skill, artifact, flag, and completion changes

### 2. Skip redundant DOM writes in action render
- Usefulness: `9/10`
- Summary: Only update text, widths, and classes when the rendered value actually changed.
- Why it matters: Even cheap DOM writes add up when many actions are visible.
- Possible direction:
  - Track last rendered label
  - Track last rendered progress and mastery widths
  - Track last rendered active / blocked / fast visual state

### 3. Break debug timing into subsystems
- Usefulness: `8/10`
- Summary: Measure which part of the frame is expensive instead of only seeing overall stutter.
- Why it matters: Makes future optimization much more surgical.
- Possible direction:
  - `actionStepMs`
  - `completionEffectsMs`
  - `actionListRefreshMs`
  - `logFlushMs`
  - `popupFlushMs`

### 4. Make requirement invalidation dependency-based
- Usefulness: `8/10`
- Summary: Only invalidate actions affected by a specific state change.
- Why it matters: Better scaling as action count grows.
- Possible direction:
  - Skill-gated actions refresh on relevant skill changes
  - Artifact-gated actions refresh on artifact changes
  - Completion-gated actions refresh on matching action completions

### 5. Throttle text updates for very fast actions
- Usefulness: `7/10`
- Summary: Update action text less often than bars/pulses for ultra-fast actions.
- Why it matters: Text churn is more expensive and less readable than visual state changes.
- Possible direction:
  - Update labels every `100-150ms` in fast mode
  - Keep pulse/bar visuals independent

### 6. Separate logical availability from visual state refresh
- Usefulness: `7/10`
- Summary: Represent action state explicitly instead of recalculating display decisions inline.
- Why it matters: Cleaner code and easier future optimization.
- Possible direction:
  - States like `hidden`, `blocked`, `available`, `active`, `exhausted`
  - Render from cached state instead of recomputing each pass

### 7. Precompute action dependency metadata
- Usefulness: `7/10`
- Summary: Let each action know which skills, artifacts, flags, and completion dependencies affect it.
- Why it matters: Makes invalidation and debugging more targeted.
- Possible direction:
  - Build dependency metadata at action construction
  - Store lists of affected skills / artifacts / actions

### 8. Defer or lazy-init tooltips
- Usefulness: `6/10`
- Summary: Initialize tooltips only when an action becomes visible or is first hovered.
- Why it matters: Reduces upfront DOM/plugin cost if the action list grows.
- Possible direction:
  - Init on first reveal
  - Or init on first hover/focus

### 9. Add a third visual tier for instant actions
- Usefulness: `6/10`
- Summary: Go beyond `normal` and `fast` with an `instant` presentation mode.
- Why it matters: Some actions may become too fast even for the current fast pulse mode.
- Possible direction:
  - `normal`
  - `fast`
  - `instant`
  - Instant mode could skip fill entirely and show a flash/pulse only

### 10. Make completion effects more event-driven
- Usefulness: `9/10`
- Summary: Completion handlers should update state first and let UI systems react afterward.
- Why it matters: This is a strong long-term cleanup for performance and code clarity.
- Possible direction:
  - Action completion emits structured events
  - UI/log/story/popup systems subscribe and render later
  - Keep simulation-authoritative state synchronous

## Good Next Candidates

If only a few ideas get implemented next, these currently look strongest:

1. Cache requirement results for inactive actions
2. Skip redundant DOM writes in action render
3. Make completion effects more event-driven
4. Break debug timing into subsystems

## Notes

- Current direction is already good: authoritative clock, lifecycle-based action timing, queued UI updates, and fast-action visuals are in place.
- These ideas are meant as later-stage cleanups and scaling improvements, not emergency fixes.
