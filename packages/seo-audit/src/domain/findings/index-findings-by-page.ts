import type { Edge } from "../graph/edge.schema.ts";
import type { PageNode } from "../graph/page-node.schema.ts";
import type { Finding } from "./finding.schema.ts";
import { resolveLinkEvidence } from "./resolve-link-evidence.ts";

export function indexFindingsByPage(findings: readonly Finding[], pages: readonly PageNode[], edges: readonly Edge[]): ReadonlyMap<string, Finding[]> {
  const byUrl = new Map<string, Finding[]>();
  for (const finding of findings) {
    const urls = new Set([...finding.affectedUrls, ...finding.sourceUrls]);
    for (const evidence of resolveLinkEvidence(finding, pages, edges)) {
      urls.add(evidence.sourceUrl);
      urls.add(evidence.targetUrl);
    }
    for (const url of urls) {
      const pageFindings = byUrl.get(url) ?? [];
      pageFindings.push(finding);
      byUrl.set(url, pageFindings);
    }
  }
  return byUrl;
}
