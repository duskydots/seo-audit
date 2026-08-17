import { defineEdgeRule } from "../define-edge-rule.ts";

export const brokenCanonicals = defineEdgeRule({
  metadata: {
    id: "indexability.canonical_broken",
    version: "1.0.0",
    category: "indexability",
    defaultSeverity: "high",
    findingType: "issue",
    confidence: "confirmed",
    requires: ["page-summary", "graph"],
    description: "Canonical declarations targeting confirmed error responses.",
  },
  title: "Canonicals point to broken URLs",
  summary: "Pages declare canonical targets that return confirmed HTTP errors.",
  remediation: "Change the canonical to a successful preferred URL or restore the declared target.",
  tags: ["indexability", "canonical", "response"],
  select(context) {
    const nodes = new Map(context.pages.map((page) => [page.url, page]));
    return context.edges.flatMap((edge) => {
      const status = nodes.get(edge.targetUrl)?.status;
      return edge.kind === "canonical" && status !== undefined && status >= 400 ? [{ edge, targetStatus: status }] : [];
    });
  },
  affected: ({ edge }) => edge.sourceUrl,
});
