import { describe, expect, test } from "bun:test";
import type { Finding } from "../../packages/seo-audit/src/domain/findings/finding.schema.ts";
import { groupLinkEvidence, resolveLinkEvidence } from "../../packages/seo-audit/src/domain/findings/resolve-link-evidence.ts";
import type { Edge } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";
import type { PageNode } from "../../packages/seo-audit/src/domain/graph/page-node.schema.ts";

const finding: Finding = {
  schemaVersion: 1,
  id: "finding_1",
  ruleId: "links.internal_broken",
  ruleVersion: "1.0.0",
  findingType: "issue",
  category: "links",
  severity: "high",
  confidence: "confirmed",
  title: "Broken links",
  summary: "Broken.",
  remediation: "Fix.",
  affectedUrls: ["https://example.com/missing"],
  sourceUrls: ["https://example.com/"],
  evidence: [],
  count: 1,
};

const target: PageNode = {
  schemaVersion: 1,
  id: "target",
  url: "https://example.com/missing",
  key: "https://example.com/missing",
  internal: true,
  state: "parsed",
  depth: 1,
  discoveryCount: 1,
  discoveredVia: ["anchor"],
  status: 404,
  redirectChain: [],
  robots: [],
  headings: [],
};

const edge: Edge = {
  schemaVersion: 1,
  id: "edge_1",
  sourceId: "source",
  sourceUrl: "https://example.com/",
  targetId: "target",
  targetUrl: target.url,
  kind: "anchor",
  internal: true,
  text: "Missing",
  rel: [],
  nofollow: false,
  sequence: 3,
};

describe("resolveLinkEvidence", () => {
  test("reconstructs source-target evidence from legacy findings and graph edges", () => {
    expect(resolveLinkEvidence(finding, [target], [edge])).toEqual([
      {
        kind: "link",
        edgeId: "edge_1",
        edgeKind: "anchor",
        sourceUrl: "https://example.com/",
        targetUrl: target.url,
        targetStatus: 404,
        text: "Missing",
        rel: [],
        sequence: 3,
      },
    ]);
  });

  test("prefers persisted evidence when the finding contains it", () => {
    const explicit = {
      ...finding,
      evidence: [
        {
          kind: "link" as const,
          edgeId: "saved",
          edgeKind: "anchor" as const,
          sourceUrl: "https://example.com/source",
          targetUrl: target.url,
          targetStatus: 404,
          rel: [],
          sequence: 1,
        },
      ],
    };
    expect(resolveLinkEvidence(explicit, [target], [edge])[0]?.edgeId).toBe("saved");
  });

  test("does not invent link evidence for modern page findings", () => {
    const pageFinding: Finding = {
      ...finding,
      ruleId: "metadata.title_missing",
      category: "metadata",
      evidence: [{ kind: "page", url: target.url, source: "fetch_raw", field: "title", value: "missing" }],
    };
    expect(resolveLinkEvidence(pageFinding, [target], [edge])).toEqual([]);
  });

  test("groups repeated placements while preserving occurrence counts", () => {
    const resolved = resolveLinkEvidence(finding, [target], [edge]);
    const first = resolved[0];
    if (!first) throw new Error("Expected resolved evidence");
    expect(groupLinkEvidence([...resolved, { ...first, edgeId: "edge_2", sequence: 4 }])).toEqual([
      {
        evidence: first,
        occurrences: 2,
      },
    ]);
  });
});
