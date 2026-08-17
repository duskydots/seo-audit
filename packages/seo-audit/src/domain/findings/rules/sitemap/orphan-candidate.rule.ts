import { createFinding } from "../../create-finding.ts";
import { type RuleDefinition, RuleMetadataSchema } from "../../rule.schema.ts";
import { ruleExplanation } from "../rule-explanation.ts";

const sitemapOrphanMetadata = RuleMetadataSchema.parse({
  id: "sitemap.orphan_candidate",
  version: "1.0.0",
  category: "sitemap",
  defaultSeverity: "medium",
  findingType: "warning",
  confidence: "strong",
  requires: ["page-summary", "graph"],
  description: "Sitemap pages with no observed internal anchor target.",
});

export const sitemapOrphans: RuleDefinition = {
  metadata: sitemapOrphanMetadata,
  explanation: ruleExplanation(
    sitemapOrphanMetadata,
    "Sitemap-only orphan candidates",
    "A URL declared in a sitemap but absent from internal anchors may be difficult for users and crawlers to discover through the site structure.",
    "Add useful internal links or remove URLs that should not be discoverable/indexable.",
    ["Sitemap discovery provenance and absence from observed internal anchor targets."],
    ["sitemap", "links", "crawlability"],
  ),
  evaluate(context) {
    const anchorTargets = new Set(context.edges.filter((edge) => edge.kind === "anchor" && edge.internal).map((edge) => edge.targetUrl));
    const affectedUrls = context.pages
      .filter((page) => page.internal && page.discoveredVia.includes("sitemap") && !page.discoveredVia.includes("seed") && !anchorTargets.has(page.url))
      .map((page) => page.url);
    return affectedUrls.length === 0
      ? []
      : [
          createFinding(sitemapOrphanMetadata, {
            title: "Sitemap-only orphan candidates",
            summary: "Sitemap URLs were not found through internal HTML anchor links.",
            remediation: "Add useful internal links or remove URLs that should not be discoverable/indexable.",
            affectedUrls,
            sourceUrls: [],
            evidence: affectedUrls.map((url) => ({
              kind: "page",
              url,
              source: "derived",
              field: "discovery",
              value: "sitemap-only; no internal anchor target",
            })),
          }),
        ];
  },
};
