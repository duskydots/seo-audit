import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";

export const internal5xx = definePageRule({
  metadata: {
    id: "response.internal_5xx",
    version: "1.0.0",
    category: "response",
    defaultSeverity: "critical",
    findingType: "issue",
    confidence: "confirmed",
    requires: ["page-summary"],
    description: "Internal URLs returning server errors.",
  },
  select: (context) => context.pages,
  predicate: (page) => page.internal && (page.status ?? 0) >= 500,
  title: "Internal server errors (5xx)",
  summary: "Internal URLs returned server errors during the crawl.",
  remediation: "Inspect server logs, restore service, and retry the affected URLs.",
  evidence: (page) => pageEvidence(page.url, "status", String(page.status)),
  evidenceDescription: "fetch_raw HTTP status code in the 5xx range.",
  tags: ["response", "availability"],
});
