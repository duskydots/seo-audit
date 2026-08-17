import { createFinding } from "../../create-finding.ts";
import { type RuleDefinition, RuleMetadataSchema } from "../../rule.schema.ts";
import { pageEvidence } from "../page-evidence.ts";
import { ruleExplanation } from "../rule-explanation.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

const duplicateTitlesMetadata = RuleMetadataSchema.parse({
  id: "metadata.title_duplicate",
  version: "1.0.0",
  category: "metadata",
  defaultSeverity: "medium",
  findingType: "warning",
  confidence: "confirmed",
  requires: ["page-summary"],
  description: "Multiple successful pages sharing the same title.",
});

export const duplicateTitles: RuleDefinition = {
  metadata: duplicateTitlesMetadata,
  explanation: ruleExplanation(
    duplicateTitlesMetadata,
    "Duplicate page titles",
    "Shared titles make distinct pages harder to differentiate in search results and often reveal duplicate or poorly differentiated templates.",
    "Give distinct pages useful titles or consolidate genuinely duplicate URLs.",
    ["The exact fetch_raw title value and every affected URL in the duplicate group."],
    ["metadata", "duplicate-content", "on-page"],
  ),
  evaluate(context) {
    const groups = new Map<string, string[]>();
    for (const page of successfulHtml(context)) {
      if (!page.title) continue;
      const key = page.title.toLocaleLowerCase();
      groups.set(key, [...(groups.get(key) ?? []), page.url]);
    }
    const duplicateKeys = new Set([...groups].filter(([, urls]) => urls.length > 1).map(([key]) => key));
    const affectedPages = successfulHtml(context).filter((page) => page.title && duplicateKeys.has(page.title.toLocaleLowerCase()));
    const affectedUrls = affectedPages.map((page) => page.url);
    return affectedUrls.length === 0
      ? []
      : [
          createFinding(duplicateTitlesMetadata, {
            title: "Duplicate page titles",
            summary: "Multiple successful internal pages use the same title.",
            remediation: "Give distinct pages useful titles or consolidate genuinely duplicate URLs.",
            affectedUrls,
            sourceUrls: [],
            evidence: affectedPages.flatMap((page) => pageEvidence(page.url, "title", page.title ?? "missing")),
          }),
        ];
  },
};
