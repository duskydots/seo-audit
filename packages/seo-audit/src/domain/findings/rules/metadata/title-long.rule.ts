import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const longTitles = definePageRule({
  metadata: {
    id: "metadata.title_long",
    version: "1.0.0",
    category: "metadata",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "heuristic",
    requires: ["page-summary"],
    description: "Titles longer than 60 Unicode characters.",
  },
  select: successfulHtml,
  predicate: (page) => Boolean(page.title && [...page.title].length > 60),
  title: "Long page titles",
  summary: "Long titles may be truncated or rewritten in search results; 60 characters is a diagnostic baseline rather than a Google limit.",
  remediation: "Put the distinctive page topic early and remove redundant boilerplate while preserving an accurate title.",
  trigger: "A fetch_raw title contains more than 60 Unicode characters.",
  evidence: (page) => pageEvidence(page.url, "title", `${page.title} (${[...(page.title ?? "")].length} characters)`),
  evidenceDescription: "Exact fetch_raw title and Unicode character count.",
  tags: ["metadata", "on-page", "serp"],
});
