import type { RuleContext } from "../rule.schema.ts";

export function successfulHtmlPages(context: RuleContext) {
  return context.pages.filter((page) => page.internal && page.contentType?.includes("html") && (page.status ?? 0) >= 200 && (page.status ?? 0) < 300);
}
