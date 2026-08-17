import type { Edge } from "../graph/edge.schema.ts";
import type { PageNode } from "../graph/page-node.schema.ts";
import type { Finding, FindingEvidence } from "./finding.schema.ts";

export type LinkFindingEvidence = Extract<FindingEvidence, { kind: "link" }>;

export interface LinkEvidenceGroup {
  evidence: LinkFindingEvidence;
  occurrences: number;
}

/** Resolves typed link evidence and reconstructs it from graph edges for legacy audit files. */
export function resolveLinkEvidence(finding: Finding, pages: readonly PageNode[], edges: readonly Edge[]): LinkFindingEvidence[] {
  const explicit = finding.evidence.filter((item): item is LinkFindingEvidence => item.kind === "link");
  if (explicit.length > 0) return [...explicit].sort((left, right) => left.sequence - right.sequence);
  if (finding.evidence.length > 0) return [];

  const statusByUrl = new Map(pages.map((page) => [page.url, page.status]));
  const affected = new Set(finding.affectedUrls);
  const sources = new Set(finding.sourceUrls);
  return edges
    .filter(
      (edge) =>
        (edge.kind === "anchor" || edge.kind === "rendered-anchor") && affected.has(edge.targetUrl) && (sources.size === 0 || sources.has(edge.sourceUrl)),
    )
    .map(
      (edge): LinkFindingEvidence => ({
        kind: "link",
        edgeId: edge.id,
        edgeKind: edge.kind,
        sourceUrl: edge.sourceUrl,
        targetUrl: edge.targetUrl,
        ...(statusByUrl.get(edge.targetUrl) !== undefined ? { targetStatus: statusByUrl.get(edge.targetUrl) } : {}),
        ...(edge.text !== undefined ? { text: edge.text } : {}),
        rel: edge.rel,
        sequence: edge.sequence,
      }),
    )
    .sort((left, right) => left.sequence - right.sequence);
}

/** Groups repeated DOM occurrences without losing the canonical per-edge evidence records. */
export function groupLinkEvidence(evidence: readonly LinkFindingEvidence[]): LinkEvidenceGroup[] {
  const groups = new Map<string, LinkEvidenceGroup>();
  for (const item of evidence) {
    const key = JSON.stringify([item.sourceUrl, item.targetUrl, item.targetStatus, item.text, item.edgeKind, item.rel]);
    const existing = groups.get(key);
    if (existing) {
      existing.occurrences += 1;
      continue;
    }
    groups.set(key, { evidence: item, occurrences: 1 });
  }
  return [...groups.values()].sort((left, right) => left.evidence.sequence - right.evidence.sequence);
}
