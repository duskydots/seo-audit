import { defineEdgeRule } from "../define-edge-rule.ts";

export const internalRedirectLinks = defineEdgeRule({
  metadata: {
    id: "links.internal_redirect",
    version: "1.0.0",
    category: "links",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary", "graph"],
    description: "Internal anchor links targeting redirecting URLs.",
  },
  title: "Internal links to redirects",
  summary: "Internal anchors point to redirecting URLs instead of their final destinations.",
  remediation: "Update each source anchor to the final preferred URL unless the redirect is intentionally part of the user journey.",
  tags: ["links", "redirects", "crawlability"],
  select(context) {
    const nodes = new Map(context.pages.map((page) => [page.url, page]));
    return context.edges.flatMap((edge) => {
      const status = nodes.get(edge.targetUrl)?.status;
      return (edge.kind === "anchor" || edge.kind === "rendered-anchor") && edge.internal && status !== undefined && status >= 300 && status < 400
        ? [{ edge, targetStatus: status }]
        : [];
    });
  },
  affected: ({ edge }) => edge.sourceUrl,
});
