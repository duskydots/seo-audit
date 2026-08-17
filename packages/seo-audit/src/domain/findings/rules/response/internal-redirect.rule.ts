import { definePageRule } from "../../define-page-rule.ts";
import { pageEvidence } from "../page-evidence.ts";

export const internalRedirect = definePageRule({
  metadata: {
    id: "response.internal_redirect",
    version: "1.0.0",
    category: "response",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "confirmed",
    requires: ["page-summary"],
    description: "Internal URLs returning a redirect response.",
  },
  select: (context) => context.pages,
  predicate: (page) => page.internal && (page.status ?? 0) >= 300 && (page.status ?? 0) < 400,
  title: "Internal redirecting URLs",
  summary: "Internal URLs return redirects instead of final content; some redirects are intentional, but preferred URLs should normally be linked directly.",
  remediation: "Update internal links and sitemap entries to the final canonical destination where the redirect is not intentionally user-facing.",
  trigger: "An internal page observation has a final HTTP status between 300 and 399.",
  evidence: (page) => [...pageEvidence(page.url, "status", String(page.status)), ...pageEvidence(page.url, "finalUrl", page.finalUrl ?? "unknown")],
  evidenceDescription: "fetch_raw redirect status and resolved final URL.",
  tags: ["response", "redirects", "crawlability"],
});
