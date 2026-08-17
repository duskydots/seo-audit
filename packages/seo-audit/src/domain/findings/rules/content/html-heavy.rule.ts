import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const htmlHeavy = definePageRule({
  metadata: {
    id: "content.html_heavy",
    version: "1.0.0",
    category: "content",
    defaultSeverity: "medium",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["page-summary"],
    description: "Decoded HTML exceeding the declared baseline.",
  },
  select: successfulHtml,
  predicate: (page) => (page.htmlBytes ?? 0) > 500_000,
  title: "Heavy HTML documents",
  summary: "Decoded HTML exceeds the configured 500 kB diagnostic baseline; this is not a Google limit.",
  remediation: "Reduce duplicated markup, embedded application data, and unnecessary inline scripts or styles.",
  evidence: (page) => pageEvidence(page.url, "htmlBytes", String(page.htmlBytes ?? 0)),
  evidenceDescription: "Decoded fetch_raw HTML byte count above the 500 kB diagnostic baseline.",
  tags: ["content", "performance", "payload"],
});
