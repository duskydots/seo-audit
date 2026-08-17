import { createFinding } from "../create-finding.ts";
import type { FindingEvidence } from "../finding.schema.ts";
import { type RuleContext, type RuleDefinition, RuleExplanationSchema, type RuleMetadata, RuleMetadataSchema } from "../rule.schema.ts";

export function defineRenderRule(
  metadataInput: RuleMetadata,
  predicate: (audit: RuleContext["renderAudits"][number]) => boolean,
  copy: {
    title: string;
    summary: string;
    remediation: string;
    evidenceDescription: string;
    evidence(audit: RuleContext["renderAudits"][number]): FindingEvidence[];
    tags?: string[];
  },
): RuleDefinition {
  const metadata = RuleMetadataSchema.parse(metadataInput);
  return {
    metadata,
    explanation: RuleExplanationSchema.parse({
      title: copy.title,
      whyItMatters: copy.summary,
      trigger: metadata.description,
      remediation: copy.remediation,
      evidence: [copy.evidenceDescription],
      tags: copy.tags ?? ["javascript", "rendering"],
    }),
    evaluate(context) {
      const affected = context.renderAudits.filter(predicate);
      const affectedUrls = affected.map((audit) => audit.pageUrl);
      return affectedUrls.length === 0
        ? []
        : [
            createFinding(metadata, {
              title: copy.title,
              summary: copy.summary,
              remediation: copy.remediation,
              affectedUrls,
              sourceUrls: [],
              evidence: affected.flatMap(copy.evidence),
            }),
          ];
    },
  };
}
