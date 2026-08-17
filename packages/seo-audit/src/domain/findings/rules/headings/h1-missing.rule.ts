import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const h1Missing = definePageRule({
  metadata: {
    id: "headings.h1_missing",
    version: "1.0.0",
    category: "headings",
    defaultSeverity: "medium",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["page-summary"],
    description: "Successful HTML pages without an H1.",
  },
  select: successfulHtml,
  predicate: (page) => !page.headings.some((heading) => heading.level === 1 && heading.text),
  title: "Missing H1 headings",
  summary: "Pages have no non-empty H1 heading in the crawled HTML.",
  remediation: "Provide a clear primary heading when it improves the visible content hierarchy.",
  evidence: (page) => pageEvidence(page.url, "headings.h1", "missing"),
  evidenceDescription: "No non-empty H1 in the fetch_raw heading outline.",
  tags: ["headings", "on-page"],
});
