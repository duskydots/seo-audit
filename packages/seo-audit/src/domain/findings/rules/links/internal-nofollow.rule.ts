import { defineEdgeRule } from "../define-edge-rule.ts";

export const internalNofollowLinks = defineEdgeRule({
  metadata: {
    id: "links.internal_nofollow",
    version: "1.0.0",
    category: "links",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "confirmed",
    requires: ["graph"],
    description: "Internal anchor links carrying a nofollow relationship.",
  },
  title: "Nofollow internal links",
  summary: "Internal links use nofollow, which may be intentional but can conflict with the site's desired discovery and linking signals.",
  remediation: "Remove nofollow from ordinary navigational links; retain it only where the relationship is intentional.",
  tags: ["links", "nofollow", "crawlability"],
  select: (context) =>
    context.edges.filter((edge) => (edge.kind === "anchor" || edge.kind === "rendered-anchor") && edge.internal && edge.nofollow).map((edge) => ({ edge })),
  affected: ({ edge }) => edge.sourceUrl,
});
