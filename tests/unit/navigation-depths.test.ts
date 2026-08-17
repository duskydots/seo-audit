import { describe, expect, test } from "bun:test";
import type { Edge } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";
import { computeNavigationDepths } from "../../packages/seo-audit/src/domain/graph/navigation-depths.ts";

function edge(source: string, target: string, kind: Edge["kind"]): Edge {
  return {
    schemaVersion: 1,
    id: `${source}-${target}-${kind}`,
    sourceId: source,
    sourceUrl: source,
    targetUrl: target,
    kind,
    internal: true,
    rel: [],
    nofollow: false,
    sequence: 0,
  };
}

describe("computeNavigationDepths", () => {
  test("uses shortest anchor paths and ignores sitemap membership", () => {
    const seed = "https://example.com/";
    const depths = computeNavigationDepths(seed, [
      edge("https://example.com/sitemap.xml", "https://example.com/orphan", "sitemap-entry"),
      edge(seed, "https://example.com/a", "anchor"),
      edge("https://example.com/a", "https://example.com/b", "anchor"),
      edge(seed, "https://example.com/b", "anchor"),
    ]);
    expect(depths.get(seed)).toBe(0);
    expect(depths.get("https://example.com/b")).toBe(1);
    expect(depths.has("https://example.com/orphan")).toBeFalse();
  });
});
