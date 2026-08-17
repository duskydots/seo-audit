import { classifyIndexability, type Edge, type PageInsight, type PageMetric, type PageNode, REPORT_PRESENTATION_LIMITS } from "@duskydots/seo-audit/reporting";
import { createColumnHelper, createSortedRowModel, rowSortingFeature, tableFeatures, useTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useAudit } from "../audit-data.tsx";
import { HealthScore } from "../components/health-score.tsx";
import { MetricBarChart } from "../components/metric-bar-chart.tsx";
import { MetricCard } from "../components/metric-card.tsx";
import { SeverityPill } from "../components/severity-pill.tsx";
import { formatBytes } from "../format.ts";
import { pageMatchesQuery } from "../page-matches-query.ts";

type PageTableRow = Readonly<{ page: PageNode; metric: PageMetric; insight: PageInsight }>;
type ColumnPreset = "general" | "browser" | "content";
type DetailTab = "overview" | "issues" | "network" | "javascript" | "errors" | "links";

const pageTableFeatures = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });
const columnHelper = createColumnHelper<typeof pageTableFeatures, PageTableRow>();
const pageColumns = columnHelper.columns([
  columnHelper.accessor((row) => row.page.url, {
    id: "url",
    header: "Page",
    cell: ({ row }) => (
      <>
        <strong className="url-cell">{row.original.page.url}</strong>
        <small>{row.original.page.title ?? "No title"}</small>
      </>
    ),
  }),
  columnHelper.accessor((row) => row.page.status ?? 0, {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className={`status-code status-${String(row.original.page.status ?? 0)[0]}`}>{row.original.page.status ?? row.original.page.state}</span>
    ),
  }),
  columnHelper.accessor((row) => row.metric.technicalHealth.score, {
    id: "technical",
    header: "Technical",
    cell: ({ getValue }) => <HealthScore score={getValue()} label="Technical Health" />,
  }),
  columnHelper.accessor((row) => row.metric.javascriptHealth?.score, {
    id: "javascript",
    header: "JS health",
    sortUndefined: "last",
    cell: ({ getValue }) => <HealthScore score={getValue()} label="JavaScript Health" />,
  }),
  columnHelper.accessor((row) => row.insight.issues.length, { id: "issues", header: "Issues" }),
  columnHelper.accessor((row) => row.page.navigationDepth, { id: "depth", header: "Depth", sortUndefined: "last" }),
  columnHelper.accessor((row) => row.page.wordCount, { id: "words", header: "Words", sortUndefined: "last" }),
  columnHelper.accessor((row) => row.page.htmlBytes, { id: "html", header: "HTML", sortUndefined: "last", cell: ({ getValue }) => formatBytes(getValue()) }),
  columnHelper.accessor((row) => row.metric.browser?.contentStableMs, {
    id: "stable",
    header: "Content ready",
    sortUndefined: "last",
    cell: ({ getValue }) => formatMilliseconds(getValue()),
  }),
  columnHelper.accessor((row) => row.metric.browser?.scriptCpuMs, {
    id: "jsCpu",
    header: "JS CPU",
    sortUndefined: "last",
    cell: ({ getValue }) => formatMilliseconds(getValue()),
  }),
  columnHelper.accessor((row) => row.metric.browser?.javascriptBytes, {
    id: "jsBytes",
    header: "JS bytes",
    sortUndefined: "last",
    cell: ({ getValue }) => formatBytes(getValue()),
  }),
  columnHelper.accessor((row) => row.metric.browser?.transferredBytes, {
    id: "transfer",
    header: "Transfer",
    sortUndefined: "last",
    cell: ({ getValue }) => formatBytes(getValue()),
  }),
  columnHelper.accessor((row) => row.metric.browser?.thirdPartyBytes, {
    id: "thirdParty",
    header: "Third party",
    sortUndefined: "last",
    cell: ({ getValue }) => formatBytes(getValue()),
  }),
  columnHelper.accessor((row) => row.metric.browser?.requests, { id: "requests", header: "Requests", sortUndefined: "last" }),
  columnHelper.accessor((row) => (row.metric.browser ? row.metric.browser.httpErrors + row.metric.browser.failedRequests : undefined), {
    id: "networkErrors",
    header: "Network errors",
    sortUndefined: "last",
  }),
  columnHelper.accessor((row) => (row.metric.browser ? row.metric.browser.consoleErrors + row.metric.browser.pageErrors : undefined), {
    id: "runtimeErrors",
    header: "Runtime errors",
    sortUndefined: "last",
  }),
]);

