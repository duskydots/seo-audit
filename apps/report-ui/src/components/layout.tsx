import { Link, Outlet } from "@tanstack/react-router";
import { useAuditState } from "../audit-data.tsx";
import { hostLabel } from "../format.ts";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/issues", label: "Issues" },
  { to: "/pages", label: "Pages" },
  { to: "/graph", label: "Site graph" },
] as const;

export function Layout() {
  const state = useAuditState();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◉</span>
          <span>SiteLens</span>
        </div>
        <div className="site-chip">
          <span className="eyebrow">Current audit</span>
          <strong>{state.status === "ready" ? hostLabel(state.data.summary.site) : "Loading…"}</strong>
          {state.status === "ready" && (
            <small>
              {state.data.summary.status} · {new Date(state.data.summary.completedAt).toLocaleString()}
            </small>
          )}
        </div>
        <nav>
          {nav.map((item) => (
            <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} className="nav-link" activeProps={{ className: "nav-link active" }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          Deterministic technical audit
          <br />
          <span>Schema v1</span>
        </div>
      </aside>
      <main className="workspace">
        {state.status === "loading" && <div className="center-state">Loading validated audit data…</div>}
        {state.status === "error" && (
          <div className="center-state error">
            <strong>Could not read this audit</strong>
            <span>{state.message}</span>
          </div>
        )}
        {state.status === "ready" && <Outlet />}
      </main>
    </div>
  );
}
