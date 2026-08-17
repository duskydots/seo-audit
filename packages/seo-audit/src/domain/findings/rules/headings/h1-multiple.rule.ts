import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const h1Multiple = definePageRule({
  metadata: {
    id: "headings.h1_multiple",
    version: "1.0.0",
    category: "headings",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["page-summary"],
    description: "Successful HTML pages with multiple H1 headings.",
  },
  select: successfulHtml,
  predicate: (page) => page.headings.filter((heading) => heading.level === 1 && heading.text).length > 1,
  title: "Multiple H1 headings",
  summary: "Pages contain multiple H1 headings and may have an unclear content hierarchy; this is not inherently invalid HTML.",
  remediation: "Review whether the primary topic remains unambiguous rather than mechanically forcing one H1.",
  evidence: (page) => pageEvidence(page.url, "headings.h1.count", String(page.headings.filter((heading) => heading.level === 1 && heading.text).length)),
  evidenceDescription: "Count of non-empty H1 headings in the fetch_raw heading outline.",
  tags: ["headings", "on-page"],
});
