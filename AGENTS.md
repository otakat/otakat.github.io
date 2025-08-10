# AGENTS.md – Otakat Fairy Tale Game Project Instructions

## Overview
This is a **text-based, incremental “looping” adventure game** set in an enchanted library.  
Players enter magical books, each representing a different literary trope environment.  
The first book is a whimsical-but-grounded fairy tale world with anthropomorphic characters.  
The game unfolds interface elements gradually as part of the narrative (“unfolding UI”).

## Architecture
- **Engine:** Vanilla JavaScript, HTML, CSS.
- **Structure:** Location-based “branchy corridor” model.
  - Each Location has: narrative text, actions, gates, triggers, and exits.
  - Some backtracking allowed only within designed shortcuts; most paths are forward-only.
- **Loops:** Game runs in repeated “loops” with persistent skills, artifacts, and knowledge.
- **Primary loop currency:** Countdown timer (`timeRemaining`) hidden until the player acquires the “Pocket Watch” artifact.

## Design Rules
1. **Unfolding Interface:**
   - Start with minimal UI (only action list visible).
   - Reveal Skills tab, Artifacts tab, Stopwatch, etc., only through in-world events.
2. **Narrative Tone:**
   - Whimsical, lightly humorous, grounded in fairy tale logic.
   - Anthropomorphic characters; public-domain nods allowed but subtle.
3. **Balance Philosophy:**
   - Easy onboarding in Book 1; complexity ramps in later books.
   - Small branching choices in Book 1; larger player agency in later books.
4. **Artifacts:**
   - Story-significant, may unlock mechanics (Pocket Watch unlocks stopwatch UI).
   - Persist across loops once obtained.
5. **Skills:**
   - Introduced gradually; skill checks can block actions until trained.

## Implementation Notes
- Actions have `timeCost` (seconds or minutes), default = 30s.
- UI rendering should respect minimalism; avoid clutter.
- Revisit text for a location should be shorter and acknowledge prior visits.
- Narrative thresholds for timeRemaining (50%, 25%) should trigger flavor text once per loop if stopwatch UI is hidden.

## File Structure
- `/index.html` – entry point
- `/assets/scripts/` – JS logic
- `/assets/styles/` – CSS styling
- `/assets/images/` – UI and icon graphics

## Goals for Book 1 Demo
- Playtime: ~2 hours for average player.
- End when player acquires an artifact that opens the Library.
- Reveal second locked book in Library at end (tease full game).