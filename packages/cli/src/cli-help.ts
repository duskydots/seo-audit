export function renderCliHelp(): string {
  return `seo-audit — deterministic technical SEO crawler

Usage:
  seo-audit crawl <url> [--concurrency auto|<n>] [--render off|smart|all]
                         [--render-workers auto|<n>] [--max-render-pages <n>]
  seo-audit open <audit-directory>

Examples:
  seo-audit crawl https://example.com # Playwright renders eligible HTML pages by default
  seo-audit crawl https://example.com --render off
  seo-audit crawl https://example.com --render smart --max-render-pages 20 # cost-saving selection
  seo-audit open audit-example # always http://localhost:4173
`;
}
