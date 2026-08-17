import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";

export const redirectChain = definePageRule({
  metadata: {
    id: "response.redirect_chain",
    version: "1.0.0",
    category: "response",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary"],
    description: "Internal URLs requiring more than one redirect hop.",
  },
  select: (context) => context.pages,
  predicate: (page) => page.internal && page.redirectChain.length > 1,
  title: "Redirect chains",
  summary: "URLs pass through multiple redirects before reaching their final destination, increasing latency and creating additional failure points.",
  remediation: "Point internal links and redirect rules directly to the final destination.",
  trigger: "The persisted redirect chain contains two or more redirect responses.",
  evidence: (page) => pageEvidence(page.url, "redirectChain", page.redirectChain.map((hop) => `${hop.status} ${hop.url} -> ${hop.target}`).join(" | ")),
  evidenceDescription: "Every redirect hop with status, source and target URL.",
  tags: ["response", "redirects", "performance"],
});
