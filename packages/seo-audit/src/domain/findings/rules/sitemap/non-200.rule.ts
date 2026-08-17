import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";

export const sitemapErrors = definePageRule({
  metadata: {
    id: "sitemap.non_200",
    version: "1.0.0",
    category: "sitemap",
    defaultSeverity: "high",
    findingType: "issue",
    confidence: "confirmed",
    requires: ["page-summary", "graph"],
    description: "Sitemap-declared internal URLs returning a non-2xx response.",
  },
  select: (context) => context.pages,
  predicate: (page) => page.internal && page.discoveredVia.includes("sitemap") && page.status !== undefined && (page.status < 200 || page.status >= 300),
  title: "Non-success URLs in sitemaps",
  summary: "Sitemaps declare URLs that do not return successful content, creating conflicting publisher discovery signals.",
  remediation: "List only preferred, canonical, successful URLs in XML sitemaps and remove or correct redirecting and error URLs.",
  trigger: "A sitemap-discovered internal URL has a native-fetch status outside 200–299.",
  evidence: (page) => pageEvidence(page.url, "status", String(page.status)),
  evidenceDescription: "Sitemap discovery provenance and exact native-fetch status.",
  tags: ["sitemap", "response", "indexability"],
});
