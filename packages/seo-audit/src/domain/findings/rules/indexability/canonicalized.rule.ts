import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const canonicalized = definePageRule({
  metadata: {
    id: "indexability.canonicalized",
    version: "1.0.0",
    category: "indexability",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary"],
    description: "Successful pages declaring a different canonical URL.",
  },
  select: successfulHtml,
  predicate: (page) => Boolean(page.canonical && page.canonical !== page.url && page.canonical !== page.finalUrl),
  title: "Canonicalized pages",
  summary: "Pages declare another URL as canonical; this can be correct for duplicate variants.",
  remediation: "Confirm internal links and sitemaps consistently use the preferred canonical URL.",
  evidence: (page) => pageEvidence(page.url, "canonical", page.canonical ?? "missing"),
  evidenceDescription: "Canonical URL in fetch_raw differs from the crawled or final URL.",
  tags: ["indexability", "canonical"],
});
