---
name: extend-seo-audit
description: Extend or refactor this repository's Bun and TypeScript SEO crawler while preserving its domain architecture, Zod contracts, live graph semantics, Playwright renderer process model, and evidence-first findings. Use when asked to add an extractor, graph feature, crawler behavior, schema, rule, report section, CLI/API capability, persistence change, or related tests.
---

# Extend SEO Audit

Implement crawler features by semantic domain with strict TypeScript, runtime validation, pure functions, and focused tests.

## Required workflow

1. Read `AGENTS.md` and the relevant sections of `SEO_CRAWLER_SPEC.md` completely.
2. Inspect current schemas, neighboring domain code, tests, and working-tree changes before editing.
3. Identify the owning workspace and domain. Engine behavior belongs in `packages/seo-audit`, CLI boundaries in `packages/cli`, and browser reporting in `apps/report-ui`; do not place behavior in a generic helper or service folder.
4. Define or update Zod boundary schemas first and derive types with `z.infer`.
5. Implement domain logic as pure functions. Keep filesystem, network, clock, storage, and process effects in coordinators or infrastructure.
6. Preserve observations separately from derived facts and findings.
7. Add focused unit tests, schema rejection tests, and JSON round-trip tests.
8. Update the local end-to-end fixture when behavior crosses crawl, graph, render, persistence, or report boundaries.
9. Run formatting, strict type checking, unit tests, and the relevant smoke test. Report unavailable verification.

## Graph invariants

- Create a node on first URL discovery, before fetch.
- Deduplicate nodes only by the conservative URL key.
- Retain every typed edge occurrence and its provenance.
- Do not count sitemap entries, canonicals, redirects, resources, or hreflang as HTML anchor inlinks.
- Only the coordinator mutates the frontier and live graph.
- Make node creation and edge insertion idempotent under concurrent discovery.
- Freeze an immutable graph before global connectivity algorithms.

## Renderer invariants

- The MVP uses pinned Playwright Chromium only.
- Spawn renderer workers through the CLI's hidden Bun subprocess command.
- Keep one active page per worker and one fresh browser context per page.
- Retain `fetch_raw`, `browser_raw`, and `rendered_dom` independently.
- Treat lifecycle events as checkpoints; use bounded content stability for readiness.
- Raw crawl completion must not depend on rendered crawl success.
- Read `JAVASCRIPT_RENDERING.md` completely before changing render selection, readiness, IPC, observations, deltas, rendered discovery, render rules, or output artifacts.
- Every successful rendered page must keep `fetch_raw`, `browser_raw`, and `rendered_dom` observations plus delivery, render, and total deltas.
- Feed rendered `<a href>` discoveries back to the coordinator as `rendered-anchor` edges before the frontier freezes.
- Do not use `networkidle` or an unbounded wait. Preserve the available DOM on a declared hard timeout.
- Treat console errors as observations; require content, request, navigation, or signal evidence before producing an SEO finding.
- Any rendering change must update `evidence/render-audits.json/jsonl`, the Markdown JavaScript section, and the render smoke fixture when its output contract changes.

## File rules

- Use kebab-case and one primary concept per file.
- Put each finding rule in its own `rules/<category>/<rule>.rule.ts` file and register it in `built-in-rules.ts` or the category registry; registry files must not contain rule implementations.
- Place schemas beside their domain with `.schema.ts`.
- Do not add `utils.ts`, `helpers.ts`, global `types.ts`, or repository-wide barrels.
- Keep `shared/` small and limited to truly cross-domain primitives.
- Stream large data and write artifacts atomically.
- Keep canonical evidence under `evidence/`, derived projections under `data/`, rule records under `rules/`, and bounded human/LLM documents under `markdown/`. Page projections must never copy site-wide finding evidence.

When behavior is not implemented, scaffold only what the user requests and keep unimplemented APIs out of examples and claims.

The public CLI surface contains only `crawl` and `open`. Preserve the hidden renderer subprocess entrypoint as internal infrastructure. `open` must validate the audit, bind only to `127.0.0.1:4173`, expose no port option, and fail clearly when the port is occupied.
