import { defineEdgeRule } from "../define-edge-rule.ts";

export const redirectingCanonicals = defineEdgeRule({
  metadata: {
    id: "indexability.canonical_redirect",
    version: "1.0.0",
    category: "indexability",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary", "graph"],
    description: "Canonical declarations targeting redirecting URLs.",
  },
  title: "Canonicals point to redirects",
  summary: "Pages declare canonical targets that redirect rather than resolving directly to successful content.",
  remediation: "Update canonical declarations to the final successful preferred URL.",
  tags: ["indexability", "canonical", "redirects"],
  select(context) {
    const nodes = new Map(context.pages.map((page) => [page.url, page]));
    return context.edges.flatMap((edge) => {
      const status = nodes.get(edge.targetUrl)?.status;
      return edge.kind === "canonical" && status !== undefined && status >= 300 && status < 400 ? [{ edge, targetStatus: status }] : [];
    });
  },
  affected: ({ edge }) => edge.sourceUrl,
});
