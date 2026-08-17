import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const longDescriptions = definePageRule({
  metadata: {
    id: "metadata.description_long",
    version: "1.0.0",
    category: "metadata",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "heuristic",
    requires: ["page-summary"],
    description: "Meta descriptions longer than 160 Unicode characters.",
  },
  select: successfulHtml,
  predicate: (page) => Boolean(page.description && [...page.description].length > 160),
  title: "Long meta descriptions",
  summary: "Long descriptions may be truncated or replaced in search snippets; length is a review heuristic and snippets vary by query and device.",
  remediation: "Keep the most useful page-specific message early and remove repeated or generic copy.",
  trigger: "A fetch_raw meta description contains more than 160 Unicode characters.",
  evidence: (page) => pageEvidence(page.url, "description", `${page.description} (${[...(page.description ?? "")].length} characters)`),
  evidenceDescription: "Exact fetch_raw meta description and Unicode character count.",
  tags: ["metadata", "on-page", "serp"],
});
