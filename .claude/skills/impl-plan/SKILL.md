---
name: impl-plan
description: Plan any task in this repo that needs 2 or more commits. Writes an implementation plan to .claude/plans/<slug>.md that splits the work into commit-sized tasks with files, dependencies, parallel waves and self-contained briefs for implementer sub-agents, then waits for the user's approval. Use before implementing a multi-commit change, or when asked to plan, spec or break down a feature.
argument-hint: <task description>
---

# Implementation plan

You're the manager. A plan breaks the task into an ordered set of commit-sized tasks, and the `implement` skill executes it. When the user has approved the plan, an implementer sub-agent can carry out any task from its brief alone, and the manager can schedule tasks from the dependency graph alone.

A task that fits in one commit doesn't need a plan. Just do it.

## Steps

### 1. Understand the task

- Start from the sub-project map in CLAUDE.md, then read the code the task will touch. For a search that spans many files or naming conventions, use an Explore agent instead of reading everything yourself.
- If scope or behavior is ambiguous, ask the user before you plan. Use AskUserQuestion and cover everything in one round.
- Pick a short kebab-case **slug**. It becomes the plan file name and the branch name (the existing branches are plain names like `guestbook` or `ms-dos`). If `.claude/plans/<slug>.md` already exists, resume or revise it rather than starting over.

### 2. Split it into tasks

Each task is one commit:

- It touches 1–5 files. Logic changes stay small and focused. A large content change (copy, assets, data) can go in one commit.
- Its commit message is a single conventional line (`feat:`, `fix:`, `refactor:`, `chore:`, `dev:`).
- It leaves the site working once it's committed on top of its dependencies. Every commit on `main` ships, so never reference code that a later task adds.
- It has an **owner**. Use `implementer` by default. Use `manager` when writing the brief would cost more than doing the work, for example a one-line wiring change or an edit to a shared file that needs the whole picture.
- It has a **kind**: `mechanical` (renames, moves, config, boilerplate), `logic`, or `content`. The manager gives `mechanical` tasks a lower effort.

Prefer splits that let tasks run in parallel. For example, a server endpoint and the page that will call it can run side by side if the page ships with its fetch stubbed, but only when that's natural. Don't distort tasks just to get parallelism.

### 3. Set dependencies

Task B **depends on** task A when:

- B needs code, a table, an export or a route that A creates, or
- A and B touch the same file. Any two tasks that share a file need a dependency path between them, so that only one implementer edits a file at a time.

The following files are hotspots. Tasks that touch them always run one after another, chained by dependencies:

- `server/utils/db.ts`: the table bootstrap
- `pages/index.vue`: homepage nav cards
- `nuxt.config.ts`
- `package.json` and `pnpm-lock.yaml`: any `pnpm add`
- `CLAUDE.md`, for example adding a sub-project to the table

Then derive the **waves**. Wave 1 is the tasks with no dependencies. Wave *n* is the tasks whose dependencies all fall in earlier waves. Waves are for the reader only. The manager starts each task as soon as its own dependencies are committed.

### 4. Write the briefs

The brief is the only thing the implementer sees, so it must stand on its own without this conversation:

- **Goal:** what this commit achieves.
- **Files:** each path, marked create, modify or delete, with what changes in it.
- **Context:** the facts the implementer would otherwise go looking for. Include existing function signatures and types, table schemas, the conventions to match, which other files to read (with line ranges) and why, and what earlier tasks provide (exports, routes, columns). Quote short snippets. Point to long ones.
- **Constraints:** what not to touch, the style to match, and edge cases to handle.
- **Done when:** concrete items that can be checked from the diff, not "works correctly". For a task that changes logic, the test files are listed in **Files**, the brief says which behaviors they must cover, and **Done when** includes `pnpm vitest run <test files>` passing. The manager won't approve or commit the task until those tests pass.

### 5. Verification

Plan for this at the end of the branch:

- `pnpm build` passes.
- A browser check of each route that is affected, saying what to look at. Note any route that needs the `db` service for API data.

### 6. Validate before showing

- No dependency cycles, and every dependency ID exists.
- Every task touches 1–5 files.
- Every file is assigned to one task, or the tasks that share it are linked by a dependency path.
- Each hotspot file is touched by tasks that are chained one after another.
- Every brief can be understood with no access to this conversation.

### 7. Write and present

1. Copy [template.md](template.md) to `.claude/plans/<slug>.md` and fill it in, with **Status** set to `draft`. The folder is gitignored.
2. In chat, show the task table, the waves and any open questions. Don't paste the briefs, just give the file path so the user can read or edit them there.
3. **Wait for approval.** Don't create the branch or start any implementer. If the user asks for changes, update the file and present it again.
4. Once the user approves, set **Status** to `approved` and continue with the `implement` skill for this slug.
