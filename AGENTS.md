# Repository instructions

This repository implements a Bun-based technical SEO crawler. The authoritative design is `SEO_CRAWLER_SPEC.md`.

## Architecture invariants

- Treat XML sitemaps as publisher-declared discovery evidence, not the site's connectivity graph.
- Create a graph node when a URL is first discovered. Add a distinct typed edge for every observed relationship.
- Only the crawl coordinator mutates the live graph and frontier. Parser and renderer workers return validated observations/events.
- Preserve `fetch_raw`, `browser_raw`, and `rendered_dom` as separate representations.
- Use Playwright Chromium for rendered crawling. Start renderer subprocesses with `Bun.spawn`; do not add another browser backend in the MVP.
- Keep raw crawling useful and resumable when rendering is disabled or fails.
- Separate observations from derived facts and findings. Never discard evidence merely because a policy ignores it.

## TypeScript rules

- Write strict TypeScript only. Do not add JavaScript source files.
- Use Zod for CLI/config, IPC, stored JSON/JSONL, external responses, and every other untrusted boundary.
- Derive types with `z.infer`; do not duplicate schema-backed types manually.
- Organize engine source by semantic domain under `packages/seo-audit/src/domain/<domain>`; keep infrastructure adapters under `packages/seo-audit/src/infrastructure`, CLI boundaries under `packages/cli/src`, and report UI code under `apps/report-ui/src`.
- Use one primary concept per kebab-case file. Do not create catch-all `utils.ts`, `helpers.ts`, or `types.ts` files.
- Keep each audit rule in exactly one `packages/seo-audit/src/domain/findings/rules/<category>/<rule>.rule.ts` file. Registry files may import and order rules but must not define them.
- Prefer pure functions for URL normalization, parsing, graph transitions, classifications, comparisons, and report-model construction.
- Inject filesystem, network, clock, process, database, and ID effects at coordinator boundaries.
- Use typed result values for expected failures. Reserve thrown exceptions for violated invariants and programming errors.
- Write artifacts atomically and stream potentially large crawl data.
- Keep canonical crawl evidence under `evidence/`, derived report projections under `data/`, rule records under `rules/`, and bounded human/LLM documents under `markdown/`.
- Never embed complete site-wide finding arrays in each page projection. Page insights contain only local evidence and direct source/target relationships; `evidence/findings.json/jsonl` is canonical.

## Required tests

- Add focused unit tests beside every domain change.
- Test Zod acceptance and rejection, including unknown fields and schema-version mismatch.
- Test JSON and JSONL serialization, parsing, schema validation, and stable round trips.
- For graph changes, cover repeated discovery, edge multiplicity, depth updates, state transitions, and immutable freezing.
- Keep `tests/smoke/crawl.e2e.test.ts` exercising the real CLI against the deterministic local fixture site.
- Unit tests must not need Chromium. Render smoke tests require the pinned browser installed with `bunx playwright install chromium`.
- Keep `crawl` and `open` as the only public CLI commands. `open` always binds loopback port 4173 and must fail clearly rather than selecting another port.

## Working process

1. Read the relevant specification section and neighboring domain files.
2. Define or update boundary schemas first.
3. Implement the smallest pure domain operation.
4. Connect it to effects in the coordinator/infrastructure layer.
5. Add unit tests and update the end-to-end fixture when behavior crosses domains.
6. Run formatting, type checking, unit tests, and the relevant smoke test before handoff.

Do not claim commands have run when the corresponding scripts or CLI do not yet exist. During initial scaffolding, report unavailable checks explicitly.
