# Working Preferences

## Lightweight Illustrator Script Workflow

For contained Adobe Illustrator JSX requests, default to direct implementation in the current checkout.

- Do not create design documents, implementation plans, worktrees, or subagents unless the user explicitly asks for them or the change affects a shared contract with material risk.
- Treat requests such as `바로 구현`, `진행해`, and `마무리` as authorization to implement without approval loops.
- Make reasonable UI and geometry assumptions from existing repository patterns; state only material assumptions in the final handoff.
- Verify with focused safety tests, JSX syntax check, and `git diff --check`. Broaden tests only when a failure or shared behavior requires it.
- Commit, push, and copy into Illustrator only when the user asks to publish, update, or finish the work.
- Keep progress updates short. Do not pause for process-only choices.

## Escalation

Ask before expanding scope, changing unrelated files, using multiple agents, or starting a formal design workflow.