const presetColumns: Readonly<Record<ColumnPreset, ReadonlySet<string>>> = {
  general: new Set(["url", "status", "technical", "javascript", "issues", "stable", "jsCpu", "jsBytes", "networkErrors", "runtimeErrors"]),
  browser: new Set(["url", "javascript", "stable", "jsCpu", "jsBytes", "transfer", "thirdParty", "requests", "networkErrors", "runtimeErrors"]),
  content: new Set(["url", "status", "technical", "issues", "depth", "words", "html"]),
};

const columnWidths: Readonly<Record<string, number>> = {
  url: 380,
  status: 92,
  technical: 106,
  javascript: 106,
  issues: 76,
  depth: 72,
  words: 84,
  html: 92,
  stable: 112,
  jsCpu: 92,
  jsBytes: 98,
  transfer: 98,
  thirdParty: 104,
  requests: 92,
  networkErrors: 112,
  runtimeErrors: 112,
};

const detailTabs: ReadonlyArray<Readonly<{ id: DetailTab; label: string }>> = [
  { id: "overview", label: "Overview" },
  { id: "issues", label: "Issues" },
  { id: "network", label: "Network" },
  { id: "javascript", label: "JavaScript" },
  { id: "errors", label: "Errors" },
  { id: "links", label: "Links" },
];

const browserColumns = new Set(["javascript", "stable", "jsCpu", "jsBytes", "transfer", "thirdParty", "requests", "networkErrors", "runtimeErrors"]);

