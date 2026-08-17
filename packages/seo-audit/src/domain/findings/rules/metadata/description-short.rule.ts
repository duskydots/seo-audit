import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const shortDescriptions = definePageRule({
  metadata: {
    id: "metadata.description_short",
    version: "1.0.0",
    category: "metadata",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "heuristic",
    requires: ["page-summary"],
    description: "Non-empty meta descriptions shorter than 50 Unicode characters.",
  },
  select: successfulHtml,
  predicate: (page) => Boolean(page.description && [...page.description].length < 50),
  title: "Very short meta descriptions",
  summary: "Very short descriptions may provide too little page-specific context for a useful snippet candidate; length alone is not a quality signal.",
  remediation: "Review whether the description communicates the page's distinctive value without padding it to meet a number.",
  trigger: "A non-empty fetch_raw meta description contains fewer than 50 Unicode characters.",
  evidence: (page) => pageEvidence(page.url, "description", `${page.description} (${[...(page.description ?? "")].length} characters)`),
  evidenceDescription: "Exact fetch_raw meta description and Unicode character count.",
  tags: ["metadata", "on-page", "serp"],
});
