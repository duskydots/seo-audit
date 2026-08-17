import { describe, expect, test } from "bun:test";
import { FindingSchema } from "../../packages/seo-audit/src/domain/findings/finding.schema.ts";
import { type PageNode, PageNodeSchema } from "../../packages/seo-audit/src/domain/graph/page-node.schema.ts";
import { RenderAuditSchema } from "../../packages/seo-audit/src/domain/render/render-audit.schema.ts";
import { RendererMessageSchema } from "../../packages/seo-audit/src/domain/render/render-worker-message.schema.ts";

const validPage: PageNode = {
  schemaVersion: 1,
  id: "url_1",
  url: "https://example.com/",
  key: "https://example.com/",
  internal: true,
  state: "parsed",
  depth: 0,
  discoveryCount: 1,
  discoveredVia: ["seed"],
  redirectChain: [],
  robots: [],
  headings: [],
};

describe("runtime schemas", () => {
  test("round trips page JSON", () => {
    expect(PageNodeSchema.parse(JSON.parse(JSON.stringify(validPage)))).toEqual(validPage);
  });

  test("rejects unknown fields and versions", () => {
    expect(PageNodeSchema.safeParse({ ...validPage, unexpected: true }).success).toBeFalse();
    expect(PageNodeSchema.safeParse({ ...validPage, schemaVersion: 2 }).success).toBeFalse();
  });

  test("rejects malformed IPC messages", () => {
    expect(RendererMessageSchema.safeParse({ type: "result", jobId: "x", result: {} }).success).toBeFalse();
  });

  test("rejects incomplete and unknown render-audit fields", () => {
    expect(RenderAuditSchema.safeParse({ schemaVersion: 1, pageUrl: "https://example.com/" }).success).toBeFalse();
    expect(RenderAuditSchema.safeParse({ schemaVersion: 1, pageUrl: "https://example.com/", unexpected: true }).success).toBeFalse();
  });

  test("validates finding evidence and supports legacy findings without the evidence field", () => {
    const finding = FindingSchema.parse({
      schemaVersion: 1,
      id: "finding_1",
      ruleId: "links.internal_broken",
      ruleVersion: "1.0.0",
      findingType: "issue",
      category: "links",
      severity: "high",
      confidence: "confirmed",
      title: "Broken internal links",
      summary: "A link is broken.",
      remediation: "Fix it.",
      affectedUrls: ["https://example.com/missing"],
      sourceUrls: ["https://example.com/"],
      count: 1,
    });
    expect(finding.evidence).toEqual([]);
    expect(
      FindingSchema.safeParse({
        ...finding,
        evidence: [
          { kind: "link", edgeId: "edge_1", edgeKind: "anchor", sourceUrl: "not-a-url", targetUrl: "https://example.com/missing", rel: [], sequence: 0 },
        ],
      }).success,
    ).toBeFalse();
    expect(FindingSchema.safeParse({ ...finding, unexpected: true }).success).toBeFalse();
    expect(FindingSchema.safeParse({ ...finding, schemaVersion: 2 }).success).toBeFalse();
    const browserFinding = FindingSchema.parse({
      ...finding,
      evidence: [
        {
          kind: "browser",
          pageUrl: "https://example.com/",
          source: "playwright",
          evidenceType: "http-error",
          field: "response.status",
          value: "500",
          requestUrl: "https://example.com/api",
          resourceType: "fetch",
          status: 500,
        },
      ],
    });
    expect(FindingSchema.parse(JSON.parse(JSON.stringify(browserFinding)))).toEqual(browserFinding);
    expect(
      FindingSchema.safeParse({
        ...browserFinding,
        evidence: [{ ...browserFinding.evidence[0], unexpected: true }],
      }).success,
    ).toBeFalse();
  });
});
