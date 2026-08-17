# CLI reference

This page is generated from the installed CLI help. Do not edit it directly.

```text
seo-audit — deterministic technical SEO crawler

Usage:
  seo-audit crawl <url> [--concurrency auto|<n>] [--render off|smart|all]
                         [--render-workers auto|<n>] [--max-render-pages <n>]
  seo-audit open <audit-directory>

Examples:
  seo-audit crawl https://example.com # Playwright renders eligible HTML pages by default
  seo-audit crawl https://example.com --render off
  seo-audit crawl https://example.com --render smart --max-render-pages 20 # cost-saving selection
  seo-audit open audit-example # always http://localhost:4173
```

## Runtime dependencies

- Bun 1.3 or newer is required to invoke the published TypeScript CLI.
- Vite is not installed on user machines. The release process builds the report application once and packages its static assets with the CLI.
- Playwright Chromium is required for rendered crawling. Install the package's pinned browser with `bunx playwright install chromium` when the executable is not already available. This is dependency setup, not an SEO Audit command.

## Open a report

`seo-audit open <audit-directory>` validates the audit and serves the embedded report application at exactly `http://localhost:4173`. The command has no port option and exits with an error when port 4173 is unavailable.
