import { createFinding } from "../create-finding.ts";
import { type RuleContext, type RuleDefinition, type RuleMetadata, RuleMetadataSchema } from "../rule.schema.ts";
import { ruleExplanation } from "./rule-explanation.ts";

type SelectedEdge = { edge: RuleContext["edges"][number]; targetStatus?: number };

export function defineEdgeRule(input: {
  metadata: RuleMetadata;
  title: string;
  summary: string;
  remediation: string;
  tags: string[];
  select(context: RuleContext): SelectedEdge[];
  affected(item: SelectedEdge): string;
}): RuleDefinition {
  const metadata = RuleMetadataSchema.parse(input.metadata);
  return {
    metadata,
    explanation: ruleExplanation(
      metadata,
      input.title,
      input.summary,
      input.remediation,
      ["Observed edge occurrence with source, target, anchor text, relationship and target status."],
      input.tags,
    ),
    evaluate(context) {
      const selected = input.select(context);
      if (selected.length === 0) return [];
      return [
        createFinding(metadata, {
          title: input.title,
          summary: input.summary,
          remediation: input.remediation,
          affectedUrls: selected.map(input.affected),
          evidence: selected.map(({ edge, targetStatus }) => ({
            kind: "link",
            edgeId: edge.id,
            edgeKind: edge.kind,
            sourceUrl: edge.sourceUrl,
            targetUrl: edge.targetUrl,
            ...(targetStatus !== undefined ? { targetStatus } : {}),
            ...(edge.text !== undefined ? { text: edge.text } : {}),
            rel: edge.rel,
            sequence: edge.sequence,
          })),
        }),
      ];
    },
  };
}
