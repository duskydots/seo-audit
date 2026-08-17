import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const primaryContentAdded = defineRenderRule(
  {
    id: "rendering.primary_content_added",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "strong",
    requires: ["rendered-dom"],
    description: "Rendered pages add substantial text absent from the fetched HTML.",
  },
  (audit) => audit.totalDelta.addedWords > 100 && audit.totalDelta.renderedWordCount > audit.totalDelta.rawWordCount * 1.5,
  {
    title: "Primary content depends on JavaScript",
    summary: "The rendered DOM adds substantial text that was absent from the server response.",
    remediation: "Server-render or statically render critical primary content, and verify the deployed page with Search Console URL Inspection.",
    evidenceDescription: "Playwright total raw-to-rendered word counts, added-word count and text similarity.",
    evidence: (audit) => [
      browserEvidence(
        audit.pageUrl,
        "render-delta",
        "content.words",
        `raw=${audit.totalDelta.rawWordCount}; rendered=${audit.totalDelta.renderedWordCount}; added=${audit.totalDelta.addedWords}; similarity=${audit.totalDelta.textSimilarity}`,
      ),
    ],
  },
);
