# @duskydots/seo-audit

Strict TypeScript and Zod-validated technical SEO crawl engine for Bun. It exposes the crawler, audit schemas, graph and rule contracts, rendering comparisons, Markdown reporting data, and deterministic execution resource planning.

```ts
import { CrawlConfigSchema, crawlSite } from "@duskydots/seo-audit";

const audit = await crawlSite(CrawlConfigSchema.parse({
  seed: "https://example.com/",
  outputDirectory: "audit-example",
  concurrency: 8,
  render: "off",
  renderWorkers: 1,
  maxRenderPages: 0,
}));
```

This package requires Bun. Browser rendering uses the package's exact Playwright version and the CLI-managed Chromium setup.
`CrawlConfigSchema` defaults to rendering all eligible HTML pages within the render safety bound. Browser observations include bounded resource status, size and timing evidence, service-worker provenance, console events, uncaught runtime errors, lifecycle checkpoints, and raw-to-rendered SEO deltas. Set `render: "smart"` for cost-saving selection or `render: "off"` explicitly when embedding the engine without Chromium.
