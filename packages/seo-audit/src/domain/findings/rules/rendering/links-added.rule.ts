import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const renderedOnlyLinks = defineRenderRule(
  {
    id: "rendering.links_added",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "medium",
    findingType: "warning",
    confidence: "strong",
    requires: ["rendered-dom", "graph"],
    description: "Internal anchor links are introduced only after JavaScript execution.",
  },
  (audit) => audit.totalDelta.linksAdded.some((link) => link.kind === "anchor" && new URL(link.url).origin === new URL(audit.pageUrl).origin),
  {
    title: "Internal links depend on JavaScript",
    summary: "The rendered DOM introduces internal anchor links absent from the fetched HTML.",
    remediation: "Keep critical discovery paths as crawlable server-rendered `<a href>` links where practical.",
    evidenceDescription: "Every same-origin anchor added to the rendered DOM, including target URL and anchor text.",
    evidence: (audit) =>
      audit.totalDelta.linksAdded
        .filter((link) => link.kind === "anchor" && new URL(link.url).origin === new URL(audit.pageUrl).origin)
        .map((link) => browserEvidence(audit.pageUrl, "render-delta", "linksAdded", `${link.url} | text=${link.text || "empty"}`)),
    tags: ["javascript", "rendering", "links"],
  },
);
