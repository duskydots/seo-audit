import { classifyIndexability } from "../../../indexability/classify-indexability.ts";
import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const thinCandidate = definePageRule({
  metadata: {
    id: "content.thin_candidate",
    version: "1.0.0",
    category: "content",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "heuristic",
    requires: ["page-summary"],
    description: "Indexable candidates with very little raw text.",
  },
  select: successfulHtml,
  predicate: (page) => (page.wordCount ?? 0) < 100 && classifyIndexability(page).indexable,
  title: "Thin-content candidates",
  summary: "Indexable candidates expose fewer than 100 words in raw HTML; word count alone does not measure content quality.",
  remediation: "Review page purpose, main content, template context, and possible JavaScript dependency.",
  evidence: (page) => pageEvidence(page.url, "wordCount", String(page.wordCount ?? 0)),
  evidenceDescription: "Normalized fetch_raw word count below the 100-word heuristic.",
  tags: ["content", "on-page"],
});
