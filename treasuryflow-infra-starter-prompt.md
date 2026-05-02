# TreasuryFlow Infra Starter Prompt

Use this before Plan 1. The goal is to prepare the repo, branches, workstream docs, acceptance docs, and agent boundaries so parallel work can start cleanly. This setup matters because the current buyer-critical blocker is still the missing self-contained golden path, and the next sprint needs tightly coordinated parallel work rather than freeform coding.[cite:1]

## Which LLM to use

### Infra Starter prompt
- **Primary:** Claude CLI Sonnet-class model.
- **Why:** best balance of repo-wide planning, refactor discipline, markdown/docs generation, and safe shell/Git orchestration for setup work.
- **Secondary helper:** Gemini CLI for quick repo inspection or branch/status sanity checks if you want a second pass.

### Prompt 1 (P0 buyer-demo unblockers)
- **Primary:** Claude CLI Sonnet-class model as lead/orchestrator.
- **Best use:** golden path state machine, approval flow, audit evidence model, reconciliation guardrails, interface cleanup, PR integration.
- **Optional parallel helper:** Gemini CLI on isolated sub-workstreams like fixture cleanup, rationale schema tests, and risk-data reseeding.

### Prompt 2 (OpenFX-first scaffolding + integrations + EigenCloud)
- **Primary for most scaffolding:** Gemini CLI.
- **Why:** fast throughput on adapters, mock providers, repetitive UI scaffolding, and provider-specific shells.
- **Primary for EigenCloud-style verification layer:** Claude CLI Sonnet-class model.
- **Why:** deeper architectural reasoning is more important for verifiable task envelopes, replay semantics, append-only audit logs, and verification receipts.

### If using Cursor
- Use **Cursor agent mode** as the shell around either Claude or Gemini when you want easier branch-local iteration, file-aware editing, and checkpointing.
- Cursor is helpful as the control plane, but the model choice above still stands: Claude for P0 and verification architecture, Gemini for broad scaffolding.

## Infra Starter master prompt

```text
You are the TreasuryFlow infra-startup agent. Do not implement product features yet.

Your job is to prepare the repository, branches, documentation, task boundaries, and acceptance scaffolding for a multi-agent build.

Context:
- TreasuryFlow's buyer-critical blocker is still the missing self-contained golden path that proves request creation through approval, execution, ledger posting, reconciliation, and audit evidence without requiring wallet debugging.
- The next sprint should first address P0 buyer-demo unblockers and active control gaps.
- After P0, a second sprint will handle OpenFX-first integration scaffolding, then Coinbase/Circle/rails/Ramp/ERP scaffolding, with deeper implementation only for the EigenCloud-style verifiable AI/audit layer.
- The core money path must remain deterministic; agentic behavior can recommend and explain, but explicit logic should execute.

Objectives:
1. Inspect the repo structure and identify the main app, contract, data, seed, demo, and docs surfaces.
2. Create branch/workstream recommendations for parallel execution.
3. Create or update coordination docs in the repo root:
   - WORKSTREAMS.md
   - DEMO_ACCEPTANCE.md
   - ARCHITECTURE_NOTES.md
   - AGENT_HANDOFFS.md
4. Add a concise backlog split into:
   - Plan 1 / P0
   - Plan 2 / scaffolding + EigenCloud
5. Define file ownership boundaries so parallel agents do not step on each other.
6. Propose branch names and a merge order.
7. Create checklists for:
   - P0 acceptance
   - Plan 2 acceptance
   - demo reset/replay expectations
8. If missing, add a scripts or docs location for demo reset/runbooks, but do not implement the product logic itself.
9. Generate a short summary of risks, shared interfaces likely to cause merge conflicts, and which files should be frozen early.

Rules:
- Do not start implementing the product features from Plan 1 or Plan 2.
- Prefer writing docs, TODO stubs, branch plans, task lists, and placeholder scripts only.
- Keep recommendations aligned to deterministic execution and transparency for simulated integrations.
- Flag any missing infrastructure needed for a one-click canonical demo replay.

Expected outputs:
- A clean repo setup/coordination pass.
- New or updated coordination markdown files.
- A recommended branch map.
- A concise handoff summary for the orchestrator.

Suggested branch map to create or recommend:
- infra/workstreams-and-acceptance
- p0/golden-path-engine
- p0/risk-and-rationale-fixes
- p0/reconciliation-and-thresholds
- p1/openfx-scaffold
- p1/provider-adapters
- p1/eigencloud-verification
- p1/demo-docs-and-tests

Suggested merge order:
1. infra/workstreams-and-acceptance
2. p0/risk-and-rationale-fixes
3. p0/reconciliation-and-thresholds
4. p0/golden-path-engine
5. plan1-integration
6. p1/openfx-scaffold
7. p1/provider-adapters
8. p1/eigencloud-verification
9. p1/demo-docs-and-tests
10. plan2-integration

Success criteria:
- Another agent can immediately pick up Prompt 1 or Prompt 2 with no ambiguity about ownership, files, acceptance criteria, or branch strategy.
```

## Recommended branch/worktree setup

If using multiple agents locally, prefer **git worktrees** over constantly switching branches in one checkout. This reduces conflicts and makes it easier to run Claude CLI / Gemini CLI in parallel.

### Suggested branches
- `infra/workstreams-and-acceptance`
- `p0/golden-path-engine`
- `p0/risk-and-rationale-fixes`
- `p0/reconciliation-and-thresholds`
- `p1/openfx-scaffold`
- `p1/provider-adapters`
- `p1/eigencloud-verification`
- `p1/demo-docs-and-tests`

### Suggested worktrees
- `../tf-infra`
- `../tf-p0-golden`
- `../tf-p0-risk`
- `../tf-p0-recon`
- `../tf-p1-openfx`
- `../tf-p1-adapters`
- `../tf-p1-eigen`

## Orchestrator reminders

- Freeze shared types early, especially payment request, approval, audit evidence packet, ledger entry, reconciliation row, provider adapter interface, and verifiable-task envelope.
- Do not let multiple agents rewrite the same root state-management files at once.
- Require every subagent handoff to include: changed files, assumptions, test steps, blockers, and whether shared interfaces changed.
- Keep Plan 2 blocked until Plan 1 passes the demo acceptance checklist because the missing full-lifecycle proof remains the main buyer blocker.[cite:1]

## Very short reminder on model choice

- **Infra starter:** Claude.
- **Prompt 1 / P0:** Claude lead, Gemini helper on isolated sub-tasks.
- **Prompt 2 / scaffolding:** Gemini for most scaffolding, Claude for EigenCloud verification architecture.
