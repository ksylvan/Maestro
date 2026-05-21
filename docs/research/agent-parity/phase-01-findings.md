---
type: architecture
title: Phase 01 Agent Parity Findings
created: 2026-05-21
tags:
  - architecture
  - agent-parity
  - hermes
  - pi
  - autorun
related:
  - '[[shared-parity-baseline]]'
  - '[[hermes-capability-map]]'
  - '[[pi-capability-map]]'
  - '[[AGENT_SUPPORT.md]]'
---

# Phase 01 Agent Parity Findings

## Scope of this review

This note records the Phase 01 review pass against [[AGENT_SUPPORT.md]] after the Hermes/Pi shared-catalog work, detector coverage updates, launch-argument coverage, and renderer validation harness changes.

## What shipped in Phase 01

- Hermes and Pi are present in the shared agent catalog and main-process registries.
- The detector coverage now follows the live catalog count instead of a stale hard-coded total, and it exercises Hermes/Pi detection expectations.
- Launch-argument coverage now locks the documented Maestro batch invocation shape for Hermes and Pi.
- A dev-only renderer harness exists for browser-side validation without depending on the Electron preload contract.

## AGENT_SUPPORT review

### Required checklist coverage

Review outcome: **no missing required new-agent plumbing was found for the current Phase 01 scope**.

1. **Agent IDs**: Hermes and Pi are already present in the shared ID registry.
2. **Agent definitions**: both agents already have runtime definitions in the main-process catalog.
3. **Capabilities**: both agents already have explicit capability maps.
4. **Display metadata**: shared display metadata exists for both agents.
5. **Context window defaults**: shared defaults exist for both agents.
6. **Renderer interface sync**: no new capability fields were introduced in this phase, so there was no additional renderer type-surface work to perform beyond the existing shared capability model.

### Conditional checklist coverage

The remaining conditional AGENT_SUPPORT steps are **intentionally gated off**, not forgotten:

- **Output parser registration** is not required yet because both Hermes and Pi remain flagged with `supportsJsonOutput: false` in Maestro's current runtime contract.
- **Error-pattern registration** is not required yet because no Hermes/Pi output parser is registered.
- **Session storage registration** is not required yet because both agents remain flagged with `supportsSessionStorage: false`.

## Explicitly deferred parity items

These are the follow-up gaps that should stay in later phases instead of being implied as already solved:

- **Pi structured-output parity is deferred on purpose.** The research shows Pi has documented JSON and RPC surfaces, but Maestro still keeps `supportsJsonOutput: false` until a real parser/integration contract lands.
- **Hermes structured-output parity remains unproven.** The research did not establish a clear Maestro-ready JSON event stream, so Hermes stays on the conservative batch/single-shot path.
- **Session storage and resume orchestration are deferred** for both agents, even though both CLIs have resume-related concepts.
- **Wizard parity remains deferred** for both agents.
- **Group-chat / moderation parity remains deferred** for both agents.
- **Model-discovery and richer runtime control are later-phase work**, especially where the upstream CLI surface is interactive or broader than Maestro's current contract.

## Practical Phase 01 boundary

Phase 01 should be treated as **honest catalog exposure plus guarded validation**, not as full feature parity.

That means Hermes and Pi can:

- appear in the catalog,
- participate in detection,
- use documented batch launch argument shapes,
- and be validated through controlled harness coverage.

It does **not** yet mean Maestro owns:

- parser-backed structured events,
- session persistence/storage integration,
- wizard behavior,
- or group-chat semantics.

## Related research

- [[shared-parity-baseline]]
- [[hermes-capability-map]]
- [[pi-capability-map]]
