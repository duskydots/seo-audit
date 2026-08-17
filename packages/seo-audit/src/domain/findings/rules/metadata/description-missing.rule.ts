import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const descriptionMissing = definePageRule({
  metadata: {
    id: "metadata.description_missing",
    version: "1.0.0",
    category: "metadata",
    defaultSeverity: "medium",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["page-summary"],
    description: "Successful HTML pages without meta descriptions.",
  },
  select: successfulHtml,
  predicate: (page) => !page.description,
  title: "Missing meta descriptions",
  summary: "Pages do not provide a controlled description candidate, although search engines may generate snippets from page content.",
  remediation: "Add useful page-specific descriptions where controlled search snippets are commercially valuable.",
  evidence: (page) => pageEvidence(page.url, "description", "missing"),
  evidenceDescription: "Missing meta description in the fetch_raw HTML observation.",
  tags: ["metadata", "on-page"],
});
