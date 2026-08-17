import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const sitemapNoindex = definePageRule({
  metadata: {
    id: "sitemap.noindex",
    version: "1.0.0",
    category: "sitemap",
    defaultSeverity: "high",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary", "graph"],
    description: "Sitemap-declared successful pages carrying noindex or none robots directives.",
  },
  select: successfulHtml,
  predicate: (page) => page.discoveredVia.includes("sitemap") && (page.robots.includes("noindex") || page.robots.includes("none")),
  title: "Noindex URLs in sitemaps",
  summary: "The sitemap requests discovery of URLs whose page directives request exclusion from search indexes.",
  remediation: "Remove intentionally excluded URLs from the sitemap or remove an accidental noindex directive.",
  trigger: "A successful sitemap-discovered HTML page has a fetch_raw robots directive containing noindex or none.",
  evidence: (page) => pageEvidence(page.url, "robots", page.robots.join(",")),
  evidenceDescription: "Sitemap discovery provenance and exact fetch_raw robots directives.",
  tags: ["sitemap", "robots", "indexability"],
});
