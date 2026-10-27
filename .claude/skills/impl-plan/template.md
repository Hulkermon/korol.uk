# <Title>

- **Slug / branch:** `<slug>`
- **Status:** draft
- **Goal:** <what the user has once this is done, 1–2 sentences>
- **Out of scope:** <what this plan deliberately leaves alone>

The status moves through `draft` → `approved` → `in-progress` → `verifying` → `done`.

## Tasks

| ID | Commit message | Files | Depends on | Kind | Owner | Status | Commit |
|---|---|---|---|---|---|---|---|
| T1 | `feat: …` | `path/a.ts` (new) | — | logic | implementer | todo | |
| T2 | `feat: …` | `path/b.vue`, `pages/index.vue` | T1 | logic | implementer | todo | |

The task status moves through `todo` → `running` → `review` → `committed`. A task that can't proceed is marked `blocked` with a note in the log.

## Waves

The waves are derived from **Depends on**. The manager starts each task as soon as its dependencies are committed.

1. T1
2. T2

## Briefs

### T1: `feat: …`

**Goal:** <what this commit achieves>

**Files:**
- `path/a.ts` (create): <what goes in it>

**Context:**
- <existing signatures, types, schemas, files to read with line ranges, what earlier tasks provide>

**Constraints:**
- <what not to touch, style to match, edge cases>

**Done when:**
- <checkable from the diff>

## Verification

- `pnpm build` passes.
- Browser `/<route>`: <what to look at>

## Log

- <one line per event, appended by the manager, e.g. "T1 committed abc1234" or "T2 sent back: also edited pages/index.vue">
