# PRD: Stoner Benches & Math Maps

## Introduction
"Stoner Benches" is a retro-internet inspired interactive experience where users explore procedurally generated digital landscapes ("Math Maps"). Users can "claim" a spot by placing a "Bench"—a marker containing a message—at specific coordinates. Each map is generated from a unique seed. Users can refresh to generate a new world (seed), effectively entering a clean slate, while previous maps and their benches are preserved in the database.

## Goals
- **Procedural Generation:** Create visually interesting maps using grid/cellular math based on a unique seed.
- **Persistence:** Save map seeds and user-created benches to the database.
- **Interaction:** Allow users to click on the map to place a bench with a name, title, and description.
- **Discovery:** Users see existing benches on the current map but can "refresh" to explore a new, empty frontier.
- **Retro Aesthetic:** Adhere to the project's existing retro/web 1.0 vibe.

## User Stories

### US-001: Database Schema Setup
**Description:** As a developer, I need to set up the storage structure for maps and benches.

**Acceptance Criteria:**
- [ ] Create `map_seeds` table (id, seed_value, created_at).
- [ ] Create `stoner_benches` table (id, map_seed_id, x, y, title, description, author_name, created_at).
- [ ] Update `server/utils/db.ts` to include table creation logic.
- [ ] Typecheck passes.

### US-002: Math Map Generation (Visuals)
**Description:** As a user, I want to see a cool, retro-style map generated based on a seed so I can find a spot for my bench.

**Acceptance Criteria:**
- [ ] Implement a cellular/grid-based noise algorithm on an HTML5 Canvas.
- [ ] Visual style: Retro tile-based usage (e.g., pixelated terrain, Game of Life patterns).
- [ ] Algorithm is deterministic: The same seed string always produces the exact same visual output.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: Place a Bench
**Description:** As a user, I want to click a location on the map to leave a marker (Bench) with my message.

**Acceptance Criteria:**
- [ ] Clicking on the canvas opens a modal/form at (or near) the click coordinates.
- [ ] Form includes: Name (required), Title (required), Description (required).
- [ ] Submitting the form saves the bench to the DB, associated with the current map seed.
- [ ] Validates that `map_seed` entry exists (creates one if not) before saving bench.
- [ ] UI feedback: Show "placing..." state or success message.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: Display Benches
**Description:** As a user, I want to see marks where others have placed benches on the current map.

**Acceptance Criteria:**
- [ ] On map load, fetch benches associated *only* with the current seed.
- [ ] Render markers (e.g., small icons or pixels) on top of the canvas at correct x/y coordinates.
- [ ] Hovering or clicking a marker shows the bench details (Title, Description, Author).
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Refresh Map Button
**Description:** As a user, I want to generate a new map to find fresh territory.

**Acceptance Criteria:**
- [ ] "Refresh Map" button generates a new random seed client-side.
- [ ] Canvas redraws with the new seed.
- [ ] Existing markers are cleared (since they don't belong to this new seed).
- [ ] Application state updates to reflect the new empty map.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- **FR-1:** The system must generate a visual map using a deterministic algorithm based on a string/number seed.
- **FR-2:** The system must allow creating a bench record containing: `x`, `y` coordinates, `title`, `description`, `author_name`.
- **FR-3:** Benches must be strictly linked to a specific `map_seed`.
- **FR-4:** The map interaction is static (click to place), not pannable/zoomable.
- **FR-5:** Old maps are not deleted; they are just not shown unless a user hits that specific seed again.

## Non-Goals
- **Authentication:** No user login required; benches are pseudonymous.
- **Map Navigation:** No pan/zoom support.
- **Bench Editing:** Once placed, a bench cannot be edited or moved.
- **Map Listing:** No UI to browse "All Past Maps".

## Technical Considerations
- **Library:** Use standard HTML5 `<canvas>` API for rendering.
- **Algorithm:** Use a simple pseudo-random number generator (PRNG) seeded string.
- **State Management:** Use Vue `ref` to track current seed and benches list.

## Success Metrics
- Users can successfully place a bench and see it persist after a page reload/navigation if they return to that seed.
- The map generation feels distinctive and "retro".

## Open Questions
- Should we allow sharing a link to a specific map seed? (Implied yes for shared experience).
