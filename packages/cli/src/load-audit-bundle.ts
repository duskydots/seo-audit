import { join } from "node:path";
import {
  AUDIT_ARTIFACT_PATHS,
  type AuditBundle,
  AuditBundleSchema,
  buildPageInsights,
  buildPageMetrics,
  buildSiteMetric,
  LEGACY_AUDIT_ARTIFACT_PATHS,
} from "@duskydots/seo-audit/reporting";

export async function loadAuditBundle(auditDirectory: string): Promise<AuditBundle> {
  const readJson = async (name: string, legacyName: string): Promise<unknown> => {
    const current = Bun.file(join(auditDirectory, name));
    if (await current.exists()) return await current.json();
    const legacy = Bun.file(join(auditDirectory, legacyName));
    if (await legacy.exists()) return await legacy.json();
    throw new Error(`Audit artifact is missing: ${name}`);
  };
  const readOptionalJson = async (name: string, legacyName: string): Promise<unknown | undefined> => {
    const current = Bun.file(join(auditDirectory, name));
    if (await current.exists()) return await current.json();
    const legacy = Bun.file(join(auditDirectory, legacyName));
    return (await legacy.exists()) ? await legacy.json() : undefined;
  };

  const parsed = AuditBundleSchema.parse({
    summary: await readJson(AUDIT_ARTIFACT_PATHS.summary, LEGACY_AUDIT_ARTIFACT_PATHS.summary),
    pages: await readJson(AUDIT_ARTIFACT_PATHS.pages, LEGACY_AUDIT_ARTIFACT_PATHS.pages),
    edges: await readJson(AUDIT_ARTIFACT_PATHS.edges, LEGACY_AUDIT_ARTIFACT_PATHS.edges),
    findings: await readJson(AUDIT_ARTIFACT_PATHS.findings, LEGACY_AUDIT_ARTIFACT_PATHS.findings),
    ruleEvaluations: await readJson(AUDIT_ARTIFACT_PATHS.ruleEvaluations, LEGACY_AUDIT_ARTIFACT_PATHS.ruleEvaluations),
    ruleCatalog: (await readOptionalJson(AUDIT_ARTIFACT_PATHS.ruleCatalog, LEGACY_AUDIT_ARTIFACT_PATHS.ruleCatalog)) ?? [],
    renderAudits: await readJson(AUDIT_ARTIFACT_PATHS.renderAudits, LEGACY_AUDIT_ARTIFACT_PATHS.renderAudits),
    pageMetrics: (await readOptionalJson(AUDIT_ARTIFACT_PATHS.pageMetrics, LEGACY_AUDIT_ARTIFACT_PATHS.pageMetrics)) ?? [],
    pageInsights: [],
    siteMetric: await readOptionalJson(AUDIT_ARTIFACT_PATHS.siteMetrics, LEGACY_AUDIT_ARTIFACT_PATHS.siteMetrics),
  });
  const pageMetrics = parsed.pageMetrics.length > 0 ? parsed.pageMetrics : buildPageMetrics(parsed);
  const siteMetric = parsed.siteMetric ?? buildSiteMetric(parsed.summary.site, pageMetrics, parsed.renderAudits);
  const measured = AuditBundleSchema.parse({ ...parsed, pageMetrics, siteMetric });
  const pageInsights = buildPageInsights(measured);
  return AuditBundleSchema.parse({ ...measured, pageInsights });
}
