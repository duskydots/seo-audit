# JavaScript crawling and rendering

SiteLens treats browser rendering as a separate evidence-producing stage, not as a replacement for the HTTP crawler. The implementation follows the documented industry pattern used by Screaming Frog, Sitebulb, Lumar, Oncrawl, and Google Search: parse the response, execute JavaScript in Chromium when enabled, parse the final DOM, discover links from both representations, and report their differences.

This is a bounded technical simulation. It is not Google's Web Rendering Service and cannot prove indexing.

## Processing model

```text
native fetch
  -> fetch_raw observation and raw discoveries
  -> optional Playwright job through a Bun.spawn worker pool
  -> browser_raw navigation-response observation
  -> bounded content-stability wait
  -> rendered_dom observation and rendered discoveries
  -> coordinator adds rendered-anchor edges and frontier entries
  -> pure field-level comparison
  -> versioned rendering rules
  -> JSON/JSONL, content-addressed bodies, Markdown, and UI
```

Only the crawl coordinator mutates the graph and frontier. A renderer worker owns one active page at a time and creates a fresh browser context for every page. Rendering failure never invalidates a usable raw crawl.

## Three representations

Every successfully rendered page retains:

1. `fetch_raw`: HTML received by the native Bun fetch crawler.
2. `browser_raw`: main-document response body received by Chromium before DOM mutation.
3. `rendered_dom`: `page.content()` after bounded stability or the hard deadline.

The audit calculates three deltas:

- `deliveryDelta`: `fetch_raw -> browser_raw`, useful for user-agent, cookie, CDN, locale, experiment, and client-hint variance.
- `renderDelta`: `browser_raw -> rendered_dom`, isolating JavaScript and hydration effects.
- `totalDelta`: `fetch_raw -> rendered_dom`, the primary audit comparison.

Comparisons operate on normalized SEO fields rather than a noisy serialized-source diff: title, description, canonical, language, robots directives, headings, links, JSON-LD hashes, words, and normalized-text Jaccard similarity.

## Readiness policy

Chromium navigates with `DOMContentLoaded`. Rendering becomes stable when:

- at least 1 second elapsed;
- the SEO content signature has been unchanged for 1 second;
- relevant document/script/XHR/fetch traffic has been quiet for 750 ms; and
- no relevant request remains in flight.

The content signature combines normalized visible-text hash/length, title, canonical, robots, link count, heading count, and DOM-node count. The page is polled every 250 ms and always has a hard deadline. At the deadline, SiteLens preserves the available DOM and records `hard-timeout`; it does not silently discard evidence. Analytics, images, fonts, beacons, and long-lived connections do not prevent content stability, although request failures remain observable.

SiteLens does not click, hover, scroll, accept consent, grant permissions, or submit forms. Content requiring those actions is intentionally not exposed as crawler-visible content.

## Discovery semantics

Raw `<a href>` observations create `anchor` edges. Rendered `<a href>` observations create `rendered-anchor` edges. Both may discover crawl targets, but they remain separate so reports can identify navigation that depends on JavaScript. Sitemaps, canonicals, redirects, resources, and rendered links never masquerade as raw HTML inlinks.

## Rendering rules

The baseline rules are:

- `rendering.primary_content_added`
- `rendering.primary_content_removed`
- `rendering.indexability_changed`
- `rendering.links_added`
- `rendering.hard_timeout`
- `rendering.primary_request_failed`
- `rendering.browser_delivery_variant`
- `rendering.javascript_payload_large`
- `rendering.third_party_payload_large`

Console errors are retained as evidence but are not a standalone SEO issue. Failed primary requests, missing content, changed indexability, or an incomplete render provide stronger evidence.

## Output contract

Rendered audits add these artifacts:

- `render-audits.json`: readable array of all rendered page audits.
- `render-audits.jsonl`: one audit per line for streaming analysis.
- `page-metrics.json` / `page-metrics.jsonl`: derived per-page Technical Health, JavaScript Health, readiness, CPU, long-task, network, content-parity, and error measurements.
- `page-insights.json` / `page-insights.jsonl`: page-centric joins of crawl facts, metrics, issue roles/evidence, browser resources, JavaScript resources, console source locations, failed requests, and runtime errors.
- `site-metrics.json`: site-wide scores, render coverage, p50/p75/p95 distributions, resource composition, and third-party domain impact.
- `bodies/<sha256>.html`: deduplicated raw/browser/rendered bodies.
- `report.md` / `## JavaScript rendering`: bounded human summary and representative page table.
- UI `/pages`: unified technical/content/browser table with per-page Issues, Network, JavaScript, Errors, and Links evidence tabs. Legacy `#/rendering` links open this unified view.

Every representation includes its source, resolved URL, SHA-256, decoded byte count, content-addressed body path, and extracted observation. `manifest.json` inventories the structured artifacts and bodies.

The execution observation also retains a bounded browser telemetry stream: console events with source locations, uncaught page errors, request failures, HTTP response statuses, resource types, MIME types, service-worker provenance, request duration, Playwright-reported request/response byte sizes, long tasks, and Chromium Performance-domain runtime metrics. Baseline/end Performance deltas separate JavaScript CPU (`ScriptDuration`) and total main-thread task work (`TaskDuration`) from the aggregate network duration of script requests.

Reports derive page and site metrics without mutating or replacing this evidence. Site summaries expose render coverage and p50/p75/p95 distributions rather than presenting a crawl-wide transfer sum as the size of a typical page. Third-party classification uses registrable domains, so first-party subdomains remain grouped with the audited site. Timing remains a lab observation affected by runtime hardware and is not presented as Core Web Vitals.

JavaScript Health is a deterministic 0–100 summary composed from content safety (30%), render reliability (20%), main-thread work (20%), network cost (20%), and execution errors (10%). If the Chromium Performance domain is unavailable, main-thread work is omitted and the remaining weights are normalized; the page and site evidence-coverage values report that limitation. Every component and underlying observation remains available so the score is never the sole diagnostic.

## Operating modes

```bash
# Fast response-HTML crawl
bun run audit -- crawl https://example.com --render off

# Render every eligible HTML page within the render safety bound (default)
bun run audit -- crawl https://example.com

# Render suspicious pages only: scripts plus thin/missing raw content or metadata
bun run audit -- crawl https://example.com --render smart
```

Install the pinned Chromium revision first with `bunx playwright install chromium`. `smart` is a cost-control policy, not an exact Google simulation. Any page without rendered evidence makes render-dependent rules unavailable for that page/audit rather than falsely passed.

`all` is the CLI and engine default. Use `--render smart` for cost-saving selection or `--render off` explicitly for a fetch-only crawl.

## Research baseline

- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google search-related JavaScript troubleshooting](https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript)
- [Google lazy-loading guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading)
- [Screaming Frog JavaScript crawling](https://www.screamingfrog.co.uk/seo-spider/tutorials/crawl-javascript-seo/)
- [Sitebulb Response vs Render](https://support.sitebulb.com/en/articles/9857330-response-vs-render-report)
- [Lumar JavaScript rendering](https://www.lumar.io/product-guides/how-to-crawl/javascript-rendering/)

These sources guide the observable model. Vendor-specific timing, proprietary prioritization, and Google's internal scheduling are not copied or claimed.
