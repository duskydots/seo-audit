import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const skippedHeadingLevels = definePageRule({
  metadata: {
    id: "headings.level_skipped",
    version: "1.0.0",
    category: "headings",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["page-summary"],
    description: "Heading outlines that increase by more than one level between adjacent headings.",
  },
  select: successfulHtml,
  predicate: (page) => page.headings.some((heading, index) => index > 0 && heading.level > (page.headings[index - 1]?.level ?? heading.level) + 1),
  title: "Skipped heading levels",
  summary: "Abrupt heading-level jumps can make the visible document hierarchy harder to understand for users and assistive technology.",
  remediation: "Use heading levels to represent nested sections consistently instead of selecting levels for visual styling alone.",
  trigger: "Two adjacent fetch_raw headings increase by more than one level, such as H2 followed directly by H4.",
  evidence: (page) => pageEvidence(page.url, "headings", page.headings.map((heading) => `H${heading.level}:${heading.text}`).join(" | ")),
  evidenceDescription: "Complete fetch_raw heading outline in document order.",
  tags: ["headings", "accessibility", "on-page"],
});
