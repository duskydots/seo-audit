import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";
import { successfulHtmlPages as successfulHtml } from "../successful-html-pages.ts";

export const altMissing = definePageRule({
  metadata: {
    id: "images.alt_missing",
    version: "1.0.0",
    category: "images",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["page-summary"],
    description: "Pages containing images without alt attributes.",
  },
  select: successfulHtml,
  predicate: (page) => (page.missingAltCount ?? 0) > 0,
  title: "Images missing alt attributes",
  summary: "Pages contain images without an alt attribute; whether text is required depends on image purpose.",
  remediation: "Add descriptive alt text for informative images and empty alt attributes for decorative images.",
  evidence: (page) => pageEvidence(page.url, "images.missingAltCount", String(page.missingAltCount ?? 0)),
  evidenceDescription: "Count of image elements without alt attributes in fetch_raw HTML.",
  tags: ["images", "accessibility"],
});
