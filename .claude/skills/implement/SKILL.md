---
name: implement
description: Manage a task that needs 2 or more commits. It works from an approved plan in .claude/plans/, delegates each commit-sized task to implementer sub-agents (several at once where the dependency graph allows), reviews and commits each result on a feature branch, then verifies with a build and a browser check. Use for any multi-commit change. If no approved plan exists, it runs impl-plan first.
argument-hint: '[plan slug | task description]'
---

# Implement

You're the manager. You schedule, review and commit. Implementer sub-agents write most of the code. The plan file is the source of truth for progress, so keep it current. That way the work survives context compaction and can be resumed in a new session.

## 1. Get an approved plan

- If the argument names an existing `.claude/plans/<slug>.md`, read it.
  - Status `draft`: present it and wait for approval (step 7 of the `impl-plan` skill).
  - Status `approved`, `in-progress` or `verifying`: continue. When resuming, tasks marked `running` or `review` have no live agent anymore. If their files have uncommitted changes, review those changes as a returned result (section 4). Otherwise set the task back to `todo`.
- Otherwise, run the `impl-plan` skill first. Never start implementing without the user's approval of the plan.

## 2. Branch

- Run `git status --short`. If there are changes this plan didn't make, ask the user what to do. Never commit or stash their work.
- Switch to the plan's branch: `git switch <slug>` if it exists, otherwise `git switch -c <slug>` from `main`. Never commit to `main`.
- **Never push.** Pushing `main` deploys to production, so merging and pushing are left to the user.
- Set the plan's **Status** to `in-progress`.

## 3. Run the queue

Repeat until every task is `committed`:

1. **Ready** tasks are `todo` tasks whose dependencies are all `committed`.
2. **Start** ready tasks while fewer than 3 implementers are running. Send all of a batch's launches in one response.
   - For **Owner `implementer`**, call the Agent tool with `subagent_type: "implementer"` and `description: "<ID>: <commit message>"`. The prompt is the task's brief, copied verbatim from the plan, plus one line naming the files that other running tasks own, so the implementer ignores those changes. For `mechanical` tasks, pass `effort: "lower"`.
   - For **Owner `manager`**, do the task yourself, then go straight to review and commit.
   - Mark the task `running`.
3. Agents run in the background and notify you when they finish, so don't poll. When one finishes, mark its task `review` and review it (section 4). If it passes, commit it (section 5). Then go back to step 1, so newly unblocked tasks start right away while other tasks are still running.

## 4. Review a result

1. **Report.** If the status is `partial` or `blocked`, read why. Fix the brief, or the plan if a file or dependency is missing. Tell the user if the plan changes materially. Then continue the same agent with SendMessage (load it via ToolSearch if needed), or finish the work yourself if it's small.
2. **Scope.** In `git status --short`, every changed path must belong to this task or to a task that is still running. If something else changed, have the implementer undo it, or check that the change is only the implementer's and run `git restore` on it yourself.
3. **Diff.** Run `git diff -- <task files>` and read any new files in full. Check the diff against:
   - the brief's **Done when** items;
   - CLAUDE.md: sub-project isolation, scoped styles, no imports across sub-projects, parameterized SQL, prettier style;
   - the idiom of the surrounding code.

   Look out for unrequested refactors, debug leftovers, styles that leak globally, and secrets.
4. **Fix.** Fix small problems yourself, since that's cheaper than a round trip. For bigger problems, send specific feedback to the same implementer with SendMessage, which keeps its context. If it still isn't right after two rounds, do it yourself or re-plan the task.
5. Add one line to the plan's **Log** for the outcome.

## 5. Commit

1. Run `git add -- <exact task files>`, including deleted files. Never use `git add -A`, `.` or `-u`, because other implementers' unfinished work is in the same tree.
2. Run `git diff --cached --stat` and confirm the staged changes are exactly this task's files, 1–5 of them.
3. Run `git commit -m "<commit message from the plan>"`. The message is one line with no body and no trailers, so no `Co-Authored-By`.
4. In the plan, mark the task `committed`, record the short hash, and add a line to the log.

## 6. Verify the branch

After the last commit, set **Status** to `verifying`.

1. Run `pnpm build`. If it fails, fix the cause in a new focused `fix:` commit. Do it yourself if it's small, or write a brief for an implementer. Never amend or rewrite earlier commits.
2. **Browser check.** For each route in the plan's **Verification** section, use the `run` skill to start the app (`pnpm dev` on port 3000), then open the route. Check the behavior the plan lists and look at the console for errors. Routes that call `/api/*` need the `db` MySQL service (`MYSQL_HOST=db` in the devcontainer). If no browser can be driven here, say so and list what the user should check by hand.
3. Fix whatever turns up as new commits, then run the build again.
4. Set **Status** to `done`.

## 7. Report

Report the branch, every commit (short hash and message), what was verified (the build, the routes checked, and anything you couldn't check), and any open concerns. Finish by reminding the user that nothing has been pushed, and that merging and pushing to `main` deploys.

## Keeping token use low

- Implementers get their brief and nothing else. Never paste the whole plan or the conversation into a prompt.
- The diff is what you review. Don't re-read whole files the implementer only touched lightly.
- For follow-ups, use SendMessage to the implementer that did the work rather than starting a fresh agent.
