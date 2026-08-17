import type { Edge } from "./edge.schema.ts";
import type { PageNode } from "./page-node.schema.ts";

export interface NavigationTreeOptions {
  includeRenderedAnchors: boolean;
  maxNodes: number;
}

export interface NavigationTreeNode {
  page: PageNode;
  depth: number;
  parentUrl?: string;
  uniqueInlinks: number;
  uniqueOutlinks: number;
  directChildCount: number;
}

export interface NavigationTreeEdge {
  sourceUrl: string;
  targetUrl: string;
  occurrences: number;
  renderedOnly: boolean;
}

export interface NavigationTreeProjection {
  nodes: NavigationTreeNode[];
  treeEdges: NavigationTreeEdge[];
  crossEdges: NavigationTreeEdge[];
  reachablePageCount: number;
  omittedReachablePageCount: number;
  disconnectedPageCount: number;
}

interface AggregatedEdge extends NavigationTreeEdge {
  firstSequence: number;
}

/**
 * Builds a deterministic, rooted view over the observed HTML anchor graph.
 * The result is a projection: every reachable URL has one display parent,
 * while every additional observed relationship remains available as a cross-link.
 */
export function buildNavigationTree(seed: string, pages: PageNode[], edges: Edge[], options: NavigationTreeOptions): NavigationTreeProjection {
  const eligiblePages = pages.filter((page) => page.internal && (page.url === seed || page.contentType?.toLowerCase().includes("html") === true));
  const pageByUrl = new Map(eligiblePages.map((page) => [page.url, page]));
  const pairs = aggregateNavigationEdges(pageByUrl, edges, options.includeRenderedAnchors);
  const adjacency = new Map<string, AggregatedEdge[]>();
  const incoming = new Map<string, AggregatedEdge[]>();

  for (const edge of pairs.values()) {
    append(adjacency, edge.sourceUrl, edge);
    append(incoming, edge.targetUrl, edge);
  }

  const depths = computeDepths(seed, adjacency);
  const reachable = eligiblePages
    .filter((page) => depths.has(page.url))
    .sort((left, right) => {
      const depthDifference = depths.get(left.url)! - depths.get(right.url)!;
      if (depthDifference !== 0) return depthDifference;
      const inlinkDifference = (incoming.get(right.url)?.length ?? 0) - (incoming.get(left.url)?.length ?? 0);
      return inlinkDifference || left.url.localeCompare(right.url);
    });
  const selectedPages = reachable.slice(0, Math.max(1, options.maxNodes));
  const selectedUrls = new Set(selectedPages.map((page) => page.url));
  const parentByUrl = chooseParents(seed, selectedPages, selectedUrls, depths, incoming);
  const childCounts = new Map<string, number>();
  for (const parent of parentByUrl.values()) childCounts.set(parent, (childCounts.get(parent) ?? 0) + 1);

  const treePairKeys = new Set<string>();
  const treeEdges: NavigationTreeEdge[] = [];
  for (const [targetUrl, sourceUrl] of parentByUrl) {
    const pair = pairs.get(pairKey(sourceUrl, targetUrl));
    if (!pair) continue;
    treePairKeys.add(pairKey(sourceUrl, targetUrl));
    treeEdges.push(toNavigationTreeEdge(pair));
  }

  const crossEdges = [...pairs.values()]
    .filter(
      (edge) =>
        selectedUrls.has(edge.sourceUrl) &&
        selectedUrls.has(edge.targetUrl) &&
        edge.sourceUrl !== edge.targetUrl &&
        !treePairKeys.has(pairKey(edge.sourceUrl, edge.targetUrl)),
    )
    .sort(compareEdges)
    .map(toNavigationTreeEdge);

  return {
    nodes: selectedPages.map((page) => ({
      page,
      depth: depths.get(page.url)!,
      ...(parentByUrl.has(page.url) ? { parentUrl: parentByUrl.get(page.url)! } : {}),
      uniqueInlinks: incoming.get(page.url)?.length ?? 0,
      uniqueOutlinks: adjacency.get(page.url)?.length ?? 0,
      directChildCount: childCounts.get(page.url) ?? 0,
    })),
    treeEdges: treeEdges.sort(compareEdges),
    crossEdges,
    reachablePageCount: reachable.length,
    omittedReachablePageCount: Math.max(0, reachable.length - selectedPages.length),
    disconnectedPageCount: eligiblePages.length - reachable.length,
  };
}

