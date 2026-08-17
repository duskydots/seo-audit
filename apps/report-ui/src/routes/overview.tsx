import { Link } from "@tanstack/react-router";
import { useAudit } from "../audit-data.tsx";
import { MetricBarChart } from "../components/metric-bar-chart.tsx";
import { MetricCard } from "../components/metric-card.tsx";
import { SeverityPill } from "../components/severity-pill.tsx";
import { formatNumber, hostLabel } from "../format.ts";

export function OverviewPage() {
  const { summary, findings, pages, renderAudits, pageMetrics, siteMetric } = useAudit();
  if (!siteMetric) throw new Error("Site metrics are unavailable");
  const totalResponses = Object.values(summary.responseCodes).reduce((sum, count) => sum + count, 0) || 1;
  const statusGroups = Object.entries(summary.responseCodes).sort(([a], [b]) => a.localeCompare(b));
  const depths = new Map<number, typeof pages>();
  for (const page of pages) {
    if (!page.internal || page.navigationDepth === undefined) {
      continue;
    }

    const depth = page.navigationDepth;
    depths.set(depth, [...(depths.get(depth) ?? []), page]);
  }
  const componentRows = (["retrieval", "indexability", "content", "connectivity"] as const).map((component) => ({
    label: component,
    value:
      pageMetrics.length === 0
        ? 0
        : Math.round(pageMetrics.reduce((sum, metric) => sum + metric.technicalHealth.components[component], 0) / pageMetrics.length),
  }));
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Technical SEO audit</span>
          <h1>{hostLabel(summary.site)}</h1>
          <p>Fast crawl overview with evidence-backed issues and observed site connectivity.</p>
        </div>
        <span className={`crawl-badge ${summary.status}`}>{summary.status}</span>
      </header>
      <section className="metric-grid">
        <MetricCard
          icon="◎"
          label="Technical Health"
          value={`${siteMetric.technicalHealth.score}/100`}
          detail={`${siteMetric.technicalHealth.pagesEvaluated} internal pages evaluated`}
          tone={siteMetric.technicalHealth.status === "good" ? "good" : siteMetric.technicalHealth.status === "poor" ? "bad" : "warn"}
        />
        <MetricCard
          icon="JS"
          label="JavaScript Health"
          value={siteMetric.javascriptHealth ? `${siteMetric.javascriptHealth.score}/100` : "N/A"}
          detail={siteMetric.javascriptHealth ? `${Math.round(siteMetric.javascriptHealth.coverage * 100)}% render coverage` : "No browser evidence"}
          tone={
            !siteMetric.javascriptHealth
              ? "neutral"
              : siteMetric.javascriptHealth.status === "good"
                ? "good"
                : siteMetric.javascriptHealth.status === "poor"
                  ? "bad"
                  : "warn"
          }
        />
        <MetricCard
          icon="!"
          label="Issues"
          value={formatNumber(summary.totals.issues)}
          detail={`${summary.totals.errors4xx + summary.totals.errors5xx} URL errors`}
          tone={summary.totals.issues ? "bad" : "good"}
        />
        <MetricCard
          icon="◫"
          label="Coverage"
          value={`${formatNumber(summary.totals.crawled)}/${formatNumber(summary.totals.discovered)}`}
          detail={`${renderAudits.filter((audit) => audit.execution.termination === "stable").length}/${renderAudits.length} renders stable`}
          tone={renderAudits.some((audit) => audit.execution.termination !== "stable") ? "warn" : "neutral"}
        />
      </section>
      <section className="two-column dashboard-charts">
        <article className="panel chart-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Technical Health components</span>
              <h2>Where pages need work</h2>
            </div>
          </div>
          <MetricBarChart rows={componentRows} ariaLabel="Average technical health component scores" />
        </article>
        <article className="panel chart-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Page score distribution</span>
              <h2>Typical and outlier health</h2>
            </div>
          </div>
          <MetricBarChart
            rows={[
              { label: "minimum", value: siteMetric.distributions.technicalHealth.minimum },
              { label: "p50", value: siteMetric.distributions.technicalHealth.p50 },
              { label: "p75", value: siteMetric.distributions.technicalHealth.p75 },
              { label: "p95", value: siteMetric.distributions.technicalHealth.p95 },
              { label: "maximum", value: siteMetric.distributions.technicalHealth.maximum },
            ]}
            ariaLabel="Technical health score distribution"
            color="#3178a8"
          />
        </article>
      </section>
      <section className="two-column">
        <article className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">HTTP coverage</span>
              <h2>Response distribution</h2>
            </div>
          </div>
          <div className="status-bars">
            {statusGroups.map(([status, count]) => (
              <div className="status-row" key={status}>
                <span className={`status-code status-${status[0]}`}>{status}</span>
                <div className="bar-track">
                  <div className={`bar-fill status-${status[0]}`} style={{ width: `${Math.max(2, (count / totalResponses) * 100)}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Architecture</span>
              <h2>Crawl depth</h2>
            </div>
            <Link to="/graph">View graph →</Link>
          </div>
          <div className="depth-chart">
            {[...depths.entries()]
              .sort(([a], [b]) => a - b)
              .slice(0, 10)
              .map(([depth, group]) => (
                <div key={depth} className="depth-column">
                  <div
                    className="depth-bar"
                    style={{ height: `${Math.max(8, (group.length / Math.max(...[...depths.values()].map((g) => g.length))) * 150)}px` }}
                  >
                    <span>{group.length}</span>
                  </div>
                  <small>{depth}</small>
                </div>
              ))}
          </div>
        </article>
      </section>
      <section className="panel issue-preview">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Prioritized work</span>
            <h2>Top issues</h2>
          </div>
          <Link to="/issues">All issues →</Link>
        </div>
        <div className="issue-list">
          {findings.slice(0, 6).map((item) => (
            <Link to="/issues" key={item.id} className="issue-row">
              <SeverityPill severity={item.severity} />
              <div>
                <strong>{item.title}</strong>
                <span>{item.summary}</span>
              </div>
              <b>{item.count}</b>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
