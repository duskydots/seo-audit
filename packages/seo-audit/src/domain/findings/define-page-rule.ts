import type { PageNode } from "../graph/page-node.schema.ts";
import { createFinding } from "./create-finding.ts";
import type { FindingEvidence } from "./finding.schema.ts";
import { type RuleDefinition, RuleExplanationSchema, type RuleMetadata, RuleMetadataSchema } from "./rule.schema.ts";

export function definePageRule(input: {
  metadata: RuleMetadata;
  select(context: Parameters<RuleDefinition["evaluate"]>[0]): readonly PageNode[];
  predicate(page: PageNode): boolean;
  title: string;
  summary: string;
  remediation: string;
  trigger?: string;
  evidenceDescription?: string;
  tags?: string[];
  evidence?(page: PageNode): FindingEvidence[];
}): RuleDefinition {
  const metadata = RuleMetadataSchema.parse(input.metadata);
  return {
    metadata,
    explanation: RuleExplanationSchema.parse({
      title: input.title,
      whyItMatters: input.summary,
      trigger: input.trigger ?? metadata.description,
      remediation: input.remediation,
      evidence: [input.evidenceDescription ?? "Affected URL association derived from the validated page observation."],
      tags: input.tags ?? [metadata.category],
    }),
    evaluate(context) {
      const affectedPages = input.select(context).filter(input.predicate);
      const affectedUrls = affectedPages.map((page) => page.url);
      if (affectedUrls.length === 0) return [];
      const evidence = input.evidence ? affectedPages.flatMap(input.evidence) : undefined;
      return [
        createFinding(metadata, {
          title: input.title,
          summary: input.summary,
          remediation: input.remediation,
          affectedUrls,
          sourceUrls: [],
          ...(evidence ? { evidence } : {}),
        }),
      ];
    },
  };
}
