import { buildNavigationTree, type NavigationTreeNode, type NavigationTreeProjection, REPORT_PRESENTATION_LIMITS } from "@duskydots/seo-audit/reporting";
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge as FlowEdge,
  type Node as FlowNode,
  MarkerType,
  MiniMap,
  type NodeMouseHandler,
  Panel,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  useNodesState,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useAudit } from "../audit-data.tsx";

const MAX_NODES = REPORT_PRESENTATION_LIMITS.hierarchyNodes;
const MAX_CROSS_EDGES = REPORT_PRESENTATION_LIMITS.hierarchyCrossLinks;
const NODE_WIDTH = 238;
const LEVEL_GAP = 330;
const ROW_GAP = 76;

export function GraphPage() {
  const { summary, pages, edges } = useAudit();
  const [includeRenderedAnchors, setIncludeRenderedAnchors] = useState(false);
  const [showCrossLinks, setShowCrossLinks] = useState(false);
  const projection = useMemo(
    () =>
      buildNavigationTree(summary.site, pages, edges, {
        includeRenderedAnchors,
        maxNodes: MAX_NODES,
      }),
    [summary.site, pages, edges, includeRenderedAnchors],
  );
  const graph = useMemo(() => buildDisplayGraph(summary.site, projection), [summary.site, projection]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [selectedId, setSelectedId] = useState<string>();
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const selected = graph.nodeById.get(selectedId ?? "");
  const displayedCrossEdges = graph.crossEdges.slice(0, MAX_CROSS_EDGES);
  const visibleEdges = showCrossLinks ? [...graph.treeEdges, ...displayedCrossEdges] : graph.treeEdges;

  useEffect(() => {
    setNodes(graph.nodes);
    setSelectedId(undefined);
  }, [graph.nodes, setNodes]);

  const onNodeClick: NodeMouseHandler = (_, node) => setSelectedId(node.id);
  const focusBranch = () => {
    if (!selected || !flow) return;
    const urls = new Set([
      selected.page.url,
      ...(selected.parentUrl ? [selected.parentUrl] : []),
      ...projection.nodes.filter((node) => node.parentUrl === selected.page.url).map((node) => node.page.url),
    ]);
    const focusNodes = projection.nodes.filter((node) => urls.has(node.page.url)).map((node) => ({ id: node.page.id }));
    void flow.fitView({ nodes: focusNodes, padding: 0.35, maxZoom: 1.3, duration: 350 });
  };

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Observed HTML connectivity</span>
          <h1>Site hierarchy</h1>
          <p>
            Wild Kiwi is the root. Solid arrows form a deterministic shortest-click tree: its direct links are level 1, their newly reached links are level 2,
            and so on. The sitemap is not treated as navigation.
          </p>
        </div>
      </header>
      <section className="panel graph-panel">
        <div className="graph-canvas">
          <ReactFlow
            nodes={nodes}
            edges={visibleEdges}
            onInit={setFlow}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedId(undefined)}
            nodesConnectable={false}
            nodesDraggable
            elementsSelectable
            elevateEdgesOnSelect
            onlyRenderVisibleElements
            defaultViewport={{ x: 64, y: 350, zoom: 0.82 }}
            minZoom={0.04}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            aria-label="Internal page hierarchy and connectivity graph"
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cdd9d4" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => (node.className === "flow-node-error" ? "#df544a" : node.className === "flow-node-seed" ? "#168150" : "#49b981")}
              maskColor="rgba(12, 23, 21, 0.08)"
            />
            <Controls showInteractive={false} />
            <Panel position="top-left" className="flow-toolbar">
              <strong>Link hierarchy</strong>
              <label>
                <input type="checkbox" checked={showCrossLinks} onChange={(event) => setShowCrossLinks(event.target.checked)} /> Show cross-links
              </label>
              <label>
                <input type="checkbox" checked={includeRenderedAnchors} onChange={(event) => setIncludeRenderedAnchors(event.target.checked)} /> Include JS-only
                links
              </label>
              <small>
                {projection.treeEdges.length} hierarchy links · {projection.crossEdges.length} cross-links
                {showCrossLinks && projection.crossEdges.length > MAX_CROSS_EDGES ? ` · strongest ${MAX_CROSS_EDGES} shown` : ""}
              </small>
            </Panel>
            {selected && (
              <Panel position="top-right" className="flow-detail">
                <button type="button" aria-label="Close page details" onClick={() => setSelectedId(undefined)}>
                  ×
                </button>
                <span className="eyebrow">Page node</span>
                <strong>{selected.page.title ?? pathLabel(selected.page.url)}</strong>
                <a href={selected.page.url} target="_blank" rel="noreferrer">
                  {selected.page.url}
                </a>
                <dl>
                  <dt>Status</dt>
                  <dd>{selected.page.status ?? selected.page.state}</dd>
                  <dt>Click depth</dt>
                  <dd>{selected.depth}</dd>
                  <dt>Direct children</dt>
                  <dd>{selected.directChildCount}</dd>
                  <dt>Unique inlinks</dt>
                  <dd>{selected.uniqueInlinks}</dd>
                  <dt>Unique outlinks</dt>
                  <dd>{selected.uniqueOutlinks}</dd>
                  <dt>Words</dt>
                  <dd>{selected.page.wordCount ?? "—"}</dd>
                </dl>
                <button type="button" className="flow-focus" onClick={focusBranch}>
                  Focus parent + children
                </button>
              </Panel>
            )}
          </ReactFlow>
        </div>
        <div className="graph-legend">
          <span>
            <i className="dot root" />
            Wild Kiwi root
          </span>
          <span>
            <i className="dot normal" />
            Internal HTML page
          </span>
          <span>
            <i className="dot error" />
            Error
          </span>
          <span>
            <i className="line tree" />
            Hierarchy link
          </span>
          <span>
            <i className="line cross" />
            Additional direct link
          </span>
          {projection.omittedReachablePageCount > 0 && <span>{projection.omittedReachablePageCount} reachable pages omitted from this bounded view</span>}
          {projection.disconnectedPageCount > 0 && <span>{projection.disconnectedPageCount} pages not reachable through this projection</span>}
        </div>
      </section>
    </>
  );
}

