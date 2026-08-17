import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const primaryContentRemoved = defineRenderRule(
  {
    id: "rendering.primary_content_removed",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "high",
    findingType: "warning",
    confidence: "strong",
    requires: ["rendered-dom"],
    description: "Hydration removes substantial text present in the fetched HTML.",
  },
  (audit) => audit.totalDelta.removedWords > 100 && audit.totalDelta.renderedWordCount < audit.totalDelta.rawWordCount * 0.6,
  {
    title: "Hydration removes primary content",
    summary: "Substantial response content is absent from the final rendered DOM.",
    remediation: "Fix hydration or client state so server-rendered primary content remains available after JavaScript execution.",
    evidenceDescription: "Playwright total raw-to-rendered word counts, removed-word count and text similarity.",
    evidence: (audit) => [
      browserEvidence(
        audit.pageUrl,
        "render-delta",
        "content.words",
        `raw=${audit.totalDelta.rawWordCount}; rendered=${audit.totalDelta.renderedWordCount}; removed=${audit.totalDelta.removedWords}; similarity=${audit.totalDelta.textSimilarity}`,
      ),
    ],
  },
);
