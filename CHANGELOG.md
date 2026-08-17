# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.7] - 2026-08-16

### Added

- Split Markdown reporting into a compact root report, focused overview/structure/rendering documents, issue and page indexes, one bounded file per finding and internal URL, a glossary, and an agent-reading guide.
- Organized structured artifacts under `data/`, canonical proof under `evidence/`, rule records under `rules/`, and rendered HTML snapshots under `evidence/bodies/`.

### Changed

- Replaced repeated full findings inside page insights with a version 2 compact finding summary plus page-local evidence and direct source/target locations.
- Made `open` support both the structured layout and legacy root artifacts while always rebuilding the compact page-insight projection in memory.

### Fixed

- Eliminated quadratic `page-insights.json` and Markdown growth caused by copying every site-wide URL and evidence record into every related page.
- Prevented legacy link reconstruction from inventing link evidence for modern findings that already contain page or browser evidence.

## [1.0.6] - 2026-08-16

### Changed

- Split all built-in audit rules into one semantic `rules/<category>/<rule>.rule.ts` file per rule, with registry-only aggregation and an architecture test that prevents regressions.
- Reduced the public CLI to `crawl` and `open`; renamed the report command from `ui` to `open` and removed public setup and static-export commands.
- Made `open` validate the audit and bind only to `127.0.0.1:4173`, with no port option and a clear failure when the port is occupied.
- Updated repository instructions and agent skills to preserve the two-command CLI contract and evidence-first Markdown/findings verification.

## [1.0.5] - 2026-08-16

### Added

- Schema-validated `page-insights.json` and JSONL artifacts joining each page to its metrics, finding roles, exact link/page evidence, browser resources, JavaScript resources, failed requests, console source locations, and runtime errors.
- Explicit per-issue evidence levels and role-labelled inspection locations, with clearly marked association-only fallback evidence when a rule does not emit field-level proof.
- A schema-validated JSON/JSONL and Markdown rule catalog describing why each rule matters, its exact trigger, remediation, evidence contract, capability requirements, and tags.
- Deterministic rules for redirecting URLs, redirect chains, redirected and nofollow internal links, broken and redirecting canonicals, short/long titles, long and duplicate descriptions, and skipped heading levels.
- Deterministic rules for slow responses, deep pages, short descriptions, and sitemap conflicts involving non-success, noindex, or canonicalized URLs.
- First-class typed Playwright finding evidence for exact DOM deltas, browser metrics, render termination, failed requests, and HTTP-error resources.
- Per-page Markdown sections for issue summaries and remediation, source/target evidence, network requests, JavaScript resources, and console/runtime errors.

### Changed

- Unified the Pages dashboard with site-wide technical/browser metrics and clickable per-page Overview, Issues, Network, JavaScript, Errors, and Links tabs.
- Replaced the standalone JavaScript navigation item with Browser columns in the stable page table; legacy JavaScript report links remain compatible.
- Expanded finding details in JSON, Markdown and the UI with rule rationale, exact triggers, evidence contracts, and inspectable browser/page/link records.

## [1.0.4] - 2026-08-15

### Fixed

- Pinned the CLI and report UI to the matching engine release so a newer CLI cannot install an older engine that lacks required reporting exports.
- Coordinated package and Bun lockfile workspace versions during release bumps.
- Added release verification for coordinated workspace dependencies and a clean consumer installation test against the exact engine and CLI tarballs.

## [1.0.3] - 2026-08-15

### Added

- Chromium JavaScript CPU, main-thread task, layout, style-recalculation, heap, DOM-node, and bounded long-task observations.
- Versioned per-page and site-wide metric artifacts with decomposable Technical Health and JavaScript Health scores.
- TanStack Charts dashboards for technical-health distribution, browser resource composition, and JavaScript page health.
- A sortable TanStack Table page inventory with General, JavaScript, and Content column presets.
- A stable, URL-sorted Pages table with URL/title filtering, result counts, fixed column widths, a sticky URL column, and an explicit empty state.

### Changed

- Renamed aggregate script request timing in reports to script network duration so it cannot be confused with JavaScript CPU execution.
- Consolidated UI and Markdown measurements through the same pure page/site metrics model, including p50, p75, p95, resource-type, and third-party-domain summaries.

### Fixed

- Excluded generated audit and release-artifact directories at any workspace depth from Biome so captured third-party HTML cannot interfere with repository checks.

## [1.0.2] - 2026-08-14

### Added

- Per-page render duration, JavaScript transfer size, aggregate JavaScript resource load time, lifecycle checkpoints, and browser request totals in the Pages UI and matching Markdown page documentation.
- A shared pure page-browser metrics projection with focused coverage for page joins, script-only aggregation, missing lifecycle events, duplicate render audits, and Markdown parity.

### Changed

- Playwright now renders every eligible HTML page within the render safety bound by default; `smart` remains available as an explicit cost-saving mode and `off` remains available for fetch-only crawling.
- The JavaScript report now explains empty render evidence and distinguishes aggregate script-request network duration from JavaScript CPU execution time.
- End-to-end tests now verify default rendered discovery, persisted browser timing, fetch-only capability reporting, Markdown metrics, and static `render-audits.json` export without relying on incidental array lengths.

### Fixed

- Joined Playwright render audits into the Pages table so render time, JavaScript size, and JavaScript load time are no longer blank when browser evidence exists.
- Mirrored browser-derived issues and measurements consistently across structured artifacts, page documentation, the JavaScript view, and Markdown output.
- Aligned generated audit-manifest `toolVersion` metadata with the published package version and made future release bumps update both atomically.

## [1.0.1] - 2026-08-14

### Added

- Playwright browser-execution telemetry for console events, page errors, failed requests, resource types, response status, MIME type, timing, payload sizes, service-worker responses, and third-party traffic.
- Render lifecycle checkpoints for DOM content loaded, load, and content stability, with total and average render timing in the report UI and Markdown report.
- Rendering rules for large JavaScript payloads and large third-party payloads.
- A guarded manual release command that validates, tests, packs, inventories, and dry-runs both npm packages before requiring an exact version-bound publication confirmation.

### Changed

- Smart Playwright rendering is enabled by default while preserving raw-fetch evidence and fallback behavior when rendering fails.
- Browser HTTP 4xx and 5xx responses contribute evidence to critical browser-request findings.
- Browser execution evidence is available in both the static reporting UI and Markdown audit output.

### Security

- Package publication remains restricted by explicit `files` allowlists, defensive `.npmignore` files, metadata verification, dependency auditing, and exact tarball inspection before publication.

## [1.0.0] - 2026-08-13

### Added

- Initial release of the Bun-based technical SEO crawler, rule engine, CLI, Playwright renderer, structured audit artifacts, Markdown report, and static React reporting UI.

[Unreleased]: https://github.com/duskydots/seo-audit/compare/v1.0.7...HEAD
[1.0.7]: https://github.com/duskydots/seo-audit/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/duskydots/seo-audit/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/duskydots/seo-audit/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/duskydots/seo-audit/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/duskydots/seo-audit/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/duskydots/seo-audit/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/duskydots/seo-audit/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/duskydots/seo-audit/releases/tag/v1.0.0