function buildDisplayGraph(
  seed: string,
  projection: NavigationTreeProjection,
): {
  nodes: FlowNode[];
  treeEdges: FlowEdge[];
  crossEdges: FlowEdge[];
  nodeById: Map<string, NavigationTreeNode>;
} {
  const idByUrl = new Map(projection.nodes.map((node) => [node.page.url, node.page.id]));
  const children = new Map<string, NavigationTreeNode[]>();
  for (const node of projection.nodes) {
    if (!node.parentUrl) continue;
    const siblings = children.get(node.parentUrl) ?? [];
    siblings.push(node);
    children.set(node.parentUrl, siblings);
  }
  for (const siblings of children.values()) siblings.sort(compareTreeNodes);

  const positions = layoutTree(seed, children);
  const flowNodes: FlowNode[] = projection.nodes.map((node) => ({
    id: node.page.id,
    position: positions.get(node.page.url) ?? { x: node.depth * LEVEL_GAP, y: 0 },
    data: { label: <PageNodeLabel node={node} /> },
    className: node.page.status && node.page.status >= 400 ? "flow-node-error" : node.depth === 0 ? "flow-node-seed" : "flow-node-page",
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    ariaLabel: `${node.page.url}, status ${node.page.status ?? node.page.state}, click depth ${node.depth}, ${node.directChildCount} direct children, ${node.uniqueInlinks} unique inlinks`,
    style: { width: NODE_WIDTH },
  }));

  const treeEdges: FlowEdge[] = projection.treeEdges.flatMap((edge) => {
    const source = idByUrl.get(edge.sourceUrl);
    const target = idByUrl.get(edge.targetUrl);
    if (!source || !target) return [];
    return [
      {
        id: `tree:${source}:${target}`,
        source,
        target,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 11, height: 11, color: edge.renderedOnly ? "#6576c7" : "#559879" },
        style: { stroke: edge.renderedOnly ? "#6576c7" : "#559879", strokeWidth: edge.occurrences > 1 ? 1.8 : 1.3 },
        ariaLabel: `${edge.occurrences} observed ${edge.renderedOnly ? "rendered " : ""}link${edge.occurrences === 1 ? "" : "s"}`,
      },
    ];
  });
  const crossEdges: FlowEdge[] = [...projection.crossEdges]
    .sort(
      (left, right) => right.occurrences - left.occurrences || left.sourceUrl.localeCompare(right.sourceUrl) || left.targetUrl.localeCompare(right.targetUrl),
    )
    .flatMap((edge) => {
      const source = idByUrl.get(edge.sourceUrl);
      const target = idByUrl.get(edge.targetUrl);
      if (!source || !target) return [];
      return [
        {
          id: `cross:${source}:${target}`,
          source,
          target,
          type: "default",
          markerEnd: { type: MarkerType.ArrowClosed, width: 8, height: 8, color: "#9aa8a3" },
          style: { stroke: "#9aa8a3", strokeWidth: 0.8, strokeDasharray: "4 5", opacity: 0.42 },
          ariaLabel: `${edge.occurrences} additional direct link${edge.occurrences === 1 ? "" : "s"}`,
        },
      ];
    });

  return {
    nodes: flowNodes,
    treeEdges,
    crossEdges,
    nodeById: new Map(projection.nodes.map((node) => [node.page.id, node])),
  };
}

function layoutTree(seed: string, children: Map<string, NavigationTreeNode[]>): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  let nextLeafRow = 0;

  const place = (url: string, depth: number): number => {
    const directChildren = children.get(url) ?? [];
    let y: number;
    if (directChildren.length === 0) {
      y = nextLeafRow * ROW_GAP;
      nextLeafRow += 1;
    } else {
      const childYs = directChildren.map((child) => place(child.page.url, depth + 1));
      y = (childYs[0]! + childYs[childYs.length - 1]!) / 2;
    }
    positions.set(url, { x: depth * LEVEL_GAP, y });
    return y;
  };

  place(seed, 0);
  const rootY = positions.get(seed)?.y ?? 0;
  for (const [url, position] of positions) positions.set(url, { x: position.x, y: position.y - rootY });
  return positions;
}

function compareTreeNodes(left: NavigationTreeNode, right: NavigationTreeNode): number {
  const leftSection = firstPathSegment(left.page.url);
  const rightSection = firstPathSegment(right.page.url);
  return (
    leftSection.localeCompare(rightSection) ||
    right.directChildCount - left.directChildCount ||
    right.uniqueInlinks - left.uniqueInlinks ||
    left.page.url.localeCompare(right.page.url)
  );
}

function firstPathSegment(url: string): string {
  return new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
}

function PageNodeLabel({ node }: { node: NavigationTreeNode }) {
  const page = node.page;
  return (
    <div className="flow-node-label">
      <span className={`flow-status status-${String(page.status ?? 0)[0]}`}>{page.status ?? page.state}</span>
      <div>
        <strong>{page.title ?? pathLabel(page.url)}</strong>
        <small>{pathLabel(page.url)}</small>
      </div>
      <span className="flow-node-counts">
        <b>{node.directChildCount}</b>
        <small>children</small>
      </span>
    </div>
  );
}

function pathLabel(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname === "/" ? parsed.host : `${parsed.pathname}${parsed.search}`;
}
