import { groupLinkEvidence, resolveLinkEvidence } from "../findings/resolve-link-evidence.ts";
import type { AuditBundle } from "./audit.schema.ts";
import { markdownValue } from "./markdown-escape.ts";
import { REPORT_PRESENTATION_LIMITS } from "./presentation-limits.ts";

export function renderFindingsMarkdown(bundle: AuditBundle, findingIds?: ReadonlySet<string>): string[] {
  const findings = findingIds ? bundle.findings.filter((finding) => findingIds.has(finding.id)) : bundle.findings;
  const lines = [
    "## Issues and findings",
    "",
    "Every finding includes its rule identity, severity, confidence, affected pages, remediation, and available evidence. Link evidence preserves source → target relationships.",
    "",
  ];
  if (findings.length === 0) return [...lines, "No findings were produced by the enabled rules.", ""];

  for (const [index, finding] of findings.entries()) {
    const linkEvidence = resolveLinkEvidence(finding, bundle.pages, bundle.edges);
    const pageEvidence = finding.evidence.filter((evidence) => evidence.kind === "page");
    const browserEvidence = finding.evidence.filter((evidence) => evidence.kind === "browser");
    const groups = groupLinkEvidence(linkEvidence);
    const rule = bundle.ruleCatalog.find((entry) => entry.metadata.id === finding.ruleId);
    lines.push(
      `### Finding ${index + 1}: ${finding.title}`,
      "",
      "| Field | Value |",
      "|---|---|",
      `| Rule | ${markdownValue(`${finding.ruleId}@${finding.ruleVersion}`)} |`,
      `| Category | ${finding.category} |`,
      `| Type | ${finding.findingType} |`,
      `| Severity | ${finding.severity} |`,
      `| Confidence | ${finding.confidence} |`,
      `| Affected URLs | ${finding.count} |`,
      `| Link occurrences | ${linkEvidence.length} |`,
      `| Source pages | ${new Set(linkEvidence.map((evidence) => evidence.sourceUrl)).size || finding.sourceUrls.length} |`,
      "",
      finding.summary,
      "",
      ...(rule
        ? [
            `**Why it matters:** ${markdownValue(rule.explanation.whyItMatters)}`,
            "",
            `**Exact trigger:** ${markdownValue(rule.explanation.trigger)}`,
            "",
            `**Evidence collected:** ${markdownValue(rule.explanation.evidence.join("; "))}`,
            "",
          ]
        : []),
      `**Recommended fix:** ${finding.remediation}`,
      "",
    );
    if (pageEvidence.length > 0) {
      lines.push(
        "#### Observed page evidence",
        "",
        "| Page | Representation | Field | Observed value |",
        "|---|---|---|---|",
        ...pageEvidence
          .slice(0, REPORT_PRESENTATION_LIMITS.issueEvidenceGroups)
          .map(
            (evidence) =>
              `| ${markdownValue(evidence.url)} | ${evidence.source} | ${markdownValue(evidence.field ?? "Page")} | ${markdownValue(evidence.value ?? "Observed")} |`,
          ),
        ...(pageEvidence.length > REPORT_PRESENTATION_LIMITS.issueEvidenceGroups
          ? [`| …${pageEvidence.length - REPORT_PRESENTATION_LIMITS.issueEvidenceGroups} additional records; see evidence/findings.json/jsonl | | | |`]
          : []),
        "",
      );
    }
    if (browserEvidence.length > 0) {
      lines.push(
        "#### Observed browser evidence",
        "",
        "| Page | Evidence type | Field | Value | Request URL | Resource | Status |",
        "|---|---|---|---|---|---|---:|",
        ...browserEvidence
          .slice(0, REPORT_PRESENTATION_LIMITS.issueEvidenceGroups)
          .map(
            (evidence) =>
              `| ${markdownValue(evidence.pageUrl)} | ${evidence.evidenceType} | ${markdownValue(evidence.field)} | ${markdownValue(evidence.value)} | ${markdownValue(evidence.requestUrl)} | ${markdownValue(evidence.resourceType)} | ${markdownValue(evidence.status)} |`,
          ),
        ...(browserEvidence.length > REPORT_PRESENTATION_LIMITS.issueEvidenceGroups
          ? [`| …${browserEvidence.length - REPORT_PRESENTATION_LIMITS.issueEvidenceGroups} additional records; see evidence/findings.json/jsonl | | | | | | |`]
          : []),
        "",
      );
    }
    if (groups.length > 0) {
      lines.push(
        "#### Observed link evidence",
        "",
        "| Source page | Target | Status | Anchor text | Edge kind | Rel | Occurrences |",
        "|---|---|---:|---|---|---|---:|",
        ...groups
          .slice(0, REPORT_PRESENTATION_LIMITS.issueEvidenceGroups)
          .map(
            ({ evidence, occurrences }) =>
              `| ${markdownValue(evidence.sourceUrl)} | ${markdownValue(evidence.targetUrl)} | ${markdownValue(evidence.targetStatus)} | ${markdownValue(evidence.text)} | ${evidence.edgeKind} | ${markdownValue(evidence.rel.join(" "))} | ${occurrences} |`,
          ),
        ...(groups.length > REPORT_PRESENTATION_LIMITS.issueEvidenceGroups
          ? [
              `| …${groups.length - REPORT_PRESENTATION_LIMITS.issueEvidenceGroups} additional grouped placements; see evidence/findings.json/jsonl for uncapped evidence | | | | | | |`,
            ]
          : []),
        "",
      );
    } else {
      lines.push(
        "#### Affected pages",
        "",
        ...finding.affectedUrls.slice(0, REPORT_PRESENTATION_LIMITS.issueEvidenceGroups).map((url) => `- ${url}`),
        ...(finding.affectedUrls.length > REPORT_PRESENTATION_LIMITS.issueEvidenceGroups
          ? [`- …${finding.affectedUrls.length - REPORT_PRESENTATION_LIMITS.issueEvidenceGroups} additional URLs; see evidence/findings.json/jsonl.`]
          : []),
        "",
      );
    }
  }
  return lines;
}
