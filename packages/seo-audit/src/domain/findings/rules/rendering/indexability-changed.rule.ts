import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const indexabilityChanged = defineRenderRule(
  {
    id: "rendering.indexability_changed",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "high",
    findingType: "warning",
    confidence: "confirmed",
    requires: ["rendered-dom"],
    description: "JavaScript changes robots exclusions or the canonical URL.",
  },
  (audit) =>
    audit.totalDelta.robotsAdded.some((value) => value === "noindex" || value === "none") ||
    audit.totalDelta.robotsRemoved.some((value) => value === "noindex" || value === "none") ||
    audit.totalDelta.canonical.state === "changed" ||
    audit.totalDelta.canonical.state === "removed",
  {
    title: "JavaScript changes indexability signals",
    summary: "The final DOM changes an exclusion directive or canonical signal found in the response HTML.",
    remediation: "Make robots and canonical signals stable and intentional in the server response and final DOM.",
    evidenceDescription: "Exact raw and rendered canonical values plus added and removed robots directives.",
    evidence: (audit) => [
      browserEvidence(
        audit.pageUrl,
        "render-delta",
        "indexability",
        `canonical=${audit.totalDelta.canonical.state}:${audit.totalDelta.canonical.raw ?? "missing"}->${audit.totalDelta.canonical.rendered ?? "missing"}; robotsAdded=${audit.totalDelta.robotsAdded.join(",") || "none"}; robotsRemoved=${audit.totalDelta.robotsRemoved.join(",") || "none"}`,
      ),
    ],
    tags: ["javascript", "rendering", "indexability"],
  },
);
