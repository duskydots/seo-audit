import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const deepPages = definePageRule({
  metadata: {
    id: "links.deep_page",
    version: "1.0.0",
    category: "links",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["page-summary", "graph"],
    description: "Successful internal pages more than three observed anchor hops from the seed.",
  },
  select: successfulHtml,
  predicate: (page) => (page.navigationDepth ?? 0) > 3,
  title: "Deep pages",
  summary: "Pages requiring many observed link hops may be less prominent in the site architecture; depth is contextual, not a ranking limit.",
  remediation: "Add useful contextual or navigational paths to important deep pages without flattening the site artificially.",
  trigger: "The shortest seed-connected path through observed raw or rendered internal anchors is greater than three edges.",
  evidence: (page) => pageEvidence(page.url, "navigationDepth", String(page.navigationDepth)),
  evidenceDescription: "Shortest computed anchor-only navigation depth from the crawl seed.",
  tags: ["links", "architecture", "crawlability"],
});
