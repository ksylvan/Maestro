---
type: architecture
title: Hermes Integration Design
created: 2026-05-21
tags:
  - architecture
  - agent-parity
  - hermes
  - autorun
related:
  - '[[shared-parity-baseline]]'
  - '[[hermes-capability-map]]'
  - '[[phase-01-findings]]'
  - '[[AGENT_SUPPORT.md]]'
---

# Hermes Integration Design

## Scope

Phase 02 should turn Hermes from a catalog entry into a real Maestro runtime by reusing the existing agent surfaces instead of adding Hermes-only plumbing. The relevant reuse points already exist in:

- `src/main/agents/definitions.ts` for launch and resume arguments
- `src/main/agents/capabilities.ts` for honest feature gating
- `src/main/agents/detector.ts` for model discovery caching and command execution
- `src/main/parsers/index.ts` plus existing parser classes for normalized event output
- `src/main/storage/base-session-storage.ts` and `src/main/storage/index.ts` for session history support

Non-goals for this phase:

- claiming wizard or group-chat parity before Hermes exposes a stable structured event stream
- inventing a Hermes-only storage registry, parser registry, or model discovery framework

## Command strategy

Current Hermes launch wiring in `src/main/agents/definitions.ts` is the correct foundation and should stay authoritative:

- base command: `hermes`
- unattended entrypoint: `hermes chat`
- quiet automation mode: `-Q`
- prompt injection: `-q <prompt>`
- resume: `--resume <sessionId>`
- model override: `-m <modelId>`
- image attachment: `--image <path>`

Design rule: keep Maestro on the documented `chat` path for both fresh runs and resumed runs. Do not add a second Hermes execution mode unless Phase 02 runtime validation proves the documented path cannot produce parseable unattended output.

## Session-source assumptions

[[hermes-capability-map]] confirms that Hermes supports session resume plus session browsing/export workflows, but it does **not** yet pin down a stable on-disk schema or project-scoped storage layout. That leads to a conservative storage design:

1. `HermesSessionStorage` should extend `BaseSessionStorage` and match the existing `CodexSessionStorage` / `OpenCodeSessionStorage` shape.
2. Session discovery should prefer documented Hermes CLI list/export/read surfaces if they are available non-interactively.
3. Direct filesystem reads are acceptable only after Phase 02 confirms the Hermes state path and record format are stable enough for Maestro to depend on.
4. Resume identifiers in Maestro must use Hermes's own session identifier, not a synthetic Maestro id.
5. If Hermes exposes read/list but not safe delete semantics, Maestro should leave deletion unsupported rather than guessing at file mutations.

Practical implication: the storage class should be designed around `listSessions`, `readSessionMessages`, and `getSearchableMessages` first. Message-pair deletion remains optional and should degrade honestly if Hermes does not document a safe equivalent.

## Structured-output expectations

The biggest Hermes uncertainty is output shape. [[hermes-capability-map]] did not confirm a Codex/OpenCode-style JSONL event stream for regular unattended runs, so the parser design must be staged:

### Preferred path

- If Hermes exposes a documented machine-readable stream, register a `HermesOutputParser` through the existing parser registry and normalize:
  - assistant text
  - final result text
  - session id / resume token
  - usage metrics when present
  - stable error events

### Conservative fallback

- If Hermes only emits quiet human-readable output, the parser should normalize only what is stable and observable from `-Q` mode.
- Do **not** invent pseudo-tool events, pseudo-thinking events, or fake usage totals from prose output.
- Keep `supportsJsonOutput`, `supportsWizard`, and `supportsGroupChatModeration` tied to what the runtime actually proves, not what later Hermes features might eventually support.

### Error handling rule

Hermes-specific error patterns belong in `src/main/parsers/error-patterns.ts` only for signatures that are both:

- emitted consistently in unattended runs
- specific enough to avoid false matches against ordinary model text

## Model discovery design

`AgentDetector.runModelDiscovery()` is already the shared discovery seam. Hermes should plug into that switch instead of creating a parallel detector.

Design rule:

- add a Hermes-specific discovery branch only if Phase 02 confirms a stable non-interactive command for model listing or provider/model enumeration
- if Hermes does not document a stable machine-readable discovery command, return `[]` and rely on manual `-m` overrides already supported in `definitions.ts`
- reuse existing detector caching behavior; do not add Hermes-only cache infrastructure

This keeps model selection honest: configured overrides work immediately, while automatic discovery ships only when Hermes proves a durable query path.

## Image-path behavior

Hermes already advertises `--image <path>` in the runtime definition. The Phase 02 constraint is mode safety:

- allow image args for fresh `chat -q` launches
- do not append image args to resumed runs unless Hermes explicitly documents resume-plus-image support
- keep `supportsImageInputOnResume` false until runtime validation proves otherwise

## Fallback matrix

| Surface                    | Preferred implementation                                         | Fallback if Hermes is still uncertain                                    |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Session discovery/readback | CLI list/export/read mapped into `BaseSessionStorage`            | Leave session storage gated off until the CLI or state path is confirmed |
| Session deletion           | Reuse documented Hermes delete/archive operation                 | Return unsupported instead of mutating files blindly                     |
| Output parsing             | Structured parser registered through `src/main/parsers/index.ts` | Quiet-text normalization for result/session/error only                   |
| Model discovery            | Add Hermes branch in `AgentDetector`                             | Return `[]`; keep manual model override support                          |
| Image input                | Fresh-run `--image` support                                      | Disable resume-time image injection                                      |

## Recommended implementation order

1. Confirm the Hermes session source of truth and implement `HermesSessionStorage` on top of `BaseSessionStorage`.
2. Validate whether Hermes exposes structured output; if yes, add `HermesOutputParser`, otherwise document and implement the quiet-text fallback.
3. Add model discovery only if a stable command is confirmed during runtime verification.
4. Thread image behavior through launch tests with resume-time guards.
5. Flip capability flags only after the corresponding runtime path passes tests and manual verification.

## Phase 02 decision summary

Hermes should be integrated as a **conservative first-class agent**:

- reuse Maestro's existing storage/parser/detector seams
- prefer documented CLI surfaces over guessed filesystem internals
- ship honest fallbacks for uncertain Hermes features
- keep unsupported parity claims gated by capabilities until runtime evidence exists
