import type { AuditBundle } from "./audit.schema.ts";
import { AUDIT_ARTIFACT_PATHS } from "./audit-artifact-paths.ts";
import { issueMarkdownPath, pageMarkdownPath } from "./markdown-document-path.ts";
import { markdownValue } from "./markdown-escape.ts";
import { renderFindingsMarkdown } from "./render-findings-markdown.ts";
import { renderMarkdown } from "./render-markdown.ts";
import { renderOverviewMarkdown } from "./render-overview-markdown.ts";
import { renderPagesMarkdown } from "./render-pages-markdown.ts";
import { renderRenderingMarkdown } from "./render-rendering-markdown.ts";
import { renderStructureMarkdown } from "./render-structure-markdown.ts";

export interface MarkdownArtifact {
  path: string;
  value: string;
  rows: number;
}

export function buildMarkdownArtifacts(bundle: AuditBundle): MarkdownArtifact[] {
  const findings = [...bundle.findings];
  const pages = bundle.pages.filter((page) => page.internal).sort((left, right) => left.url.localeCompare(right.url));
  const issuePaths = findings.map((finding, index) => issueMarkdownPath(index, findings.length, finding.ruleId));
  const pagePaths = pages.map((page, index) => pageMarkdownPath(index, pages.length, page.url));
  const artifacts: MarkdownArtifact[] = [
    { path: AUDIT_ARTIFACT_PATHS.report, value: renderMarkdown(bundle), rows: 1 },
    {
      path: AUDIT_ARTIFACT_PATHS.markdownOverview,
      value: document("Audit overview", renderOverviewMarkdown(bundle)),
      rows: 1,
    },
    {
      path: AUDIT_ARTIFACT_PATHS.markdownStructure,
      value: document("Site structure", renderStructureMarkdown(bundle)),
      rows: bundle.edges.length,
    },
    {
      path: AUDIT_ARTIFACT_PATHS.markdownRendering,
      value: document("JavaScript rendering", renderRenderingMarkdown(bundle)),
      rows: bundle.renderAudits.length,
    },
    {
      path: AUDIT_ARTIFACT_PATHS.markdownIssueIndex,
      value: issueIndex(bundle, issuePaths),
      rows: findings.length,
    },
    {
      path: AUDIT_ARTIFACT_PATHS.markdownPageIndex,
      value: pageIndex(bundle, pages, pagePaths),
      rows: pages.length,
    },
    { path: AUDIT_ARTIFACT_PATHS.markdownGlossary, value: glossary(), rows: 12 },
    { path: AUDIT_ARTIFACT_PATHS.markdownAgentGuide, value: agentGuide(), rows: 1 },
  ];

  for (const [index, finding] of findings.entries()) {
    const path = pathAt(issuePaths, index);
    artifacts.push({
      path,
      value: document(finding.title, ["[Back to issue index](./index.md)", "", ...renderFindingsMarkdown(bundle, new Set([finding.id]))]),
      rows: finding.count,
    });
  }
  for (const [index, page] of pages.entries()) {
    const path = pathAt(pagePaths, index);
    artifacts.push({
      path,
      value: document(page.title || page.url, [
        "[Back to page index](./index.md)",
        "",
        ...renderPagesMarkdown(bundle, { pageUrls: new Set([page.url]), includeInventory: false }),
      ]),
      rows: 1,
    });
  }
  return artifacts;
}

function issueIndex(bundle: AuditBundle, paths: readonly string[]): string {
  const lines = [
    "# Issue index",
    "",
    "[Back to report](../../report.md)",
    "",
    "Each finding has one bounded Markdown document. Complete machine-readable evidence is stored once in `../../evidence/findings.json` and `../../evidence/findings.jsonl`.",
    "",
    "| Severity | Type | Category | Rule | Finding | Affected URLs |",
    "|---|---|---|---|---|---:|",
    ...bundle.findings.map(
      (finding, index) =>
        `| ${finding.severity} | ${finding.findingType} | ${finding.category} | ${markdownValue(finding.ruleId)} | [${markdownValue(finding.title)}](./${fileName(pathAt(paths, index))}) | ${finding.count} |`,
    ),
    ...(bundle.findings.length === 0 ? ["| — | — | — | — | No findings | 0 |"] : []),
    "",
  ];
  return lines.join("\n");
}

function pageIndex(bundle: AuditBundle, pages: AuditBundle["pages"], paths: readonly string[]): string {
  const fileRows = [
    "### Page files",
    "",
    "| URL | Title | Document |",
    "|---|---|---|",
    ...pages.map((page, index) => `| ${markdownValue(page.url)} | ${markdownValue(page.title)} | [Open](./${fileName(pathAt(paths, index))}) |`),
    "",
  ];
  return document("Page index", ["[Back to report](../../report.md)", "", ...renderPagesMarkdown(bundle, { includeDetails: false }), ...fileRows]);
}

function glossary(): string {
  return `# Audit glossary

[Back to report](../report.md)

| Term | Meaning |
|---|---|
| Affected URL | A page on which a rule's condition was observed. |
| Source URL | The page that emitted a link, request, or other relationship causing evidence. |
| Target URL | The destination of an observed relationship. |
| Finding | A grouped rule result with severity, remediation, and evidence. |
| Evidence | The exact page field, browser event, request, or source-to-target link supporting a finding. |
| Association-only | A page is related to a finding, but no stronger field/browser/link record was available. |
| Fetch raw | HTML returned by the crawler's HTTP request. |
| Browser raw | HTML observed by Chromium at initial document delivery. |
| Rendered DOM | DOM retained after bounded JavaScript execution and content-stability checks. |
| Navigation depth | Shortest observed internal anchor path from the crawl seed. |
| Sitemap discovery | Publisher-declared URL discovery; it is not an HTML connection. |
| Indexable candidate | Technically eligible under implemented rules; not proof that a search engine indexed the URL. |
`;
}

function agentGuide(): string {
  return `# Agent audit-reading guide

[Back to report](../report.md)

1. Read \`../report.md\` for crawl status, totals, and the documentation map.
2. Read \`overview.md\` for health metrics and rule coverage.
3. Read \`issues/index.md\`, then open only the issue documents relevant to the question.
4. Use \`pages/index.md\` to locate a URL document containing its metrics, related issues, requests, JavaScript, errors, and links.
5. Use JSON for joins and JSONL for streaming. Canonical evidence lives under \`../evidence/\`; derived page projections live under \`../data/\`.
6. Treat \`evidence/findings.jsonl\` as the uncapped finding record. Page insight issue snapshots intentionally omit global URL/evidence arrays to prevent quadratic duplication.
7. Preserve source → target direction when explaining broken links, redirects, failed requests, or graph connectivity.
8. Do not infer Google indexing, rankings, traffic, or Core Web Vitals from this technical crawl.
`;
}

function document(title: string, lines: readonly string[]): string {
  return [`# ${title}`, "", ...lines, ""].join("\n");
}

function pathAt(paths: readonly string[], index: number): string {
  const path = paths[index];
  if (!path) throw new Error(`Markdown artifact invariant violated: missing path at index ${index}`);
  return path;
}

function fileName(path: string): string {
  const name = path.split("/").at(-1);
  if (!name) throw new Error(`Markdown artifact invariant violated: invalid path ${path}`);
  return name;
}
