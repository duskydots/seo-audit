# SiteLens SEO Audit

A deterministic Bun and TypeScript technical SEO crawler with a human-readable Markdown report, schema-validated JSON/JSONL artifacts, default Playwright rendering for eligible HTML pages, and a static React/TanStack Router reporting UI.

## Run an audit

```bash
bun install
bunx playwright install chromium
bun run audit -- crawl https://example.com
```

Fetch concurrency and renderer worker count default to `auto`. The CLI reads Bun's `node:os` `availableParallelism()` and total system memory, reserves coordinator capacity, and treats each Chromium process as a 2 GiB budget. A typical 4-core/16 GiB GitHub-hosted runner resolves to 8 concurrent fetches and 2 render workers. Override either dimension independently with `--concurrency <n>` or `--render-workers <n>` when a target origin or machine requires a stricter policy. The resolved environment and values are printed and persisted in `manifest.json`.

Raw HTML is the baseline. Rendering all eligible HTML pages within the safety bound is enabled by default and uses isolated Playwright worker processes. Use `--render smart` as an explicit cost-control policy, or `--render off` for the fastest fetch-only crawl.

Rendering preserves native-fetch HTML, Chromium's navigation response, and the final DOM independently. It also records bounded console events, runtime errors, response statuses, resource types, request timing, service-worker provenance, and Playwright-reported request/response sizes. Rendered-only links return to the crawl frontier with distinct graph provenance. See `JAVASCRIPT_RENDERING.md` for readiness, comparison, telemetry, rule, and output semantics.

## Read the report

The CLI creates a timestamped directory such as `audit-example.com-2026-08-13T05-37-43-171Z` and prints its complete path when finished. Open its compact `report.md`, follow the split Markdown documentation, inspect JSON/JSONL directly, or launch the UI:

```bash
bun run build:ui
bun run audit -- open audit-example.com-2026-08-13T05-37-43-171Z
```

The UI is compiled by Vite during the maintainer build and embedded in the CLI package. Consumers do not install Vite. `open` validates the audit and starts a loopback-only Bun server at exactly `http://localhost:4173`; it fails instead of selecting another port when 4173 is occupied. The Pages view is the per-URL documentation surface: select any page to inspect its retrieval and indexability state, metadata, complete heading outline, content measurements, associated findings, and every stored incoming/outgoing link occurrence.

Edge-based findings retain their relationships. A broken-link finding records each observed source page → failed target occurrence, target status, anchor text, relation tokens, edge kind, and edge ID. The Issues UI and Markdown report show this evidence directly instead of presenting an unpaired list of targets and sources. Older audit files are supported by reconstructing the same relationship from their root `edges.json`.

The Site hierarchy view uses React Flow for interactive pan, zoom, minimap navigation, draggable nodes, branch focusing, and page-level details. Solid edges form a deterministic shortest-click tree rooted at the audited site: homepage links are direct children, with newly reached links arranged at later depths. Optional overlays reveal additional cross-links and JavaScript-only anchors without confusing them with the hierarchy. Sitemap and resource relationships are intentionally excluded.

## Output contract

Each successful crawl writes atomically:

- `data/` — summary, pages, page/site metrics, and compact page-local UI insights in JSON and JSONL
- `evidence/` — uncapped graph edges, canonical findings, Playwright render audits, and deduplicated `bodies/<sha256>.html`
- `rules/` — rule evaluations and the versioned rule catalog in JSON and JSONL
- `markdown/overview.md` — health metrics, response distribution, rule coverage, and rule catalog
- `markdown/issues/index.md` plus one file per finding — explanation, remediation, affected URLs, and exact source → target/page/browser evidence
- `markdown/pages/index.md` plus one file per internal URL — technical, content, JavaScript, network, error, issue, and link documentation
- `markdown/structure.md`, `markdown/rendering.md`, `markdown/glossary.md`, and `markdown/agent-guide.md` — focused analysis and LLM navigation
- `report.md` — small entry point with totals and links into the split documentation
- `manifest.json` — schema version and artifact inventory

Page insights deliberately carry only page-local evidence and a compact finding snapshot. Complete site-wide finding arrays are stored once in `evidence/findings.json/jsonl`, preventing page projections and Markdown from growing quadratically.

Sitemap membership is discovery evidence, never an HTML link. The UI graph derives shortest click depth only from observed internal anchor edges.

The Pages dashboard is the unified inspection surface. Its stable URL table combines technical, content, JavaScript, network, and error metrics. Selecting a page exposes matching Overview, Issues, Network, JavaScript, Errors, and Links tabs. Finding cards disclose rule summaries, remediation, relationship roles, and exact source/target evidence. The same information is emitted in per-page Markdown documentation.

## Verification

```bash
bun run format
bun run check
bun test tests/unit
bun test tests/smoke
bun run build
bun run pack:dry-run
```

Manual npm releases, version coordination, trusted publishing, and first-release setup are documented in `RELEASE.md`. Security gates, audit results, and residual crawler/rendering risks are documented in `SECURITY.md`.

## License

MIT. See `LICENSE`.

## Packages and workspaces

The repository is a Bun workspace with isolated dependency linking:

- `packages/seo-audit` — publishable `@duskydots/seo-audit` engine, Zod contracts, rule API, crawler, graph, and report generation
- `packages/cli` — publishable `@duskydots/seo-audit-cli` package exposing the `seo-audit` executable
- `apps/report-ui` — private Vite/React/TanStack Router application; its production build is included in the CLI package

Use the engine directly:

```ts
import {
  CrawlConfigSchema,
  crawlSite,
  detectRuntimeResources,
  resolveExecutionResourcePlan,
} from "@duskydots/seo-audit";

const executionPlan = resolveExecutionResourcePlan(detectRuntimeResources(), {
  fetchConcurrency: "auto",
  renderWorkers: "auto",
});

const result = await crawlSite(CrawlConfigSchema.parse({
  seed: "https://example.com/",
  outputDirectory: "audit-example",
  concurrency: executionPlan.fetchConcurrency,
  renderWorkers: executionPlan.renderWorkers,
  render: "off",
  maxRenderPages: 0,
}), { executionPlan });
```

Before publishing, choose and verify the npm scope, update both package versions together, build the UI, and inspect both tarballs with `bun run pack:dry-run`. Bun rewrites `workspace:*` to the matching package version when packing or publishing.

The smoke test starts a fixture website and invokes the real CLI. It verifies robots handling, sitemap discovery, broken-link findings, graph semantics, Zod JSON validation, and report generation.

## Project map

- `packages/seo-audit/src/domain` — pure URL, crawl, HTML, graph, robots, sitemap, indexability, findings, render, and report logic
- `packages/seo-audit/src/infrastructure` — renderer process pool and atomic filesystem persistence
- `packages/cli/src` — Bun command boundary and Zod option parsing
- `apps/report-ui` — Vite, React, and TanStack Router static reporting layer
- `tests` — domain units and end-to-end smoke coverage
- `SEO_CRAWLER_SPEC.md` — complete algorithm, data model, rendering policy, AI discoverability guidance, and implementation baseline
- `RULES.md` — modular rule API, finding semantics, extension example, and ranked top-ten rule roadmap
- `JAVASCRIPT_RENDERING.md` — Chromium process model, readiness policy, discovery semantics, deltas, rules, artifacts, and research baseline
- `AGENTS.md` and `.agents/skills` — instructions for LLM operators and maintainers

This tool reports technical eligibility and observable evidence. It does not claim that a search engine or AI system indexed, ranked, cited, or trusted a URL.