function aggregateNavigationEdges(pageByUrl: Map<string, PageNode>, edges: Edge[], includeRenderedAnchors: boolean): Map<string, AggregatedEdge> {
  const pairs = new Map<string, AggregatedEdge>();
  for (const edge of edges) {
    const allowedKind = edge.kind === "anchor" || (includeRenderedAnchors && edge.kind === "rendered-anchor");
    if (!allowedKind || !edge.internal || !pageByUrl.has(edge.sourceUrl) || !pageByUrl.has(edge.targetUrl)) continue;
    const key = pairKey(edge.sourceUrl, edge.targetUrl);
    const existing = pairs.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (edge.kind === "anchor") existing.renderedOnly = false;
      existing.firstSequence = Math.min(existing.firstSequence, edge.sequence);
      continue;
    }
    pairs.set(key, {
      sourceUrl: edge.sourceUrl,
      targetUrl: edge.targetUrl,
      occurrences: 1,
      renderedOnly: edge.kind === "rendered-anchor",
      firstSequence: edge.sequence,
    });
  }
  return pairs;
}

function computeDepths(seed: string, adjacency: Map<string, AggregatedEdge[]>): Map<string, number> {
  const depths = new Map([[seed, 0]]);
  const queue = [seed];
  while (queue.length > 0) {
    const source = queue.shift()!;
    const nextDepth = depths.get(source)! + 1;
    const targets = [...(adjacency.get(source) ?? [])].sort(compareEdges);
    for (const edge of targets) {
      if (depths.has(edge.targetUrl)) continue;
      depths.set(edge.targetUrl, nextDepth);
      queue.push(edge.targetUrl);
    }
  }
  return depths;
}

function chooseParents(
  seed: string,
  pages: PageNode[],
  selectedUrls: Set<string>,
  depths: Map<string, number>,
  incoming: Map<string, AggregatedEdge[]>,
): Map<string, string> {
  const parents = new Map<string, string>();
  for (const page of pages) {
    if (page.url === seed) continue;
    const pageDepth = depths.get(page.url);
    if (pageDepth === undefined) continue;
    const candidates = (incoming.get(page.url) ?? [])
      .filter((edge) => selectedUrls.has(edge.sourceUrl) && depths.get(edge.sourceUrl) === pageDepth - 1)
      .sort((left, right) => {
        const affinityDifference = pathAffinity(right.sourceUrl, page.url) - pathAffinity(left.sourceUrl, page.url);
        return affinityDifference || left.firstSequence - right.firstSequence || left.sourceUrl.localeCompare(right.sourceUrl);
      });
    const parent = candidates[0];
    if (parent) parents.set(page.url, parent.sourceUrl);
  }
  return parents;
}

function pathAffinity(sourceUrl: string, targetUrl: string): number {
  const source = new URL(sourceUrl);
  const target = new URL(targetUrl);
  const sourceSegments = source.pathname.split("/").filter(Boolean);
  const targetSegments = target.pathname.split("/").filter(Boolean);
  let shared = 0;
  while (shared < sourceSegments.length && sourceSegments[shared] === targetSegments[shared]) shared += 1;
  const directDirectoryParent = sourceSegments.length + 1 === targetSegments.length && shared === sourceSegments.length;
  return shared * 10 + (directDirectoryParent ? 100 : 0);
}

function append(map: Map<string, AggregatedEdge[]>, key: string, edge: AggregatedEdge): void {
  const values = map.get(key) ?? [];
  values.push(edge);
  map.set(key, values);
}

function pairKey(sourceUrl: string, targetUrl: string): string {
  return `${sourceUrl}\n${targetUrl}`;
}

function compareEdges(left: NavigationTreeEdge, right: NavigationTreeEdge): number {
  return left.sourceUrl.localeCompare(right.sourceUrl) || left.targetUrl.localeCompare(right.targetUrl);
}

function toNavigationTreeEdge(edge: AggregatedEdge): NavigationTreeEdge {
  return {
    sourceUrl: edge.sourceUrl,
    targetUrl: edge.targetUrl,
    occurrences: edge.occurrences,
    renderedOnly: edge.renderedOnly,
  };
}
