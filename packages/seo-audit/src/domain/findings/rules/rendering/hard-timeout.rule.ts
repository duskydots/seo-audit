import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const renderTimeout = defineRenderRule(
  {
    id: "rendering.hard_timeout",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["rendered-dom"],
    description: "Rendering reached the hard deadline before content stability.",
  },
  (audit) => audit.execution.termination === "hard-timeout",
  {
    title: "Pages did not reach render stability",
    summary: "Chromium captured the available DOM at the hard deadline before the content became stable.",
    remediation: "Reduce or terminate long-running content work, inspect failed requests, and ensure critical content appears early.",
    evidenceDescription: "Playwright termination reason, elapsed render duration, mutation count and reached checkpoints.",
    evidence: (audit) => [
      browserEvidence(
        audit.pageUrl,
        "termination",
        "execution.termination",
        `${audit.execution.termination}; durationMs=${audit.execution.durationMs}; mutations=${audit.execution.mutationCount}; contentStableMs=${audit.execution.checkpoints.contentStableMs ?? "not-reached"}`,
      ),
    ],
  },
);
