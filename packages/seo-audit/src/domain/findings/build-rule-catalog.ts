import type { RuleDefinition } from "./rule.schema.ts";
import { type RuleCatalogEntry, RuleCatalogEntrySchema } from "./rule-catalog.schema.ts";

export function buildRuleCatalog(rules: readonly RuleDefinition[]): RuleCatalogEntry[] {
  const seen = new Set<string>();
  return [...rules]
    .sort((left, right) => left.metadata.id.localeCompare(right.metadata.id))
    .map((rule) => {
      if (seen.has(rule.metadata.id)) throw new Error(`Rule catalog invariant: duplicate rule id ${rule.metadata.id}`);
      seen.add(rule.metadata.id);
      return RuleCatalogEntrySchema.parse({ schemaVersion: 1, metadata: rule.metadata, explanation: rule.explanation });
    });
}
