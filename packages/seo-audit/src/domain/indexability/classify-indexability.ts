import type { PageNode } from "../graph/page-node.schema.ts";

export type Indexability = { indexable: boolean; reason: string };

export function classifyIndexability(page: PageNode): Indexability {
  if (page.state === "blocked") return { indexable: false, reason: "robots-blocked" };
  if (page.status === undefined) return { indexable: false, reason: "not-fetched" };
  if (page.status >= 300 && page.status < 400) return { indexable: false, reason: "redirect" };
  if (page.status < 200 || page.status >= 300) return { indexable: false, reason: `status-${page.status}` };
  if (page.robots.includes("noindex") || page.robots.includes("none")) return { indexable: false, reason: "noindex" };
  if (page.canonical && page.canonical !== page.finalUrl && page.canonical !== page.url) return { indexable: false, reason: "canonicalized" };
  if (!page.contentType?.includes("html")) return { indexable: false, reason: "non-html" };
  return { indexable: true, reason: "eligible" };
}
