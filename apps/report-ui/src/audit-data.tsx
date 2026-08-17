import { type AuditBundle, AuditBundleSchema, buildPageInsights, buildPageMetrics, buildSiteMetric } from "@duskydots/seo-audit/reporting";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

type AuditState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: AuditBundle };

const AuditContext = createContext<AuditState>({ status: "loading" });

export function AuditDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuditState>({ status: "loading" });
  useEffect(() => {
    Promise.all([
      fetch("/data/summary.json").then((response) => response.json()),
      fetch("/data/pages.json").then((response) => response.json()),
      fetch("/data/edges.json").then((response) => response.json()),
      fetch("/data/findings.json").then((response) => response.json()),
      fetch("/data/rules.json").then((response) => (response.ok ? response.json() : [])),
      fetch("/data/rule-catalog.json").then((response) => (response.ok ? response.json() : [])),
      fetch("/data/render-audits.json").then((response) => (response.ok ? response.json() : [])),
      fetch("/data/page-metrics.json").then((response) => (response.ok ? response.json() : [])),
      fetch("/data/page-insights.json").then((response) => (response.ok ? response.json() : [])),
      fetch("/data/site-metrics.json").then((response) => (response.ok ? response.json() : undefined)),
    ])
      .then(([summary, pages, edges, findings, ruleEvaluations, ruleCatalog, renderAudits, storedPageMetrics, storedPageInsights, storedSiteMetric]) => {
        const parsed = AuditBundleSchema.parse({
          summary,
          pages,
          edges,
          findings,
          ruleEvaluations,
          ruleCatalog,
          renderAudits,
          pageMetrics: storedPageMetrics,
          pageInsights: storedPageInsights,
          siteMetric: storedSiteMetric,
        });
        const pageMetrics = parsed.pageMetrics.length > 0 ? parsed.pageMetrics : buildPageMetrics(parsed);
        const siteMetric = parsed.siteMetric ?? buildSiteMetric(parsed.summary.site, pageMetrics, parsed.renderAudits);
        const measured = AuditBundleSchema.parse({ ...parsed, pageMetrics, siteMetric });
        const pageInsights = measured.pageInsights.length > 0 ? measured.pageInsights : buildPageInsights(measured);
        setState({ status: "ready", data: AuditBundleSchema.parse({ ...measured, pageInsights }) });
      })
      .catch((error: unknown) => setState({ status: "error", message: error instanceof Error ? error.message : String(error) }));
  }, []);
  return <AuditContext.Provider value={state}>{children}</AuditContext.Provider>;
}

export function useAudit(): AuditBundle {
  const state = useContext(AuditContext);
  if (state.status === "loading") throw new Promise(() => undefined);
  if (state.status === "error") throw new Error(state.message);
  return state.data;
}

export function useAuditState(): AuditState {
  return useContext(AuditContext);
}
