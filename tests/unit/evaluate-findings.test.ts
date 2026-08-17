import { describe, expect, test } from "bun:test";
import { evaluateFindings } from "../../packages/seo-audit/src/domain/findings/evaluate-findings.ts";
import { FindingSchema } from "../../packages/seo-audit/src/domain/findings/finding.schema.ts";
import type { Edge } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";
import type { PageNode } from "../../packages/seo-audit/src/domain/graph/page-node.schema.ts";

function page(overrides: Partial<PageNode>): PageNode {
  return {
    schemaVersion: 1,
    id: "url_test",
    url: "https://example.com/missing",
    key: "https://example.com/missing",
    internal: true,
    state: "parsed",
    depth: 1,
    discoveryCount: 1,
    discoveredVia: ["anchor"],
    status: 404,
    contentType: "text/html",
    redirectChain: [],
    robots: ["noindex"],
    headings: [],
    ...overrides,
  };
}

describe("evaluateFindings", () => {
  test("does not cascade metadata and content findings from error templates", () => {
    const findings = evaluateFindings([page({})], []);
    expect(findings.map((finding) => finding.ruleId)).toEqual(["response.internal_4xx"]);
  });

  test("evaluates metadata for successful HTML pages", () => {
    const findings = evaluateFindings([page({ status: 200, robots: [] })], []);
    expect(findings.some((finding) => finding.ruleId === "metadata.title_missing")).toBeTrue();
    expect(findings.some((finding) => finding.ruleId === "headings.h1_missing")).toBeTrue();
    expect(findings.find((finding) => finding.ruleId === "metadata.title_missing")?.evidence).toEqual([
      { kind: "page", url: "https://example.com/missing", source: "fetch_raw", field: "title", value: "missing" },
    ]);
  });

  test("reports redirect chains, metadata lengths and skipped heading levels with exact fields", () => {
    const title = "A title that is deliberately much longer than the sixty character diagnostic baseline";
    const description = "D".repeat(161);
    const findings = evaluateFindings(
      [
        page({
          status: 200,
          robots: [],
          title,
          description,
          headings: [
            { level: 1, text: "Primary" },
            { level: 3, text: "Skipped" },
          ],
          redirectChain: [
            { url: "https://example.com/a", status: 301, target: "https://example.com/b" },
            { url: "https://example.com/b", status: 302, target: "https://example.com/missing" },
          ],
        }),
      ],
      [],
    );
    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["response.redirect_chain", "metadata.title_long", "metadata.description_long", "headings.level_skipped"]),
    );
    expect(findings.find((finding) => finding.ruleId === "response.redirect_chain")?.evidence[0]).toMatchObject({ kind: "page", field: "redirectChain" });
  });

  test("reports successful sitemap pages outside the seed-connected graph", () => {
    const findings = evaluateFindings(
      [page({ status: 200, robots: [], title: "Orphan", headings: [{ level: 1, text: "Orphan" }], discoveredVia: ["sitemap"] })],
      [],
    );
    expect(findings.some((finding) => finding.ruleId === "links.unreachable_from_seed")).toBeTrue();
  });

  test("flags sitemap conflicts, deep pages, slow responses and short descriptions with exact evidence", () => {
    const findings = evaluateFindings(
      [
        page({
          status: 200,
          robots: ["noindex"],
          title: "A useful page title",
          description: "Short description",
          canonical: "https://example.com/preferred",
          headings: [{ level: 1, text: "Primary" }],
          discoveredVia: ["sitemap"],
          navigationDepth: 4,
          responseTimeMs: 2_100,
        }),
        page({
          id: "redirect",
          url: "https://example.com/redirect",
          key: "https://example.com/redirect",
          status: 301,
          robots: [],
          discoveredVia: ["sitemap"],
        }),
      ],
      [],
    );
    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["metadata.description_short", "response.slow", "links.deep_page", "sitemap.non_200", "sitemap.noindex", "sitemap.canonicalized"]),
    );
    expect(findings.find((finding) => finding.ruleId === "sitemap.non_200")?.evidence).toContainEqual(
      expect.objectContaining({ kind: "page", url: "https://example.com/redirect", field: "status", value: "301" }),
    );
    expect(findings.find((finding) => finding.ruleId === "links.deep_page")?.evidence).toContainEqual(
      expect.objectContaining({ field: "navigationDepth", value: "4" }),
    );
  });

  test("preserves source, target, anchor text and status for every broken-link occurrence", () => {
    const target = page({ url: "https://example.com/missing", key: "https://example.com/missing", status: 404 });
    const source = page({
      id: "url_home",
      url: "https://example.com/",
      key: "https://example.com/",
      status: 200,
      robots: [],
      title: "Home",
      headings: [{ level: 1, text: "Home" }],
    });
    const edge: Edge = {
      schemaVersion: 1,
      id: "edge_broken",
      sourceId: source.id,
      sourceUrl: source.url,
      targetId: target.id,
      targetUrl: target.url,
      kind: "anchor",
      internal: true,
      text: "Missing tour",
      rel: [],
      nofollow: false,
      sequence: 7,
    };
    const finding = evaluateFindings([source, target], [edge]).find((item) => item.ruleId === "links.internal_broken");
    expect(finding).toBeDefined();
    if (!finding) throw new Error("Expected broken-link finding");
    expect(finding?.sourceUrls).toEqual([source.url]);
    expect(finding?.evidence).toEqual([
      {
        kind: "link",
        edgeId: edge.id,
        edgeKind: "anchor",
        sourceUrl: source.url,
        targetUrl: target.url,
        targetStatus: 404,
        text: "Missing tour",
        rel: [],
        sequence: 7,
      },
    ]);
    expect(FindingSchema.parse(JSON.parse(JSON.stringify(finding)))).toEqual(finding);
  });

  test("preserves exact source edges for redirected, nofollow and broken canonical targets", () => {
    const source = page({
      id: "source",
      url: "https://example.com/",
      key: "https://example.com/",
      status: 200,
      robots: [],
      title: "Homepage title",
      headings: [{ level: 1, text: "Home" }],
    });
    const redirected = page({ id: "redirect", url: "https://example.com/redirect", key: "https://example.com/redirect", status: 301 });
    const broken = page({ id: "broken", url: "https://example.com/broken", key: "https://example.com/broken", status: 404 });
    const edges: Edge[] = [
      {
        schemaVersion: 1,
        id: "redirect-link",
        sourceId: source.id,
        sourceUrl: source.url,
        targetId: redirected.id,
        targetUrl: redirected.url,
        kind: "anchor",
        internal: true,
        text: "Old",
        rel: [],
        nofollow: false,
        sequence: 1,
      },
      {
        schemaVersion: 1,
        id: "nofollow-link",
        sourceId: source.id,
        sourceUrl: source.url,
        targetId: redirected.id,
        targetUrl: redirected.url,
        kind: "anchor",
        internal: true,
        text: "Restricted",
        rel: ["nofollow"],
        nofollow: true,
        sequence: 2,
      },
      {
        schemaVersion: 1,
        id: "broken-canonical",
        sourceId: source.id,
        sourceUrl: source.url,
        targetId: broken.id,
        targetUrl: broken.url,
        kind: "canonical",
        internal: true,
        rel: [],
        nofollow: false,
        sequence: 3,
      },
    ];
    const findings = evaluateFindings([source, redirected, broken], edges);
    expect(findings.find((finding) => finding.ruleId === "links.internal_redirect")?.evidence).toContainEqual(
      expect.objectContaining({ edgeId: "redirect-link", sourceUrl: source.url, targetStatus: 301 }),
    );
    expect(findings.find((finding) => finding.ruleId === "links.internal_nofollow")?.evidence).toContainEqual(
      expect.objectContaining({ edgeId: "nofollow-link", text: "Restricted" }),
    );
    expect(findings.find((finding) => finding.ruleId === "indexability.canonical_broken")?.evidence).toContainEqual(
      expect.objectContaining({ edgeId: "broken-canonical", targetStatus: 404 }),
    );
  });
});
