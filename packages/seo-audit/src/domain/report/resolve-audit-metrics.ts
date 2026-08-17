import type { AuditBundle } from "./audit.schema.ts";
import { buildPageMetrics } from "./build-page-metrics.ts";
import { buildSiteMetric } from "./build-site-metric.ts";

export function resolveAuditMetrics(bundle: AuditBundle) {
  const pageMetrics = bundle.pageMetrics.length > 0 ? bundle.pageMetrics : buildPageMetrics(bundle);
  const siteMetric = bundle.siteMetric ?? buildSiteMetric(bundle.summary.site, pageMetrics, bundle.renderAudits);
  return Object.freeze({ pageMetrics, siteMetric });
}
