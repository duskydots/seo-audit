import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const shortTitles = definePageRule({
  metadata: {
    id: "metadata.title_short",
    version: "1.0.0",
    category: "metadata",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "heuristic",
    requires: ["page-summary"],
    description: "Non-empty titles shorter than 15 Unicode characters.",
  },
  select: successfulHtml,
  predicate: (page) => Boolean(page.title && [...page.title].length < 15),
  title: "Very short page titles",
  summary: "Very short titles may not communicate enough page-specific context; character count is a review heuristic, not a ranking rule.",
  remediation: "Review whether the title accurately and distinctly describes the page without padding it mechanically.",
  trigger: "A non-empty fetch_raw title contains fewer than 15 Unicode characters.",
  evidence: (page) => pageEvidence(page.url, "title", `${page.title} (${[...(page.title ?? "")].length} characters)`),
  evidenceDescription: "Exact fetch_raw title and Unicode character count.",
  tags: ["metadata", "on-page", "serp"],
});