export function PagesPage() {
  const { pages, edges, pageMetrics, pageInsights, renderAudits, siteMetric } = useAudit();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>();
  const [preset, setPreset] = useState<ColumnPreset>("general");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const metricByPage = useMemo(() => new Map(pageMetrics.map((metric) => [metric.url, metric] as const)), [pageMetrics]);
  const insightByPage = useMemo(() => new Map(pageInsights.map((insight) => [insight.page.url, insight] as const)), [pageInsights]);
  const tableRows = useMemo(
    () =>
      pages
        .flatMap((page) => {
          const metric = metricByPage.get(page.url);
          const insight = insightByPage.get(page.url);
          return page.internal && metric && insight && pageMatchesQuery(page, query) ? [{ page, metric, insight }] : [];
        })
        .sort((left, right) => left.page.url.localeCompare(right.page.url)),
    [pages, metricByPage, insightByPage, query],
  );
  const table = useTable({ features: pageTableFeatures, columns: pageColumns, data: tableRows, getRowId: (row) => row.page.id, enableSortingRemoval: false });
  const current = selected ? insightByPage.get(selected) : undefined;
  const currentPage = current?.page;
  const currentMetric = current?.metric;
  const inlinks = currentPage ? edges.filter((edge) => (edge.kind === "anchor" || edge.kind === "rendered-anchor") && edge.targetUrl === currentPage.url) : [];
  const outlinks = currentPage ? edges.filter((edge) => (edge.kind === "anchor" || edge.kind === "rendered-anchor") && edge.sourceUrl === currentPage.url) : [];
  const indexability = currentPage ? classifyIndexability(currentPage) : undefined;
  const stablePages = renderAudits.filter((audit) => audit.execution.termination === "stable").length;

  function selectPage(url: string, columnId?: string) {
    setSelected(url);
    if (columnId === "issues") setDetailTab("issues");
    else if (["requests", "transfer", "thirdParty", "networkErrors"].includes(columnId ?? "")) setDetailTab("network");
    else if (["javascript", "stable", "jsCpu", "jsBytes"].includes(columnId ?? "")) setDetailTab("javascript");
    else if (columnId === "runtimeErrors") setDetailTab("errors");
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Unified page and browser evidence</span>
          <h1>Pages</h1>
          <p>Technical SEO, content, JavaScript execution, network requests, errors, links and finding sources joined by canonical page URL.</p>
        </div>
        <div className="table-filter-group">
          <div className="table-controls">
            <select value={preset} onChange={(event) => setPreset(event.target.value as ColumnPreset)} aria-label="Page table column preset">
              <option value="general">General</option>
              <option value="browser">Browser</option>
              <option value="content">Content</option>
            </select>
            <input
              className="search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by URL or title…"
              aria-label="Filter pages by URL or title"
            />
            {query ? (
              <button type="button" className="clear-filter" onClick={() => setQuery("")}>
                Clear
              </button>
            ) : null}
          </div>
          <span className="table-result-count" aria-live="polite">
            Showing {tableRows.length} of {pageInsights.filter((insight) => insight.page.internal).length} internal URLs
          </span>
        </div>
      </header>
      {siteMetric ? (
        <>
          <section className="metric-grid page-browser-metrics">
            <MetricCard
              icon="T"
              label="Technical health"
              value={`${siteMetric.technicalHealth.score}/100`}
              detail={`${pageInsights.reduce((count, insight) => count + insight.issues.length, 0)} page associations`}
            />
            <MetricCard
              icon="JS"
              label="JavaScript health"
              value={siteMetric.javascriptHealth ? `${siteMetric.javascriptHealth.score}/100` : "N/A"}
              detail={`${renderAudits.length}/${siteMetric.technicalHealth.pagesEvaluated} pages rendered`}
            />
            <MetricCard
              icon="◫"
              label="Content stable"
              value={`${stablePages}/${renderAudits.length}`}
              detail={siteMetric.distributions.contentStableMs ? `${Math.round(siteMetric.distributions.contentStableMs.p75)} ms p75` : "No stable timing"}
            />
            <MetricCard
              icon="!"
              label="Browser errors"
              value={String(siteMetric.runtimeErrors)}
              detail={`${pageMetrics.reduce((count, metric) => count + (metric.browser?.httpErrors ?? 0) + (metric.browser?.failedRequests ?? 0), 0)} network errors`}
              tone={siteMetric.runtimeErrors > 0 ? "bad" : "good"}
            />
          </section>
          <section className="two-column dashboard-charts compact-dashboard-charts">
            <article className="panel chart-panel">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">Network transfer</span>
                  <h2>Resources by type</h2>
                </div>
              </div>
              <MetricBarChart
                rows={Object.entries(siteMetric.resourceTypes)
                  .sort(([, a], [, b]) => b.bytes - a.bytes)
                  .slice(0, 8)
                  .map(([label, value]) => ({ label, value: Math.round(value.bytes / 1024) }))}
                ariaLabel="Browser transfer kilobytes by resource type"
              />
            </article>
            <article className="panel chart-panel">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">Page health</span>
                  <h2>Lowest JavaScript scores</h2>
                </div>
              </div>
              <MetricBarChart
                rows={pageMetrics
                  .filter((metric) => metric.javascriptHealth)
                  .sort((a, b) => (a.javascriptHealth?.score ?? 100) - (b.javascriptHealth?.score ?? 100))
                  .slice(0, 8)
                  .map((metric) => ({ label: new URL(metric.url).pathname || "/", value: metric.javascriptHealth?.score ?? 0 }))}
                ariaLabel="Lowest JavaScript Health scores"
                color="#d27732"
              />
            </article>
          </section>
        </>
      ) : null}
      <section className="split-view pages-split">
        <div className="panel table-panel pages-table-shell">
          <table className="pages-table">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers
                    .filter((header) => presetColumns[preset].has(header.column.id))
                    .map((header) => (
                      <th key={header.id} className={header.column.id === "url" ? "url-column" : undefined} style={columnStyle(header.column.id)}>
                        <button type="button" className="sort-header" onClick={header.column.getToggleSortingHandler()}>
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                          <span>{header.column.getIsSorted() === "asc" ? "↑" : header.column.getIsSorted() === "desc" ? "↓" : ""}</span>
                        </button>
                      </th>
                    ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} onClick={() => selectPage(row.original.page.url)} className={currentPage?.id === row.original.page.id ? "selected" : ""}>
                  {row
                    .getAllCells()
                    .filter((cell) => presetColumns[preset].has(cell.column.id))
                    .map((cell) => (
                      <td
                        key={cell.id}
                        onClick={(event) => {
                          if (cell.column.id !== "url" && cell.column.id !== "status") {
                            event.stopPropagation();
                            selectPage(row.original.page.url, cell.column.id);
                          }
                        }}
                        onKeyDown={(event) => {
                          if ((event.key === "Enter" || event.key === " ") && cell.column.id !== "url" && cell.column.id !== "status") {
                            event.preventDefault();
                            selectPage(row.original.page.url, cell.column.id);
                          }
                        }}
                        tabIndex={browserColumns.has(cell.column.id) || cell.column.id === "issues" ? 0 : undefined}
                        className={[
                          cell.column.id === "url" ? "url-column" : "",
                          cell.column.id === "url" || cell.column.id === "status" ? "" : "numeric",
                          browserColumns.has(cell.column.id) || cell.column.id === "issues" ? "clickable-metric" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={columnStyle(cell.column.id)}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 ? (
                <tr className="empty-table-row">
                  <td colSpan={presetColumns[preset].size} className="compact-empty">
                    No internal pages match this URL or title filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <aside className="panel detail-panel page-documentation">
          {current && currentPage && currentMetric ? (
            <>
              <span className="eyebrow">Page evidence</span>
              <h2>{currentPage.title ?? "Untitled page"}</h2>
              <a href={currentPage.url} target="_blank" rel="noreferrer">
                {currentPage.url}
              </a>
              <nav className="detail-tabs" aria-label="Page evidence sections">
                {detailTabs.map((tab) => (
                  <button key={tab.id} type="button" className={detailTab === tab.id ? "active" : ""} onClick={() => setDetailTab(tab.id)}>
                    {tab.label}
                    {tab.id === "issues" ? ` (${current.issues.length})` : tab.id === "errors" ? ` (${errorCount(current)})` : ""}
                  </button>
                ))}
              </nav>
              {detailTab === "overview" ? <OverviewTab page={currentPage} metric={currentMetric} indexability={indexability} /> : null}
              {detailTab === "issues" ? <IssuesTab insight={current} /> : null}
              {detailTab === "network" ? <NetworkTab insight={current} /> : null}
              {detailTab === "javascript" ? <JavaScriptTab insight={current} /> : null}
              {detailTab === "errors" ? <ErrorsTab insight={current} /> : null}
              {detailTab === "links" ? <LinksTab inlinks={inlinks} outlinks={outlinks} /> : null}
            </>
          ) : (
            <div className="empty-detail">Select a URL, issue count, or browser metric to inspect its complete evidence.</div>
          )}
        </aside>
      </section>
    </>
  );
}

function OverviewTab({
  page,
  metric,
  indexability,
}: Readonly<{ page: PageNode; metric: PageMetric; indexability: ReturnType<typeof classifyIndexability> | undefined }>) {
  const headingOccurrences = new Map<string, number>();
  return (
    <div className="detail-tab-content">
      <section>
        <h3>Consolidated health</h3>
        <dl>
          <dt>Technical health</dt>
          <dd>{metric.technicalHealth.score}/100</dd>
          <dt>JavaScript health</dt>
          <dd>{metric.javascriptHealth ? `${metric.javascriptHealth.score}/100` : "Not available"}</dd>
        </dl>
      </section>
      <section>
        <h3>Retrieval and indexability</h3>
        <dl>
          <dt>Status</dt>
          <dd>
            {page.status ?? page.state}
            {page.statusText ? ` ${page.statusText}` : ""}
          </dd>
          <dt>Content type</dt>
          <dd>{page.contentType ?? "—"}</dd>
          <dt>Response time</dt>
          <dd>{formatMilliseconds(page.responseTimeMs)}</dd>
          <dt>Indexability</dt>
          <dd>{indexability?.indexable ? "Indexable candidate" : `Not indexable · ${indexability?.reason}`}</dd>
          <dt>Robots</dt>
          <dd>{page.robots.join(", ") || "No page directives"}</dd>
          <dt>Canonical</dt>
          <dd>{page.canonical ?? "—"}</dd>
        </dl>
      </section>
      <section>
        <h3>Metadata and content</h3>
        <dl>
          <dt>Title</dt>
          <dd>{page.title ?? "Missing"}</dd>
          <dt>Description</dt>
          <dd>{page.description ?? "Missing"}</dd>
          <dt>Words</dt>
          <dd>{page.wordCount ?? "—"}</dd>
          <dt>HTML size</dt>
          <dd>{formatBytes(page.htmlBytes)}</dd>
          <dt>Scripts</dt>
          <dd>{page.scriptCount ?? "—"}</dd>
          <dt>Images</dt>
          <dd>{page.imageCount ?? "—"}</dd>
          <dt>Missing alt</dt>
          <dd>{page.missingAltCount ?? 0}</dd>
        </dl>
      </section>
      <section>
        <h3>Heading outline</h3>
        <div className="heading-outline">
          {page.headings.length ? (
            page.headings.map((heading) => {
              const identity = `${heading.level}:${heading.text}`;
              const occurrence = (headingOccurrences.get(identity) ?? 0) + 1;
              headingOccurrences.set(identity, occurrence);
              return (
                <div key={`${identity}:${occurrence}`} style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}>
                  <b>H{heading.level}</b>
                  <span>{heading.text || "Empty heading"}</span>
                </div>
              );
            })
          ) : (
            <p>No headings observed.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function IssuesTab({ insight }: Readonly<{ insight: PageInsight }>) {
  if (!insight.issues.length) return <div className="compact-empty">No findings are associated with this page.</div>;
  return (
    <section className="detail-tab-content">
      <h3>Issues and source evidence</h3>
      <div className="page-issue-list">
        {insight.issues.map(({ finding, roles, evidenceLevel, locations, pageEvidence }) => (
          <details key={finding.id}>
            <summary>
              <SeverityPill severity={finding.severity} />
              <strong>{finding.title}</strong>
              <small>{evidenceLevel === "exact" ? `${pageEvidence.length} evidence` : "association only"}</small>
            </summary>
            <div className="issue-expanded">
              <p>{finding.summary}</p>
              <h4>Recommended fix</h4>
              <p>{finding.remediation}</p>
              <dl>
                <dt>Rule</dt>
                <dd>
                  {finding.ruleId}@{finding.ruleVersion}
                </dd>
                <dt>Confidence</dt>
                <dd>{finding.confidence}</dd>
                <dt>Relationship</dt>
                <dd>{roles.join(", ")}</dd>
                <dt>Evidence level</dt>
                <dd>{evidenceLevel}</dd>
              </dl>
              <h4>Where to inspect</h4>
              <div className="issue-locations">
                {locations.map((location) => (
                  <a key={`${location.role}:${location.url}`} href={location.url} target="_blank" rel="noreferrer">
                    <span>{location.role}</span>
                    {location.url}
                  </a>
                ))}
              </div>
              <h4>Evidence ({pageEvidence.length})</h4>
              {pageEvidence.length ? (
                <div className="evidence-list">
                  {pageEvidence.map((evidence) =>
                    evidence.kind === "link" ? (
                      <article className="evidence-card" key={JSON.stringify(evidence)}>
                        <span className="evidence-label">Source</span>
                        <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">
                          {evidence.sourceUrl}
                        </a>
                        <span className="evidence-arrow">links to ↓</span>
                        <div className="evidence-target">
                          {evidence.targetStatus !== undefined ? (
                            <span className={`status-code status-${String(evidence.targetStatus)[0]}`}>{evidence.targetStatus}</span>
                          ) : null}
                          <a href={evidence.targetUrl} target="_blank" rel="noreferrer">
                            {evidence.targetUrl}
                          </a>
                        </div>
                        <dl>
                          <dt>Anchor</dt>
                          <dd>{evidence.text || "Empty anchor"}</dd>
                          <dt>Observed as</dt>
                          <dd>{evidence.edgeKind}</dd>
                        </dl>
                      </article>
                    ) : evidence.kind === "browser" ? (
                      <article className="evidence-card" key={JSON.stringify(evidence)}>
                        <span className="evidence-label">Playwright · {evidence.evidenceType}</span>
                        <a href={evidence.pageUrl} target="_blank" rel="noreferrer">
                          {evidence.pageUrl}
                        </a>
                        {evidence.requestUrl ? (
                          <a href={evidence.requestUrl} target="_blank" rel="noreferrer">
                            {evidence.requestUrl}
                          </a>
                        ) : null}
                        <dl>
                          <dt>Field</dt>
                          <dd>{evidence.field}</dd>
                          <dt>Value</dt>
                          <dd>{evidence.value}</dd>
                          {evidence.resourceType ? (
                            <>
                              <dt>Resource type</dt>
                              <dd>{evidence.resourceType}</dd>
                            </>
                          ) : null}
                          {evidence.status !== undefined ? (
                            <>
                              <dt>Status</dt>
                              <dd>{evidence.status}</dd>
                            </>
                          ) : null}
                        </dl>
                      </article>
                    ) : (
                      <article className="evidence-card" key={JSON.stringify(evidence)}>
                        <span className="evidence-label">{evidence.source} page evidence</span>
                        <a href={evidence.url} target="_blank" rel="noreferrer">
                          {evidence.url}
                        </a>
                        <dl>
                          <dt>Field</dt>
                          <dd>{evidence.field ?? "Page"}</dd>
                          <dt>Value</dt>
                          <dd>{evidence.value ?? "Observed"}</dd>
                        </dl>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <p>The rule associates this page through its affected/source URL set; it did not emit field-level evidence.</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function NetworkTab({ insight }: Readonly<{ insight: PageInsight }>) {
  const browser = insight.browser;
  if (!browser) return <NoBrowserEvidence />;
  return (
    <section className="detail-tab-content">
      <h3>Network requests ({browser.resources.length})</h3>
      {browser.resourcesTruncated ? <p>Capture limit reached; the JSON records that this evidence is truncated.</p> : null}
      <ResourceTable resources={browser.resources} />
      <h3>Failed requests ({browser.failedRequests.length})</h3>
      {browser.failedRequests.length ? (
        <div className="evidence-list">
          {browser.failedRequests.map((failure) => (
            <article className="evidence-card" key={JSON.stringify(failure)}>
              <a href={failure.url} target="_blank" rel="noreferrer">
                {failure.url}
              </a>
              <p>{failure.errorText}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>No request failures were captured.</p>
      )}
    </section>
  );
}

function JavaScriptTab({ insight }: Readonly<{ insight: PageInsight }>) {
  const browser = insight.browser;
  const metric = insight.metric.browser;
  if (!browser || !metric) return <NoBrowserEvidence />;
  return (
    <section className="detail-tab-content">
      <h3>JavaScript execution</h3>
      <dl>
        <dt>Health</dt>
        <dd>{insight.metric.javascriptHealth?.score ?? "—"}/100</dd>
        <dt>Content ready</dt>
        <dd>{formatMilliseconds(metric.contentStableMs)}</dd>
        <dt>Total render</dt>
        <dd>{formatMilliseconds(metric.totalRenderMs)}</dd>
        <dt>Script CPU</dt>
        <dd>{formatMilliseconds(metric.scriptCpuMs)}</dd>
        <dt>Main-thread tasks</dt>
        <dd>{formatMilliseconds(metric.taskCpuMs)}</dd>
        <dt>Long tasks</dt>
        <dd>
          {metric.longTaskCount} / {Math.round(metric.longTaskTotalMs)} ms
        </dd>
        <dt>JS transfer</dt>
        <dd>{formatBytes(metric.javascriptBytes)}</dd>
        <dt>Script network</dt>
        <dd>{formatMilliseconds(metric.scriptNetworkDurationMs)}</dd>
      </dl>
      <h3>JavaScript resources ({browser.javascriptResources.length})</h3>
      <ResourceTable resources={browser.javascriptResources} />
    </section>
  );
}

function ErrorsTab({ insight }: Readonly<{ insight: PageInsight }>) {
  const browser = insight.browser;
  if (!browser) return <NoBrowserEvidence />;
  const events = [...browser.consoleEvents].sort((a, b) => errorRank(a.type) - errorRank(b.type) || a.sequence - b.sequence);
  return (
    <section className="detail-tab-content">
      <h3>Console events ({events.length})</h3>
      {browser.consoleEventsTruncated ? <p>Console capture limit reached; this evidence is explicitly marked as truncated.</p> : null}
      <div className="telemetry-table-wrap">
        <table className="detail-data-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Time</th>
              <th>Source</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.sequence} className={`console-${event.type}`}>
                <td>{event.type}</td>
                <td>{Math.round(event.timestampMs)} ms</td>
                <td>
                  {event.location.url ? (
                    <a href={event.location.url} target="_blank" rel="noreferrer">
                      {shortUrl(event.location.url)}:{event.location.lineNumber}:{event.location.columnNumber}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{event.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Uncaught page errors ({browser.pageErrors.length})</h3>
      {browser.pageErrors.length ? (
        <div className="runtime-error-list">
          {browser.pageErrors.map((error) => (
            <pre key={error}>{error}</pre>
          ))}
        </div>
      ) : (
        <p>No uncaught page errors were captured.</p>
      )}
    </section>
  );
}

function LinksTab({ inlinks, outlinks }: Readonly<{ inlinks: Edge[]; outlinks: Edge[] }>) {
  return (
    <section className="detail-tab-content">
      <h3>Incoming links ({inlinks.length})</h3>
      <LinkRows edges={inlinks} direction="incoming" />
      <h3>Outgoing links ({outlinks.length})</h3>
      <LinkRows edges={outlinks} direction="outgoing" />
    </section>
  );
}

function LinkRows({ edges, direction }: Readonly<{ edges: Edge[]; direction: "incoming" | "outgoing" }>) {
  return (
    <div className="link-evidence-table">
      {edges.slice(0, REPORT_PRESENTATION_LIMITS.pageLinkOccurrences).map((edge) => (
        <div key={edge.id}>
          <a href={direction === "incoming" ? edge.sourceUrl : edge.targetUrl} target="_blank" rel="noreferrer">
            {direction === "incoming" ? edge.sourceUrl : edge.targetUrl}
          </a>
          <span>{edge.text || "Empty anchor"}</span>
          <small>{edge.kind}</small>
        </div>
      ))}
    </div>
  );
}

function ResourceTable({ resources }: Readonly<{ resources: NonNullable<PageInsight["browser"]>["resources"] }>) {
  return (
    <div className="telemetry-table-wrap">
      <table className="detail-data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Transfer</th>
            <th>Duration</th>
            <th>URL / failure</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={`${resource.sequence}:${resource.url}`} className={resource.failureText || (resource.status ?? 0) >= 400 ? "resource-error" : undefined}>
              <td>{resource.resourceType}</td>
              <td>{resource.status ?? "—"}</td>
              <td>{formatBytes((resource.sizes?.responseBodyBytes ?? 0) + (resource.sizes?.responseHeaderBytes ?? 0))}</td>
              <td>{formatMilliseconds(resource.durationMs)}</td>
              <td>
                <a href={resource.url} target="_blank" rel="noreferrer">
                  {resource.url}
                </a>
                {resource.failureText ? <small>{resource.failureText}</small> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoBrowserEvidence() {
  return <div className="compact-empty">This page was not rendered by Playwright, so browser evidence is unavailable.</div>;
}
function errorCount(insight: PageInsight) {
  return (insight.browser?.consoleEvents.filter((event) => ["error", "assert"].includes(event.type)).length ?? 0) + (insight.browser?.pageErrors.length ?? 0);
}
function errorRank(type: string) {
  return type === "error" || type === "assert" ? 0 : type === "warning" || type === "warn" ? 1 : 2;
}
function shortUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}`;
  } catch {
    return value;
  }
}
function formatMilliseconds(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value)} ms`;
}
function columnStyle(columnId: string) {
  const width = columnWidths[columnId] ?? 100;
  return { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };
}
