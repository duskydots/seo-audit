import { describe, expect, test } from "bun:test";
import type { Finding } from "../../packages/seo-audit/src/domain/findings/finding.schema.ts";
import { indexFindingsByPage } from "../../packages/seo-audit/src/domain/findings/index-findings-by-page.ts";
import type { Edge } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";

const finding: Finding = {
  schemaVersion: 1,
  id: "finding_1",
  ruleId: "links.internal_broken",
  ruleVersion: "1.0.0",
  findingType: "issue",
  category: "links",
  severity: "high",
  confidence: "confirmed",
  title: "Broken link",
  summary: "Broken.",
  remediation: "Fix.",
  affectedUrls: ["https://example.com/missing"],
  sourceUrls: [],
  evidence: [],
  count: 1,
};

const edge: Edge = {
  schemaVersion: 1,
  id: "edge_1",
  sourceId: "home",
  sourceUrl: "https://example.com/",
  targetUrl: "https://example.com/missing",
  kind: "anchor",
  internal: true,
  rel: [],
  nofollow: false,
  sequence: 0,
};

describe("indexFindingsByPage", () => {
  test("associates edge findings with source and target pages", () => {
    const index = indexFindingsByPage([finding], [], [edge]);
    expect(index.get("https://example.com/")).toEqual([finding]);
    expect(index.get("https://example.com/missing")).toEqual([finding]);
  });
});
