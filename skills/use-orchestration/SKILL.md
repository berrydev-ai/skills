---
name: use-orchestration
description: Plan, coordinate, execute, and verify non-trivial engineering work with explicit task tracking, focused subagents, autonomous root-cause debugging, and correction-driven lessons. Use for tasks with three or more steps, architectural decisions, complex implementation, bug reports, failing tests or CI, or work that needs rigorous planning and proof before completion.
---

# Use Orchestration

Orchestrate engineering work from plan through proof. Keep the implementation simple, the impact narrow, and the user informed without requiring them to manage the investigation.

## 1. Start with project memory

1. Locate the project root.
2. Read `tasks/lessons.md` when it exists.
3. Select the lessons relevant to the current task and apply them to the plan.
4. Preserve existing task files and user content. Add or update only the sections needed for the current work.

Do not create `tasks/lessons.md` merely to satisfy this step. Create it after the first user correction.

## 2. Plan non-trivial work

Treat work as non-trivial when it has three or more meaningful steps, requires an architectural or cross-cutting decision, or has material uncertainty or risk.

For every non-trivial task:

1. Enter the host environment's plan mode when available. Otherwise use its planning mechanism and record the plan directly.
2. Write a detailed, checkable plan in `tasks/todo.md` before implementation. Include scope, assumptions, affected areas, dependencies, implementation steps, and verification steps.
3. Check in with the user before implementation by presenting the plan and any consequential assumptions. A concise plan update is sufficient unless the environment requires explicit approval or a decision would materially change scope.
4. Track progress by marking items complete as they finish.
5. Include verification in the original plan rather than appending it after implementation.

For a simple and obvious task, use a short plan or proceed directly. Do not manufacture ceremony.

If an assumption fails, a test exposes a different problem, or the work diverges from the plan, stop the affected work. Diagnose what changed, revise `tasks/todo.md`, explain the new plan, and only then continue.

## 3. Delegate focused work

Use subagents liberally when the environment supports them and work can be separated safely. Good candidates include research, repository exploration, independent analysis, test investigation, and parallel validation.

- Give each subagent one bounded task and a clear deliverable.
- Provide only the context needed for that task.
- Avoid overlapping write ownership.
- Run independent tasks in parallel when useful.
- Keep planning, integration, final decisions, and end-to-end verification with the main agent.
- Review subagent evidence before relying on it.

For complex problems, spend additional parallel effort on independent hypotheses or validation instead of overloading one context window.

## 4. Execute with minimal impact

- Prefer the simplest change that solves the root cause.
- Touch only what the task requires.
- Preserve existing behavior outside the requested scope.
- Avoid temporary patches and symptom-only fixes.
- Give a concise, high-level progress summary after each material step.

Before committing to a non-trivial design, pause and ask: "Is there a simpler or more elegant solution?" If the current approach feels hacky, reconsider it using everything learned so far and implement the clean solution. Skip this pause for simple, obvious fixes.

## 5. Fix bugs autonomously

When given a bug report, failing test, or failing CI job:

1. Reproduce the failure or inspect the available error, logs, and test evidence.
2. Trace the failure to its root cause.
3. Add or identify a test that demonstrates the failure when practical.
4. Implement the smallest complete fix.
5. Run focused checks, then the broader relevant suite.
6. Inspect logs and final behavior for regressions.

Do not ask the user to diagnose the issue or prescribe the fix. Ask only when blocked by missing access, required external authority, or a product decision that materially changes the result. A planning check-in should communicate direction, not transfer investigation work to the user.

## 6. Prove the result

Never claim completion without fresh evidence. Before marking the task done:

- Run the relevant tests, linters, type checks, builds, or smoke checks.
- Inspect logs and outputs rather than relying only on exit status.
- Compare behavior on the main or base branch with the changed behavior when a meaningful baseline is available.
- Review the final diff for unnecessary changes, accidental regressions, and unresolved placeholders.
- Ask: "Would a staff engineer approve this change and its evidence?"
- Resolve failures or explicitly report any verification that could not run and the remaining risk.

Add a `Review` section to the current task in `tasks/todo.md` containing:

- A high-level summary of the change.
- The checks run and their observed results.
- The before/after comparison when relevant.
- Any remaining risks, limitations, or follow-up work.

Only mark the task complete after the review section is accurate and every required plan item is complete.

## 7. Learn from corrections

After any user correction:

1. Identify the mistaken assumption, behavior, or missed preference.
2. Create or update `tasks/lessons.md` with a concise rule that would have prevented it.
3. Make the rule actionable and general enough to reuse.
4. Merge duplicate lessons and strengthen rules when the same pattern recurs.
5. Re-read the relevant lessons before resuming work.

Do not record secrets, private user data, or a transcript of the correction. Capture the reusable prevention rule.
