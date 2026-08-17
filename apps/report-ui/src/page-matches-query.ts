import type { PageNode } from "@duskydots/seo-audit/reporting";

export function pageMatchesQuery(page: Pick<PageNode, "title" | "url">, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  if (normalizedQuery.length === 0) return true;

  return `${page.url}\n${page.title ?? ""}`.toLocaleLowerCase("en").includes(normalizedQuery);
}
