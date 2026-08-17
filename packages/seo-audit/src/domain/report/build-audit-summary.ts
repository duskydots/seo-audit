import type { Finding } from "../findings/finding.schema.ts";
import type { PageNode } from "../graph/page-node.schema.ts";
import { classifyIndexability } from "../indexability/classify-indexability.ts";
import type { AuditSummary } from "./audit.schema.ts";

export function buildAuditSummary(
  site: string,
  started: Date,
  completed: Date,
  status: AuditSummary["status"],
  pages: PageNode[],
  findings: Finding[],
): AuditSummary {
  const crawled = pages.filter((page) => page.status !== undefined || page.state === "blocked" || page.state === "failed");
  const internal = pages.filter((page) => page.internal);
  const external = pages.filter((page) => !page.internal);
  const indexable = internal.filter((page) => classifyIndexability(page).indexable).length;
  const responseCodes: Record<string, number> = {};
  for (const page of crawled) {
    const key = page.status === undefined ? page.state : String(page.status);
    responseCodes[key] = (responseCodes[key] ?? 0) + 1;
  }
  const issueCounts: Record<string, number> = {};
  for (const item of findings) issueCounts[item.severity] = (issueCounts[item.severity] ?? 0) + item.count;
  return {
    schemaVersion: 1,
    site,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMs: completed.getTime() - started.getTime(),
    status,
    totals: {
      discovered: pages.length,
      crawled: crawled.length,
      internal: internal.length,
      external: external.length,
      html: pages.filter((page) => page.contentType?.includes("html")).length,
      indexable,
      nonIndexable: internal.length - indexable,
      blocked: pages.filter((page) => page.state === "blocked").length,
      errors4xx: pages.filter((page) => (page.status ?? 0) >= 400 && (page.status ?? 0) < 500).length,
      errors5xx: pages.filter((page) => (page.status ?? 0) >= 500).length,
      redirects: pages.filter((page) => page.redirectChain.length > 0).length,
      issues: findings.reduce((sum, item) => sum + item.count, 0),
    },
    responseCodes,
    issueCounts,
  };
}
