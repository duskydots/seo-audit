import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const sitemapCanonicalized = definePageRule({
  metadata: {
    id: "sitemap.canonicalized",
    version: "1.0.0",
    category: "sitemap",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["page-summary", "graph"],
    description: "Sitemap-declared successful pages canonicalizing to a different URL.",
  },
  select: successfulHtml,
  predicate: (page) => page.discoveredVia.includes("sitemap") && Boolean(page.canonical && page.canonical !== page.url && page.canonical !== page.finalUrl),
  title: "Canonicalized URLs in sitemaps",
  summary: "Sitemaps list URLs that declare another URL as canonical, weakening the consistency of publisher-declared preferred URLs.",
  remediation: "Replace each sitemap entry with its successful preferred canonical URL, or correct an unintended canonical declaration.",
  trigger: "A successful sitemap-discovered HTML page declares a canonical different from its crawled and final URL.",
  evidence: (page) => pageEvidence(page.url, "canonical", page.canonical ?? "missing"),
  evidenceDescription: "Sitemap discovery provenance and exact fetch_raw canonical target.",
  tags: ["sitemap", "canonical", "indexability"],
});
