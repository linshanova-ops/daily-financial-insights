# AGENTS.md

## Cursor Cloud specific instructions

This repository is **skills-only**: it contains Cursor Agent Skills (markdown SOPs) under
`.cursor/skills/financial-research/`, plus `README.md` and `LICENSE`. There is **no application
code, package manager, lockfile, build system, or automated test suite** — so there is nothing to
install, lint, build, or unit-test. The update script is intentionally a no-op.

- **What the "product" is:** a daily financial research pipeline executed *by the Cursor agent
  itself* by reading and following the skills. There is no server/service to start. See `README.md`
  for the skill list and the stage order.
- **Entry point:** the `daily-financial-briefing` skill orchestrates stages 1–6
  (gather → global macro → China macro → signals → suggestions → report). Each stage skill also
  works standalone. Read a skill's `SKILL.md` before executing it.
- **Core runtime dependency = web access.** Stage 1 (`gathering-financial-news`) relies on the
  `WebSearch` tool to pull dated, sourced news. Running the pipeline requires outbound network /
  web search; without it the pipeline cannot gather news and only the writing template can be
  exercised. This is the main thing to verify when "running" this repo.
- **To "run"/smoke-test:** invoke the briefing pipeline (e.g. "give me today's daily financial
  briefing"), or run a single stage. A successful run produces a markdown report following
  `.cursor/skills/financial-research/writing-daily-financial-report/assets/report-template.md`.
- **Output convention:** `.gitignore` ignores `test-output/`, `.venv/`, and `__pycache__/`. Write
  generated reports / scratch there (or to `/opt/cursor/artifacts/` for user-visible artifacts);
  do not commit generated briefings.
