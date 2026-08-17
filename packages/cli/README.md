# @duskydots/seo-audit-cli

CLI for `@duskydots/seo-audit`. Install it with Bun and invoke the `seo-audit` binary:

```bash
bun add --global @duskydots/seo-audit-cli
bunx playwright install chromium
seo-audit crawl https://example.com
seo-audit open audit-example
```

Playwright rendering of eligible pages is enabled by default; use `--render off` for a fetch-only crawl or `--render smart` for cost-saving selection. Concurrency defaults to an OS-aware automatic plan. `--concurrency` controls native HTTP requests; `--render-workers` controls isolated Playwright/Chromium subprocesses. These are deliberately separate resource pools.

The npm package already contains the production report HTML, CSS, and JavaScript. Vite is not a runtime dependency. `seo-audit open <audit-directory>` validates the audit and serves it at exactly `http://localhost:4173`; there is no port option and an occupied port is an error.
