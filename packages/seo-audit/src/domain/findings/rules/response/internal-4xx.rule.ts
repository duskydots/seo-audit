import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";

export const internal4xx = definePageRule({
  metadata: {
    id: "response.internal_4xx",
    version: "1.0.0",
    category: "response",
    defaultSeverity: "high",
    findingType: "issue",
    confidence: "confirmed",
    requires: ["page-summary"],
    description: "Internal URLs returning client errors.",
  },
  select: (context) => context.pages,
  predicate: (page) => page.internal && (page.status ?? 0) >= 400 && (page.status ?? 0) < 500,
  title: "Internal client errors (4xx)",
  summary: "Internal URLs return a client error and cannot provide the linked content.",
  remediation: "Restore the target, redirect it to a relevant working URL, or update/remove every internal link.",
  evidence: (page) => pageEvidence(page.url, "status", String(page.status)),
  evidenceDescription: "fetch_raw HTTP status code in the 4xx range.",
  tags: ["response", "crawlability"],
});
