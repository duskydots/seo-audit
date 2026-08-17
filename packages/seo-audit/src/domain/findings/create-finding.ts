import { stableId } from "../../shared/ids.ts";
import type { Finding, FindingEvidence } from "./finding.schema.ts";
import type { RuleMetadata } from "./rule.schema.ts";

export type FindingInput = Omit<
  Finding,
  "schemaVersion" | "id" | "ruleId" | "ruleVersion" | "findingType" | "category" | "severity" | "confidence" | "count" | "sourceUrls" | "evidence"
> & {
  sourceUrls?: string[];
  evidence?: FindingEvidence[];
};

export function createFinding(metadata: RuleMetadata, input: FindingInput): Finding {
  const affectedUrls = [...new Set(input.affectedUrls)].sort();
  const evidence = input.evidence ?? affectedUrls.map((url): FindingEvidence => ({ kind: "page", url, source: "derived" }));
  const evidenceSourceUrls = evidence.flatMap((item) => (item.kind === "link" ? [item.sourceUrl] : []));
  const sourceUrls = [...new Set([...(input.sourceUrls ?? []), ...evidenceSourceUrls])].sort();
  return {
    schemaVersion: 1,
    id: stableId("finding", `${metadata.id}|${affectedUrls.join("|")}`),
    ruleId: metadata.id,
    ruleVersion: metadata.version,
    findingType: metadata.findingType,
    category: metadata.category,
    severity: metadata.defaultSeverity,
    confidence: metadata.confidence,
    ...input,
    affectedUrls,
    sourceUrls,
    evidence,
    count: affectedUrls.length,
  };
}
