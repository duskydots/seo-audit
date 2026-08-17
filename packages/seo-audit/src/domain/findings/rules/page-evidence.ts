import type { FindingEvidence } from "../finding.schema.ts";

export function pageEvidence(url: string, field: string, value: string): FindingEvidence[] {
  return [{ kind: "page", url, source: "fetch_raw", field, value }];
}
