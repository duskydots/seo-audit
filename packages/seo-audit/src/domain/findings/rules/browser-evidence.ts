import type { FindingEvidence } from "../finding.schema.ts";

export function browserEvidence(
  pageUrl: string,
  evidenceType: "render-delta" | "network-failure" | "http-error" | "runtime-error" | "metric" | "termination",
  field: string,
  value: string,
): FindingEvidence {
  return { kind: "browser", pageUrl, source: "playwright", evidenceType, field, value };
}
