import { buildNavigationTree } from "../graph/navigation-tree.ts";
import type { AuditBundle } from "./audit.schema.ts";
import { markdownValue } from "./markdown-escape.ts";
import { REPORT_PRESENTATION_LIMITS } from "./presentation-limits.ts";

export function renderStructureMarkdown(bundle: AuditBundle): string[] {
  const hierarchy = buildNavigationTree(bundle.summary.site, bundle.pages, bundle.edges, {
    includeRenderedAnchors: false,
    maxNodes: REPORT_PRESENTATION_LIMITS.hierarchyNodes,
  });
  const crossLinks = [...hierarchy.crossEdges]
    .sort(
      (left, right) => right.occurrences - left.occurrences || left.sourceUrl.localeCompare(right.sourceUrl) || left.targetUrl.localeCompare(right.targetUrl),
    )
    .slice(0, REPORT_PRESENTATION_LIMITS.hierarchyCrossLinks);
  return [
    "## Site hierarchy and connectivity",
    "",
    "This is the Markdown equivalent of the React Flow view. The audited seed is the root, hierarchy links form a deterministic shortest-click tree, and additional direct links remain separate cross-links. Sitemap relationships are excluded.",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Reachable internal HTML pages | ${hierarchy.reachablePageCount} |`,
    `| Hierarchy nodes shown | ${hierarchy.nodes.length} |`,
    `| Reachable pages omitted by UI/report bound | ${hierarchy.omittedReachablePageCount} |`,
    `| Disconnected internal HTML pages | ${hierarchy.disconnectedPageCount} |`,
    `| Hierarchy links shown | ${hierarchy.treeEdges.length} |`,
    `| Additional cross-links in bounded projection | ${hierarchy.crossEdges.length} |`,
    "",
    "### Hierarchy nodes",
    "",
    "| Depth | Page | Parent | Status | Direct children | Unique inlinks | Unique outlinks | Words |",
    "|---:|---|---|---|---:|---:|---:|---:|",
    ...hierarchy.nodes.map(
      (node) =>
        `| ${node.depth} | ${markdownValue(node.page.url)} | ${markdownValue(node.parentUrl)} | ${markdownValue(node.page.status ?? node.page.state)} | ${node.directChildCount} | ${node.uniqueInlinks} | ${node.uniqueOutlinks} | ${markdownValue(node.page.wordCount)} |`,
    ),
    "",
    "### Hierarchy links",
    "",
    "| Source | Child | Occurrences |",
    "|---|---|---:|",
    ...hierarchy.treeEdges.map((edge) => `| ${markdownValue(edge.sourceUrl)} | ${markdownValue(edge.targetUrl)} | ${edge.occurrences} |`),
    "",
    "### Additional cross-links",
    "",
    `The UI can overlay up to ${REPORT_PRESENTATION_LIMITS.hierarchyCrossLinks} strongest cross-links. The same bounded overlay is listed here; evidence/edges.json/jsonl retain every occurrence.`,
    "",
    "| Source | Target | Occurrences |",
    "|---|---|---:|",
    ...crossLinks.map((edge) => `| ${markdownValue(edge.sourceUrl)} | ${markdownValue(edge.targetUrl)} | ${edge.occurrences} |`),
    ...(hierarchy.crossEdges.length > crossLinks.length
      ? [`| …${hierarchy.crossEdges.length - crossLinks.length} additional cross-links omitted by the UI/report bound | | |`]
      : []),
    "",
  ];
}
