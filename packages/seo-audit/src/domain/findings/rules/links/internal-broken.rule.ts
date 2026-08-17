import { createFinding } from "../../create-finding.ts";
import { type RuleDefinition, RuleMetadataSchema } from "../../rule.schema.ts";
import { ruleExplanation } from "../rule-explanation.ts";

const brokenLinksMetadata = RuleMetadataSchema.parse({
  id: "links.internal_broken",
  version: "1.0.0",
  category: "links",
  defaultSeverity: "high",
  findingType: "issue",
  confidence: "confirmed",
  requires: ["page-summary", "graph"],
  description: "Internal anchor links targeting confirmed errors.",
});

export const brokenLinks: RuleDefinition = {
  metadata: brokenLinksMetadata,
  explanation: ruleExplanation(
    brokenLinksMetadata,
    "Broken internal links",
    "Internal links to confirmed error responses waste crawl paths and send users to unavailable destinations.",
    "Update each source link to a working relevant destination or restore the target.",
    ["Every observed anchor edge with source URL, target URL, anchor text, rel attributes, sequence and confirmed target status."],
    ["links", "response", "crawlability"],
  ),
  evaluate(context) {
    const nodeByUrl = new Map(context.pages.map((page) => [page.url, page]));
    const broken = context.edges.filter(
      (edge) => (edge.kind === "anchor" || edge.kind === "rendered-anchor") && edge.internal && (nodeByUrl.get(edge.targetUrl)?.status ?? 0) >= 400,
    );
    return broken.length === 0
      ? []
      : [
          createFinding(brokenLinksMetadata, {
            title: "Broken internal links",
            summary: "Internal anchor links point to URLs returning confirmed errors.",
            remediation: "Update each source link to a working relevant destination or restore the target.",
            affectedUrls: broken.map((edge) => edge.targetUrl),
            evidence: broken.map((edge) => ({
              kind: "link",
              edgeId: edge.id,
              edgeKind: edge.kind,
              sourceUrl: edge.sourceUrl,
              targetUrl: edge.targetUrl,
              targetStatus: nodeByUrl.get(edge.targetUrl)?.status,
              ...(edge.text !== undefined ? { text: edge.text } : {}),
              rel: edge.rel,
              sequence: edge.sequence,
            })),
          }),
        ];
  },
};
