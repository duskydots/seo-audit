import { groupLinkEvidence, REPORT_PRESENTATION_LIMITS, resolveLinkEvidence } from "@duskydots/seo-audit/reporting";
import { useMemo, useState } from "react";
import { useAudit } from "../audit-data.tsx";
import { SeverityPill } from "../components/severity-pill.tsx";

export function IssuesPage() {
  const { findings, pages, edges, pageInsights, ruleCatalog } = useAudit();
  const [selectedId, setSelectedId] = useState(findings[0]?.id ?? "");
  const selected = useMemo(() => findings.find((item) => item.id === selectedId) ?? findings[0], [findings, selectedId]);
  const selectedRule = useMemo(() => ruleCatalog.find((entry) => entry.metadata.id === selected?.ruleId), [ruleCatalog, selected]);
  const evidence = useMemo(() => (selected ? resolveLinkEvidence(selected, pages, edges) : []), [selected, pages, edges]);
  const evidenceGroups = useMemo(() => groupLinkEvidence(evidence), [evidence]);
  const sourceCount = new Set(evidence.map((item) => item.sourceUrl)).size;
  const selectedInsights = useMemo(
    () => pageInsights.flatMap((page) => page.issues.filter((issue) => issue.finding.id === selected?.id)),
    [pageInsights, selected],
  );
  const locations = useMemo(() => {
    const values = new Map<string, (typeof selectedInsights)[number]["locations"][number]>();
    for (const insight of selectedInsights) for (const location of insight.locations) values.set(`${location.role}:${location.url}`, location);
    return [...values.values()].sort((left, right) => left.url.localeCompare(right.url) || left.role.localeCompare(right.role));
  }, [selectedInsights]);
  const pageEvidence = selected?.evidence.filter((item) => item.kind === "page") ?? [];
  const browserEvidence = selected?.evidence.filter((item) => item.kind === "browser") ?? [];
  const exactEvidence = evidence.length + pageEvidence.length + browserEvidence.length;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Audit findings</span>
          <h1>Issues</h1>
          <p>Confirmed issues, contextual warnings, and opportunities with the exact pages, link targets, evidence and remediation.</p>
        </div>
      </header>
      <section className="split-view issues-split">
        <div className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Finding</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Evidence</th>
                <th>URLs</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((item) => (
                <tr key={item.id} onClick={() => setSelectedId(item.id)} className={selected?.id === item.id ? "selected" : ""}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>
                      {item.category} · {item.ruleId}@{item.ruleVersion}
                    </small>
                  </td>
                  <td>
                    <span className={`finding-type finding-type-${item.findingType}`}>{item.findingType}</span>
                  </td>
                  <td>
                    <SeverityPill severity={item.severity} />
                  </td>
                  <td className="numeric">{item.evidence.length > 0 ? item.evidence.length : "URL"}</td>
                  <td className="numeric">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected ? (
          <aside className="panel detail-panel issue-detail">
            <div className="finding-labels">
              <span className={`finding-type finding-type-${selected.findingType}`}>{selected.findingType}</span>
              <SeverityPill severity={selected.severity} />
            </div>
            <h2>{selected.title}</h2>
            <p>{selectedRule?.explanation.whyItMatters ?? selected.summary}</p>
            {selectedRule ? (
              <>
                <h3>Exact trigger</h3>
                <p>{selectedRule.explanation.trigger}</p>
                <h3>Evidence this rule collects</h3>
                <ul className="rule-evidence-description">
                  {selectedRule.explanation.evidence.map((description) => (
                    <li key={description}>{description}</li>
                  ))}
                </ul>
                <div className="rule-tags">
                  {selectedRule.explanation.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </>
            ) : null}
            <h3>Recommended fix</h3>
            <p>{selectedRule?.explanation.remediation ?? selected.remediation}</p>
            <h3>Rule</h3>
            <p>
              <code>
                {selected.ruleId}@{selected.ruleVersion}
              </code>{" "}
              · {selected.confidence} confidence
            </p>
            <h3>Evidence at a glance</h3>
            <div className={`evidence-confidence ${exactEvidence > 0 ? "exact" : "association"}`}>
              <strong>{exactEvidence > 0 ? `${exactEvidence} exact evidence record${exactEvidence === 1 ? "" : "s"}` : "Association-only evidence"}</strong>
              <span>
                {exactEvidence > 0
                  ? "The crawler retained the observed field or link occurrence."
                  : "The rule identified involved URLs but did not emit field-level proof."}
              </span>
            </div>
            <h3>Where to inspect</h3>
            <div className="issue-locations">
              {locations.map((location) => (
                <a key={`${location.role}:${location.url}`} href={location.url} target="_blank" rel="noreferrer">
                  <span>{location.role}</span>
                  {location.url}
                </a>
              ))}
            </div>
            {pageEvidence.length > 0 ? (
              <>
                <h3>Observed page evidence</h3>
                <div className="evidence-list">
                  {pageEvidence.map((item) => (
                    <article key={JSON.stringify(item)} className="evidence-card">
                      <span className="evidence-label">{item.source} observation</span>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.url}
                      </a>
                      <dl>
                        <dt>Field</dt>
                        <dd>{item.field ?? "Page"}</dd>
                        <dt>Observed value</dt>
                        <dd>{item.value ?? "Observed"}</dd>
                      </dl>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {browserEvidence.length > 0 ? (
              <>
                <h3>Observed browser evidence</h3>
                <div className="evidence-list">
                  {browserEvidence.map((item) => (
                    <article key={JSON.stringify(item)} className="evidence-card">
                      <span className="evidence-label">Playwright · {item.evidenceType}</span>
                      <a href={item.pageUrl} target="_blank" rel="noreferrer">
                        {item.pageUrl}
                      </a>
                      {item.requestUrl ? (
                        <a href={item.requestUrl} target="_blank" rel="noreferrer">
                          {item.requestUrl}
                        </a>
                      ) : null}
                      <dl>
                        <dt>Field</dt>
                        <dd>{item.field}</dd>
                        <dt>Observed value</dt>
                        <dd>{item.value}</dd>
                        {item.resourceType ? (
                          <>
                            <dt>Resource type</dt>
                            <dd>{item.resourceType}</dd>
                          </>
                        ) : null}
                        {item.status !== undefined ? (
                          <>
                            <dt>Status</dt>
                            <dd>{item.status}</dd>
                          </>
                        ) : null}
                      </dl>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {evidence.length > 0 ? (
              <>
                <h3>Observed link evidence</h3>
                <p>
                  {evidence.length} link occurrence{evidence.length === 1 ? "" : "s"} across {sourceCount} source page{sourceCount === 1 ? "" : "s"}. Repeated
                  identical placements are grouped without discarding their edge records.
                </p>
                <div className="evidence-list">
                  {evidenceGroups.slice(0, REPORT_PRESENTATION_LIMITS.issueEvidenceGroups).map(({ evidence: item, occurrences }) => (
                    <article key={item.edgeId} className="evidence-card">
                      <span className="evidence-label">Source page</span>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        {item.sourceUrl}
                      </a>
                      <span className="evidence-arrow">↓ linked to</span>
                      <div className="evidence-target">
                        <span className={`status-code status-${String(item.targetStatus ?? 0)[0]}`}>{item.targetStatus ?? "unchecked"}</span>
                        <a href={item.targetUrl} target="_blank" rel="noreferrer">
                          {item.targetUrl}
                        </a>
                      </div>
                      <dl>
                        <dt>Anchor text</dt>
                        <dd>{item.text || "Empty anchor"}</dd>
                        <dt>Observed as</dt>
                        <dd>
                          {item.edgeKind}
                          {item.rel.length > 0 ? ` · rel=${item.rel.join(" ")}` : ""}
                        </dd>
                        <dt>Occurrences</dt>
                        <dd>{occurrences}</dd>
                      </dl>
                    </article>
                  ))}
                </div>
                {evidenceGroups.length > REPORT_PRESENTATION_LIMITS.issueEvidenceGroups && (
                  <p>
                    Showing the first {REPORT_PRESENTATION_LIMITS.issueEvidenceGroups} of {evidenceGroups.length} grouped placements. The complete per-edge
                    evidence remains in <code>findings.json</code>.
                  </p>
                )}
              </>
            ) : (
              <>
                <h3>Affected pages</h3>
                <div className="url-stack">
                  {selected.affectedUrls.slice(0, REPORT_PRESENTATION_LIMITS.issueEvidenceGroups).map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  ))}
                </div>
              </>
            )}
          </aside>
        ) : (
          <aside className="panel detail-panel">No findings.</aside>
        )}
      </section>
    </>
  );
}
