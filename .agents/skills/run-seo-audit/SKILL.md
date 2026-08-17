---
name: run-seo-audit
description: Run, resume, inspect, and explain this repository's Bun technical SEO crawler through its CLI and structured artifacts. Use when asked to crawl or audit a site, render an SPA, inspect site connectivity, find broken links or indexability issues, compare crawls, validate audit JSON/JSONL, or summarize the generated Markdown report.
---

# Run SEO Audit

Operate the repository CLI safely and explain findings from evidence. Do not invent crawl results when the implementation or required credentials are absent.

## Workflow

1. Read `AGENTS.md`, the relevant CLI section of `SEO_CRAWLER_SPEC.md`, `package.json`, and current `--help` output.
2. Confirm the target and crawl authorization from the request. Never broaden scope beyond configured origins or subdomains.
3. Choose raw or rendered mode: use `off` for HTTP/HTML, `smart` for SPAs or uncertain raw content, and `all` only when explicitly requested.
4. If rendering is requested, check the pinned Playwright Chromium executable. If missing, use `bunx playwright install chromium` only with authorization; this is dependency setup, not an SEO Audit command. Do not install operating-system packages without approval.
5. Run the smallest bounded crawl that satisfies the request. Keep robots enabled unless explicitly authorized otherwise.
6. Inspect `manifest.json` before interpretation. Report incomplete, bounded, aborted, and missing-capability coverage.
7. For rendered audits, read `JAVASCRIPT_RENDERING.md`, validate `evidence/render-audits.json`, and report render coverage, termination states, rendered-only links, indexability changes, primary request failures, and the exact representation pair being compared. Legacy root-level artifacts remain readable.
8. Resolve `bodyPath` only inside the selected audit directory and use content-addressed HTML for debugging; do not treat a serialized source diff as a finding by itself.
9. Validate structured artifacts using repository schemas/tests before custom processing.
10. Read `rules/catalog.json` to explain why each priority rule matters, its exact trigger, evidence contract, confidence, tags, and remediation.
11. Cite the exact typed record in `evidence/findings.json`: page field/value, graph source → target edge, or Playwright page/request/metric/delta evidence. Never reduce exact evidence to an unpaired URL list.
12. Start Markdown analysis at `report.md`, use `markdown/issues/index.md` or `markdown/pages/index.md`, and open only the relevant per-issue or per-page files. `markdown/agent-guide.md` documents the intended reading order.

## Commands

Use only commands present in the implemented `--help`:

```text
seo-audit crawl <url> --render smart
seo-audit crawl <url> --render all --max-render-pages <n>
seo-audit open <audit-directory>
```

`crawl` and `open` are the only public commands. `open` always uses loopback port 4173 and fails if that port is unavailable. Do not claim or invoke `ui`, `setup`, `export`, `inspect`, `report`, `compare`, or resumable crawl commands. Do not substitute another crawler unless asked.

## Interpretation rules

- A sitemap URL is not an internal HTML inlink.
- “Indexable” means eligible under the selected policy, not confirmed indexed.
- A network timeout is not a confirmed broken link.
- Raw/rendered differences must name both representations and the render termination reason.
- `deliveryDelta` is fetch-versus-browser delivery variance; `renderDelta` is browser-response-versus-final-DOM execution variance; `totalDelta` is the primary fetch-versus-final-DOM audit view.
- A hard timeout preserves partial evidence and lowers certainty; it is not equivalent to a navigation failure.
- Rendered-only links are valid discoveries but are not raw HTML inlinks.
- Provider crawler access is not proof of AI citation or inclusion.
- Never collapse warnings into an unexplained overall SEO score.

Prefer Markdown for the human summary and JSONL for exhaustive analysis. Keep examples bounded and link to complete exports.
