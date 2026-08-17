import type { Edge } from "./edge.schema.ts";

/** Shortest observed click depth using HTML anchors only. Sitemap evidence is excluded. */
export function computeNavigationDepths(seed: string, edges: Edge[]): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.kind !== "anchor" || !edge.internal) continue;
    const targets = adjacency.get(edge.sourceUrl) ?? new Set<string>();
    targets.add(edge.targetUrl);
    adjacency.set(edge.sourceUrl, targets);
  }
  const depths = new Map([[seed, 0]]);
  const queue = [seed];
  while (queue.length > 0) {
    const source = queue.shift()!;
    const nextDepth = depths.get(source)! + 1;
    for (const target of adjacency.get(source) ?? []) {
      if (depths.has(target)) continue;
      depths.set(target, nextDepth);
      queue.push(target);
    }
  }
  return depths;
}
