export const REPORT_UI_DATA_FILES = Object.freeze([
  "summary.json",
  "pages.json",
  "edges.json",
  "findings.json",
  "rules.json",
  "rule-catalog.json",
  "render-audits.json",
  "page-metrics.json",
  "page-insights.json",
  "site-metrics.json",
] as const);

export const REPORT_UI_OPTIONAL_FILES = Object.freeze(["manifest.json", "report.md"] as const);

export const REPORT_UI_ARTIFACT_PATHS: Readonly<Record<(typeof REPORT_UI_DATA_FILES)[number], string>> = Object.freeze({
  "summary.json": "data/summary.json",
  "pages.json": "data/pages.json",
  "edges.json": "evidence/edges.json",
  "findings.json": "evidence/findings.json",
  "rules.json": "rules/evaluations.json",
  "rule-catalog.json": "rules/catalog.json",
  "render-audits.json": "evidence/render-audits.json",
  "page-metrics.json": "data/page-metrics.json",
  "page-insights.json": "data/page-insights.json",
  "site-metrics.json": "data/site-metrics.json",
});
