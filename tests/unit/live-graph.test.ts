import { describe, expect, test } from "bun:test";
import { EdgeSchema } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";
import { LiveGraph } from "../../packages/seo-audit/src/domain/graph/live-graph.ts";
import { PageNodeSchema } from "../../packages/seo-audit/src/domain/graph/page-node.schema.ts";

describe("LiveGraph", () => {
  test("creates one node for repeated discovery and preserves edge occurrences", () => {
    const graph = new LiveGraph();
    const source = graph.discover("https://example.com/", true, 0, "seed");
    graph.discover("https://example.com/about", true, 2, "sitemap");
    const target = graph.discover("https://example.com/about", true, 1, "anchor");
    graph.addEdge({ sourceId: source.id, sourceUrl: source.url, targetUrl: target.url, kind: "anchor", internal: true, text: "About" });
    graph.addEdge({ sourceId: source.id, sourceUrl: source.url, targetUrl: target.url, kind: "anchor", internal: true, text: "Our team" });
    const frozen = graph.freeze();
    expect(frozen.pages).toHaveLength(2);
    expect(frozen.edges).toHaveLength(2);
    expect(frozen.pages.find((page) => page.url.endsWith("/about"))?.depth).toBe(1);
    expect(frozen.pages.find((page) => page.url.endsWith("/about"))?.discoveryCount).toBe(2);
    for (const page of frozen.pages) expect(PageNodeSchema.parse(JSON.parse(JSON.stringify(page)))).toEqual(page);
    for (const edge of frozen.edges) expect(EdgeSchema.parse(JSON.parse(JSON.stringify(edge)))).toEqual(edge);
  });

  test("does not treat sitemap edges as anchor edges", () => {
    const graph = new LiveGraph();
    const target = graph.discover("https://example.com/orphan", true, 0, "sitemap");
    graph.addEdge({ sourceId: "sitemap:x", sourceUrl: "https://example.com/sitemap.xml", targetUrl: target.url, kind: "sitemap-entry", internal: true });
    expect(graph.freeze().edges.filter((edge) => edge.kind === "anchor")).toHaveLength(0);
  });
});
