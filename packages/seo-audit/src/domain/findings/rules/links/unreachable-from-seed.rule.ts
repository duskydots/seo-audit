import { createFinding } from "../../create-finding.ts";
import { type RuleDefinition, RuleMetadataSchema } from "../../rule.schema.ts";
import { ruleExplanation } from "../rule-explanation.ts";

const disconnectedMetadata = RuleMetadataSchema.parse({
  id: "links.unreachable_from_seed",
  version: "1.0.0",
  category: "links",
  defaultSeverity: "medium",
  findingType: "warning",
  confidence: "strong",
  requires: ["page-summary", "graph"],
  description: "Successful sitemap pages outside the seed-connected anchor graph.",
});

export const disconnected: RuleDefinition = {
  metadata: disconnectedMetadata,
  explanation: ruleExplanation(
    disconnectedMetadata,
    "Pages outside the seed-connected graph",
    "Successful pages that cannot be reached through internal anchors sit outside the observable navigation graph.",
    "Add crawlable internal links from the main site structure, or remove URLs that should not be discoverable and indexable.",
    ["Sitemap discovery provenance and missing navigation depth in the frozen anchor graph."],
    ["links", "sitemap", "crawlability"],
  ),
  evaluate(context) {
    const affectedUrls = context.pages
      .filter(
        (page) =>
          page.internal &&
          page.discoveredVia.includes("sitemap") &&
          page.navigationDepth === undefined &&
          (page.status ?? 0) >= 200 &&
          (page.status ?? 0) < 300,
      )
      .map((page) => page.url);
    return affectedUrls.length === 0
      ? []
      : [
          createFinding(disconnectedMetadata, {
            title: "Pages outside the seed-connected graph",
            summary: "Successful sitemap pages are not reachable from the seed through observed internal HTML anchors.",
            remediation: "Add crawlable internal links from the main site structure, or remove URLs that should not be discoverable and indexable.",
            affectedUrls,
            sourceUrls: [],
            evidence: affectedUrls.map((url) => ({ kind: "page", url, source: "derived", field: "navigationDepth", value: "unreachable from seed anchors" })),
          }),
        ];
  },
};
