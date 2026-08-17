import type { Edge } from "../graph/edge.schema.ts";
import type { PageNode } from "../graph/page-node.schema.ts";
import { builtInRules } from "./built-in-rules.ts";
import { evaluateRules } from "./evaluate-rules.ts";
import type { Finding } from "./finding.schema.ts";
import type { RuleCapability } from "./rule.schema.ts";

/** Compatibility entry point. New consumers should use evaluateRules for coverage metadata. */
export function evaluateFindings(pages: PageNode[], edges: Edge[]): Finding[] {
  return evaluateBuiltInRules(pages, edges).findings;
}

export function evaluateBuiltInRules(pages: PageNode[], edges: Edge[]) {
  const capabilities: RuleCapability[] = ["page-summary", "graph"];
  if (pages.some((page) => page.rendered)) capabilities.push("rendered-dom");
  return evaluateRules({ pages, edges, capabilities, rules: builtInRules });
}
