import { createFinding } from "../../create-finding.ts";
import { type RuleDefinition, RuleMetadataSchema } from "../../rule.schema.ts";
import { pageEvidence } from "../page-evidence.ts";
import { ruleExplanation } from "../rule-explanation.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

const duplicateDescriptionsMetadata = RuleMetadataSchema.parse({
  id: "metadata.description_duplicate",
  version: "1.0.0",
  category: "metadata",
  defaultSeverity: "low",
  findingType: "opportunity",
  confidence: "strong",
  requires: ["page-summary"],
  description: "Multiple successful pages sharing the same non-empty meta description.",
});

export const duplicateDescriptions: RuleDefinition = {
  metadata: duplicateDescriptionsMetadata,
  explanation: ruleExplanation(
    duplicateDescriptionsMetadata,
    "Duplicate meta descriptions",
    "Repeated descriptions reduce page-specific control over snippet candidates and can reveal undifferentiated templates.",
    "Write page-specific descriptions where controlled snippets are valuable; do not generate meaningless variations.",
    ["Exact fetch_raw description value and every affected URL in the duplicate group."],
    ["metadata", "duplicate-content", "on-page"],
  ),
  evaluate(context) {
    const pages = successfulHtml(context).filter((page) => page.description);
    const counts = new Map<string, number>();
    for (const page of pages) counts.set(page.description?.toLocaleLowerCase() ?? "", (counts.get(page.description?.toLocaleLowerCase() ?? "") ?? 0) + 1);
    const affected = pages.filter((page) => (counts.get(page.description?.toLocaleLowerCase() ?? "") ?? 0) > 1);
    return affected.length === 0
      ? []
      : [
          createFinding(duplicateDescriptionsMetadata, {
            title: "Duplicate meta descriptions",
            summary: "Multiple successful internal pages use the same non-empty meta description.",
            remediation: "Write page-specific descriptions where controlled snippets are valuable; do not generate meaningless variations.",
            affectedUrls: affected.map((page) => page.url),
            evidence: affected.flatMap((page) => pageEvidence(page.url, "description", page.description ?? "missing")),
          }),
        ];
  },
};
