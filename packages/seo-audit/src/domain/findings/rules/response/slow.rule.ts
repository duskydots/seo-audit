import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const slowResponses = definePageRule({
  metadata: {
    id: "response.slow",
    version: "1.0.0",
    category: "response",
    defaultSeverity: "medium",
    findingType: "opportunity",
    confidence: "heuristic",
    requires: ["page-summary"],
    description: "Successful internal responses taking more than 2,000 ms in the crawler observation.",
  },
  select: successfulHtml,
  predicate: (page) => (page.responseTimeMs ?? 0) > 2_000,
  title: "Slow server responses",
  summary: "Slow HTML responses delay discovery and user-visible work, although a single lab observation is not field performance data.",
  remediation: "Repeat the measurement, then inspect origin processing, cache behavior, redirects, database work and geographic latency.",
  trigger: "The native fetch elapsed time for a successful internal HTML response exceeds 2,000 ms.",
  evidence: (page) => pageEvidence(page.url, "responseTimeMs", String(page.responseTimeMs)),
  evidenceDescription: "Exact native-fetch elapsed time and the 2,000 ms diagnostic baseline.",
  tags: ["response", "performance", "server"],
});
