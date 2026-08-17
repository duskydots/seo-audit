import type { AuditBundle } from "./audit.schema.ts";
import { issueMarkdownPath, pageMarkdownPath } from "./markdown-document-path.ts";
import { markdownValue } from "./markdown-escape.ts";

export function renderMarkdown(bundle: AuditBundle): string {
  const pages = bundle.pages.filter((page) => page.internal).sort((left, right) => left.url.localeCompare(right.url));
  const lines = [
    `# SEO audit: ${new URL(bundle.summary.site).host}`,
    "",
    `Generated ${bundle.summary.completedAt}. Crawl status: **${bundle.summary.status}**.`,
    "",
    "> This is the compact report entry point. Detailed Markdown is split by concern, issue, and page; JSON/JSONL contains uncapped canonical data and evidence.",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Internal URLs | ${bundle.summary.totals.internal} |`,
    `| Crawled URLs | ${bundle.summary.totals.crawled} |`,
    `| Indexable candidates | ${bundle.summary.totals.indexable} |`,
    `| Non-indexable URLs | ${bundle.summary.totals.nonIndexable} |`,
    `| 4xx URLs | ${bundle.summary.totals.errors4xx} |`,
    `| 5xx URLs | ${bundle.summary.totals.errors5xx} |`,
    `| Findings | ${bundle.findings.length} |`,
    `| Rendered pages | ${bundle.renderAudits.length} |`,
    "",
    "## Documentation map",
    "",
    "- [Overview, health metrics, and rule coverage](markdown/overview.md)",
    "- [Issue index](markdown/issues/index.md)",
    "- [Page index](markdown/pages/index.md)",
    "- [Site hierarchy and connectivity](markdown/structure.md)",
    "- [JavaScript rendering](markdown/rendering.md)",
    "- [Glossary](markdown/glossary.md)",
    "- [Agent audit-reading guide](markdown/agent-guide.md)",
    "",
    "## Finding preview",
    "",
    "| Severity | Category | Finding | Affected URLs |",
    "|---|---|---|---:|",
    ...bundle.findings.slice(0, 20).map((finding, index) => {
      const path = issueMarkdownPath(index, bundle.findings.length, finding.ruleId);
      return `| ${finding.severity} | ${finding.category} | [${markdownValue(finding.title)}](${path}) | ${finding.count} |`;
    }),
    ...(bundle.findings.length === 0 ? ["| — | — | No findings | 0 |"] : []),
    "",
    "## Page documents",
    "",
    ...pages.slice(0, 20).map((page, index) => `- [${markdownValue(page.url)}](${pageMarkdownPath(index, pages.length, page.url)})`),
    ...(pages.length > 20 ? [`- …${pages.length - 20} more; use the [page index](markdown/pages/index.md).`] : []),
    "",
    "## Methodology and limitations",
    "",
    "This audit separates sitemap discovery from observed HTML connectivity. Indexable means technically eligible under the implemented policy, not confirmed indexed. Rendering is a bounded Playwright Chromium simulation, not Google's Web Rendering Service. It does not click, scroll, grant permissions, or prove what Google indexed. Raw and rendered evidence remain separate; a hard timeout preserves the DOM available at the deadline. Missing capabilities are reported as not evaluated rather than passed.",
    "",
  ];
  return lines.join("\n");
}
