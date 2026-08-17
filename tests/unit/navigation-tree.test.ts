import { describe, expect, test } from "bun:test";
import type { Edge } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";
import { buildNavigationTree } from "../../packages/seo-audit/src/domain/graph/navigation-tree.ts";
import type { PageNode } from "../../packages/seo-audit/src/domain/graph/page-node.schema.ts";

const seed = "https://example.com/";

function page(url: string): PageNode {
  return {
    schemaVersion: 1,
    id: url,
    url,
    key: url,
    internal: true,
    state: "parsed",
    depth: 0,
    discoveryCount: 1,
    discoveredVia: url === seed ? ["seed"] : ["anchor"],
    contentType: "text/html",
    redirectChain: [],
    robots: [],
    headings: [],
  };
}

function edge(sourceUrl: string, targetUrl: string, kind: Edge["kind"], sequence: number): Edge {
  return {
    schemaVersion: 1,
    id: `${sequence}`,
    sourceId: sourceUrl,
    sourceUrl,
    targetUrl,
    kind,
    internal: true,
    rel: [],
    nofollow: false,
    sequence,
  };
}

describe("buildNavigationTree", () => {
  test("keeps direct children under the seed and preserves extra relationships as cross-links", () => {
    const pages = [seed, `${seed}tours`, `${seed}guides`, `${seed}tours/south`].map(page);
    const projection = buildNavigationTree(
      seed,
      pages,
      [
        edge(seed, `${seed}tours`, "anchor", 0),
        edge(seed, `${seed}guides`, "anchor", 1),
        edge(`${seed}tours`, `${seed}tours/south`, "anchor", 2),
        edge(`${seed}guides`, `${seed}tours/south`, "anchor", 3),
        edge(`${seed}tours`, `${seed}tours/south`, "anchor", 4),
      ],
      { includeRenderedAnchors: false, maxNodes: 20 },
    );

    expect(projection.nodes.find((node) => node.page.url === `${seed}tours`)?.parentUrl).toBe(seed);
    expect(projection.nodes.find((node) => node.page.url === `${seed}tours/south`)?.parentUrl).toBe(`${seed}tours`);
    expect(projection.nodes.find((node) => node.page.url === `${seed}tours/south`)?.uniqueInlinks).toBe(2);
    expect(projection.treeEdges.find((item) => item.targetUrl === `${seed}tours/south`)?.occurrences).toBe(2);
    expect(projection.crossEdges).toContainEqual({
      sourceUrl: `${seed}guides`,
      targetUrl: `${seed}tours/south`,
      occurrences: 1,
      renderedOnly: false,
    });
  });

  test("keeps rendered-only discovery separate and ignores sitemap declarations", () => {
    const pages = [seed, `${seed}spa`, `${seed}orphan`].map(page);
    const edges = [edge(seed, `${seed}spa`, "rendered-anchor", 0), edge(`${seed}sitemap.xml`, `${seed}orphan`, "sitemap-entry", 1)];

    const raw = buildNavigationTree(seed, pages, edges, { includeRenderedAnchors: false, maxNodes: 20 });
    const rendered = buildNavigationTree(seed, pages, edges, { includeRenderedAnchors: true, maxNodes: 20 });
    expect(raw.nodes).toHaveLength(1);
    expect(raw.disconnectedPageCount).toBe(2);
    expect(rendered.nodes.map((node) => node.page.url)).toEqual([seed, `${seed}spa`]);
    expect(rendered.treeEdges[0]?.renderedOnly).toBeTrue();
  });

  test("applies the display bound in breadth-first order so selected nodes retain their ancestry", () => {
    const pages = [seed, `${seed}a`, `${seed}b`, `${seed}a/child`].map(page);
    const projection = buildNavigationTree(
      seed,
      pages,
      [edge(seed, `${seed}a`, "anchor", 0), edge(seed, `${seed}b`, "anchor", 1), edge(`${seed}a`, `${seed}a/child`, "anchor", 2)],
      { includeRenderedAnchors: false, maxNodes: 3 },
    );

    expect(projection.nodes.map((node) => node.page.url)).toEqual([seed, `${seed}a`, `${seed}b`]);
    expect(projection.omittedReachablePageCount).toBe(1);
  });
});
