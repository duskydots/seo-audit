import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const titleMissing = definePageRule({
  metadata: {
    id: "metadata.title_missing",
    version: "1.0.0",
    category: "metadata",
    defaultSeverity: "high",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary"],
    description: "Successful HTML pages without a title.",
  },
  select: successfulHtml,
  predicate: (page) => !page.title,
  title: "Missing page titles",
  summary: "Successful HTML pages are missing a non-empty title element.",
  remediation: "Add a unique, descriptive title to important indexable pages.",
  evidence: (page) => pageEvidence(page.url, "title", "missing"),
  evidenceDescription: "Missing title in the fetch_raw HTML observation.",
  tags: ["metadata", "on-page"],
});
