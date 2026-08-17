import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const noindex = definePageRule({
  metadata: {
    id: "indexability.noindex",
    version: "1.0.0",
    category: "indexability",
    defaultSeverity: "high",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary"],
    description: "Successful pages explicitly requesting exclusion from indexes.",
  },
  select: successfulHtml,
  predicate: (page) => page.robots.includes("noindex") || page.robots.includes("none"),
  title: "Pages marked noindex",
  summary: "Pages explicitly request exclusion from search indexes; this may be intentional.",
  remediation: "Confirm exclusion is intentional and remove the directive only from pages that should be eligible.",
  evidence: (page) => pageEvidence(page.url, "robots", page.robots.join(",")),
  evidenceDescription: "fetch_raw robots directives containing noindex or none.",
  tags: ["indexability", "robots"],
});
