# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
pnpm install
pnpm test          # run the full test suite (turbo run test)
pnpm test:web      # run only the web app's Vitest suite
```

### Mutation testing

Mutation testing (via [Stryker](https://stryker-mutator.io/)) checks whether the test
suite actually catches regressions, not just whether lines are executed.

```bash
pnpm test:mutate           # from the repo root
pnpm --filter web test:mutate   # equivalent, run directly against the web app
```

- Config lives at `apps/web/stryker.config.mjs`.
- Initial scope is limited to business logic in `apps/web/src/features/**/*.ts`
  (excluding tests, thin server-function wrappers, and hooks that have no
  branching logic of their own yet).
- Thresholds: `break: 60`, `high: 80`, `low: 70` — a run scoring below the
  break threshold exits non-zero.
- After a run, open `apps/web/reports/mutation/mutation.html` to see surviving
  mutants. CI uploads this report as a workflow artifact on PRs that touch
  `apps/web/src/features/**` (see `.github/workflows/mutation-testing.yml`).

## Architecture Overview

_Add a brief overview of your project architecture_

## Conventions & Patterns

_Add your project-specific conventions here_
