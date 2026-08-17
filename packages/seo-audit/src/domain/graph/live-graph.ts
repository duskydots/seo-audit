import { stableId } from "../../shared/ids.ts";
import type { Edge, EdgeKind } from "./edge.schema.ts";
import type { CrawlNodeState, PageNode } from "./page-node.schema.ts";

export type DiscoveryKind = "seed" | "anchor" | "sitemap" | "canonical" | "redirect" | "rendered-anchor";

export class LiveGraph {
  readonly #nodes = new Map<string, PageNode>();
  readonly #edges: Edge[] = [];
  #edgeSequence = 0;

  discover(url: string, internal: boolean, depth: number, via: DiscoveryKind): PageNode {
    const existing = this.#nodes.get(url);
    if (existing) {
      existing.discoveryCount += 1;
      existing.depth = Math.min(existing.depth, depth);
      if (!existing.discoveredVia.includes(via)) existing.discoveredVia.push(via);
      return existing;
    }

    const node: PageNode = {
      schemaVersion: 1,
      id: stableId("url", url),
      url,
      key: url,
      internal,
      state: "discovered",
      depth,
      discoveryCount: 1,
      discoveredVia: [via],
      redirectChain: [],
      robots: [],
      headings: [],
    };
    this.#nodes.set(url, node);
    return node;
  }

  node(url: string): PageNode | undefined {
    return this.#nodes.get(url);
  }

  transition(url: string, state: CrawlNodeState): void {
    const node = this.#nodes.get(url);
    if (!node) throw new Error(`Graph invariant: missing node ${url}`);
    node.state = state;
  }

  addEdge(input: { sourceId: string; sourceUrl: string; targetUrl: string; kind: EdgeKind; internal: boolean; text?: string; rel?: string[] }): Edge {
    const target = this.#nodes.get(input.targetUrl);
    const sequence = this.#edgeSequence++;
    const edge: Edge = {
      schemaVersion: 1,
      id: stableId("edge", `${input.sourceId}|${input.kind}|${input.targetUrl}|${sequence}`),
      sourceId: input.sourceId,
      sourceUrl: input.sourceUrl,
      ...(target ? { targetId: target.id } : {}),
      targetUrl: input.targetUrl,
      kind: input.kind,
      internal: input.internal,
      ...(input.text !== undefined ? { text: input.text } : {}),
      rel: input.rel ?? [],
      nofollow: (input.rel ?? []).includes("nofollow"),
      sequence,
    };
    this.#edges.push(edge);
    return edge;
  }

  freeze(): { pages: PageNode[]; edges: Edge[] } {
    const pages = [...this.#nodes.values()].map((node) => structuredClone(node)).sort((a, b) => a.url.localeCompare(b.url));
    const edges = this.#edges
      .map((edge) => {
        const target = this.#nodes.get(edge.targetUrl);
        return structuredClone(target && !edge.targetId ? { ...edge, targetId: target.id } : edge);
      })
      .sort((a, b) => a.sequence - b.sequence);
    return Object.freeze({ pages: Object.freeze(pages) as PageNode[], edges: Object.freeze(edges) as Edge[] });
  }
}
