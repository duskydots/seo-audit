import { createHashHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Layout } from "./components/layout.tsx";
import { IssuesPage } from "./routes/issues.tsx";
import { OverviewPage } from "./routes/overview.tsx";
import { PagesPage } from "./routes/pages.tsx";

const GraphPage = lazy(async () => {
  const module = await import("./routes/graph.tsx");
  return { default: module.GraphPage };
});

const rootRoute = createRootRoute({ component: Layout });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: OverviewPage });
const issuesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/issues", component: IssuesPage });
const pagesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/pages", component: PagesPage });
const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/graph",
  component: () => (
    <Suspense fallback={<div className="center-state">Loading site graph…</div>}>
      <GraphPage />
    </Suspense>
  ),
});
// Preserve old report links while presenting browser evidence in the unified Pages dashboard.
const renderingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/rendering", component: PagesPage });
const routeTree = rootRoute.addChildren([indexRoute, issuesRoute, pagesRoute, graphRoute, renderingRoute]);

export const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
