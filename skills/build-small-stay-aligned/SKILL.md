---
name: build-small-stay-aligned
description: Delivers the smallest useful solution without unnecessary code, abstractions, dependencies, or technical debt. Aligns on the goal and definition of done before implementation, reuses existing tools, verifies with a focused check, trims the diff, and stops. Use when starting any coding task (feature, fix, or refactor), when scope starts to grow, or when choosing between a small solution and a more general one.
metadata:
  source: https://gist.github.com/coderberry/e25dea1ba8b20e025200cc03ed09b829
---

# Skill: Build Small, Stay Aligned

## Purpose

Guide coding agents to deliver the smallest useful solution while avoiding unnecessary code, abstractions, dependencies, and technical debt. Prioritize alignment on the intended outcome before implementation.

## Core Rules

1. **Align before action.** Before changing code, confirm the goal, scope, constraints, and definition of done. Identify assumptions that could change the implementation.
2. **Find the atomic solution.** Break the request into the smallest independently useful deliverable. Avoid expanding a task into a platform, framework, or general-purpose system unless that is explicitly required.
3. **Prefer less machinery.** Minimize lines of code, dependencies, abstractions, configuration, and custom infrastructure. Treat simplicity and reduced maintenance as positive outcomes.
4. **Use existing tools where possible.** Before building something, check whether an existing library, command-line tool, API, or project capability already solves the problem. Prefer a focused configuration or integration over custom machinery.
5. **Challenge every component.** For each proposed file, service, abstraction, dependency, or test, ask:
   - Is this necessary for the requested outcome?
   - Can an existing tool or simpler approach replace it?
   - What ongoing maintenance does it introduce?
6. **Build only what is needed, then stop.** Don’t add speculative features, future-proofing, or extra layers beyond the agreed scope. Stop once the definition of done is met.
7. **Simplify after building.** Review the result for scaffolding, duplicated logic, unnecessary files, and obsolete planning artifacts. Remove what is no longer needed, using version control to recover anything mistakenly removed.
8. **Validate proportionately.** First confirm the deliverable works using a focused manual check or a suitable subagent. Add appropriate higher-level or integration tests as needed. Don’t generate a large testing framework or extensive test machinery without a clear reason.

## Workflow

### 1. Align

Summarize the requested outcome and propose a small definition of done. Call out important unknowns before implementation. If the request is clear, keep this step brief.

### 2. Reduce the scope

Identify the smallest change that satisfies the request. List any tempting additions that are out of scope.

### 3. Check for existing solutions

Inspect the current codebase and available tools. Prefer reusing existing conventions and capabilities over introducing new dependencies or machinery.

### 4. Implement minimally

Make only the changes needed for the agreed deliverable. Keep the implementation straightforward and avoid speculative abstractions.

### 5. Verify

Run the most relevant, focused validation. Report what was checked and any remaining limitations.

### 6. Remove excess

Review the diff. Remove unnecessary code, files, scaffolding, and documentation created along the way. Confirm the final changes still meet the definition of done.

### 7. Report and stop

Summarize the outcome, validation, and any follow-up needed. Don’t continue expanding the solution after the requested result is complete.

## Default Decision Rule

When choosing between a small solution that meets the current need and a larger solution that might handle hypothetical future needs, choose the small solution. Expand only when a concrete requirement justifies the added complexity.

## Suggested Agent Prompt

> Align before action. First restate the intended outcome and the smallest definition of done. Inspect the existing project and look for tools or patterns that already solve the problem. Implement only the smallest useful change. Avoid speculative features, unnecessary dependencies, abstractions, scaffolding, and test machinery. Validate the result with a focused check, review the diff, remove anything unnecessary, and stop when the agreed outcome is met.