import { existsSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { type AuditBundle, AuditBundleSchema, AuditManifestSchema } from "../../domain/report/audit.schema.ts";
import { AUDIT_ARTIFACT_PATHS } from "../../domain/report/audit-artifact-paths.ts";
import { buildMarkdownArtifacts } from "../../domain/report/build-markdown-artifacts.ts";
import { buildPageInsights } from "../../domain/report/build-page-insights.ts";
import { buildPageMetrics } from "../../domain/report/build-page-metrics.ts";
import { buildSiteMetric } from "../../domain/report/build-site-metric.ts";
import { TOOL_VERSION } from "../../tool-version.ts";

function serializeJsonLines(values: readonly unknown[]): string {
  return `${values.map((value) => JSON.stringify(value)).join("\n")}\n`;
}

export async function writeAuditArtifacts(outputDirectory: string, input: AuditBundle, bodies: ReadonlyMap<string, string> = new Map()): Promise<AuditBundle> {
  const parsed = AuditBundleSchema.parse(input);
  const pageMetrics = buildPageMetrics(parsed);
  const siteMetric = buildSiteMetric(parsed.summary.site, pageMetrics, parsed.renderAudits);
  const measured = AuditBundleSchema.parse({ ...parsed, pageMetrics, siteMetric, pageInsights: [] });
  const bundle = AuditBundleSchema.parse({ ...measured, pageInsights: buildPageInsights(measured) });
  const parent = dirname(outputDirectory);
  const temporary = join(parent, `.${basename(outputDirectory)}.tmp-${process.pid}-${Date.now()}`);
  await mkdir(temporary, { recursive: true });
  const files = [
    { path: AUDIT_ARTIFACT_PATHS.summary, value: `${JSON.stringify(bundle.summary, null, 2)}\n`, rows: 1 },
    { path: AUDIT_ARTIFACT_PATHS.pages, value: `${JSON.stringify(bundle.pages, null, 2)}\n`, rows: bundle.pages.length },
    { path: AUDIT_ARTIFACT_PATHS.edges, value: `${JSON.stringify(bundle.edges, null, 2)}\n`, rows: bundle.edges.length },
    { path: AUDIT_ARTIFACT_PATHS.findings, value: `${JSON.stringify(bundle.findings, null, 2)}\n`, rows: bundle.findings.length },
    { path: AUDIT_ARTIFACT_PATHS.ruleEvaluations, value: `${JSON.stringify(bundle.ruleEvaluations, null, 2)}\n`, rows: bundle.ruleEvaluations.length },
    { path: AUDIT_ARTIFACT_PATHS.ruleCatalog, value: `${JSON.stringify(bundle.ruleCatalog, null, 2)}\n`, rows: bundle.ruleCatalog.length },
    { path: AUDIT_ARTIFACT_PATHS.renderAudits, value: `${JSON.stringify(bundle.renderAudits, null, 2)}\n`, rows: bundle.renderAudits.length },
    { path: AUDIT_ARTIFACT_PATHS.pageMetrics, value: `${JSON.stringify(bundle.pageMetrics, null, 2)}\n`, rows: bundle.pageMetrics.length },
    { path: AUDIT_ARTIFACT_PATHS.pageInsights, value: `${JSON.stringify(bundle.pageInsights, null, 2)}\n`, rows: bundle.pageInsights.length },
    { path: AUDIT_ARTIFACT_PATHS.siteMetrics, value: `${JSON.stringify(bundle.siteMetric, null, 2)}\n`, rows: 1 },
    { path: AUDIT_ARTIFACT_PATHS.pagesJsonl, value: serializeJsonLines(bundle.pages), rows: bundle.pages.length },
    { path: AUDIT_ARTIFACT_PATHS.edgesJsonl, value: serializeJsonLines(bundle.edges), rows: bundle.edges.length },
    { path: AUDIT_ARTIFACT_PATHS.findingsJsonl, value: serializeJsonLines(bundle.findings), rows: bundle.findings.length },
    { path: AUDIT_ARTIFACT_PATHS.ruleEvaluationsJsonl, value: serializeJsonLines(bundle.ruleEvaluations), rows: bundle.ruleEvaluations.length },
    { path: AUDIT_ARTIFACT_PATHS.ruleCatalogJsonl, value: serializeJsonLines(bundle.ruleCatalog), rows: bundle.ruleCatalog.length },
    { path: AUDIT_ARTIFACT_PATHS.renderAuditsJsonl, value: serializeJsonLines(bundle.renderAudits), rows: bundle.renderAudits.length },
    { path: AUDIT_ARTIFACT_PATHS.pageMetricsJsonl, value: serializeJsonLines(bundle.pageMetrics), rows: bundle.pageMetrics.length },
    { path: AUDIT_ARTIFACT_PATHS.pageInsightsJsonl, value: serializeJsonLines(bundle.pageInsights), rows: bundle.pageInsights.length },
    ...buildMarkdownArtifacts(bundle),
  ];
  await Promise.all(
    files.map(async (file) => {
      await mkdir(dirname(join(temporary, file.path)), { recursive: true });
      await Bun.write(join(temporary, file.path), file.value);
    }),
  );
  await Promise.all(
    [...bodies].map(async ([hash, body]) => {
      if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid body hash: ${hash}`);
      await mkdir(join(temporary, "evidence", "bodies"), { recursive: true });
      await Bun.write(join(temporary, "evidence", "bodies", `${hash}.html`), body);
    }),
  );
  const manifest = AuditManifestSchema.parse({
    schemaVersion: 1,
    toolVersion: TOOL_VERSION,
    generatedAt: bundle.summary.completedAt,
    ...(bundle.executionPlan ? { executionPlan: bundle.executionPlan } : {}),
    files: [
      ...files.map(({ path, rows }) => ({ path, rows })),
      ...[...bodies.keys()].sort().map((hash) => ({ path: `evidence/bodies/${hash}.html`, rows: 1 })),
    ],
  });
  await Bun.write(join(temporary, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (existsSync(outputDirectory)) throw new Error(`Output already exists: ${outputDirectory}`);
  await rename(temporary, outputDirectory);
  return bundle;
}
