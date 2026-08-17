import { describe, expect, test } from "bun:test";
import { buildRuleCatalog } from "../../packages/seo-audit/src/domain/findings/build-rule-catalog.ts";
import { builtInRules } from "../../packages/seo-audit/src/domain/findings/built-in-rules.ts";
import { RuleCatalogEntrySchema } from "../../packages/seo-audit/src/domain/findings/rule-catalog.schema.ts";

describe("rule catalog", () => {
  test("documents every built-in rule in deterministic order", () => {
    const catalog = buildRuleCatalog(builtInRules);
    expect(catalog.length).toBeGreaterThanOrEqual(41);
    expect(catalog.map((entry) => entry.metadata.id)).toEqual([...catalog.map((entry) => entry.metadata.id)].sort());
    const brokenLinks = catalog.find((entry) => entry.metadata.id === "links.internal_broken");
    expect(brokenLinks?.explanation.title).toBe("Broken internal links");
    expect(brokenLinks?.explanation.tags).toContain("links");
    expect(brokenLinks?.explanation.tags).toContain("crawlability");
    expect(RuleCatalogEntrySchema.array().parse(JSON.parse(JSON.stringify(catalog)))).toEqual(catalog);
  });

  test("rejects unknown fields, schema drift and duplicate rule identifiers", () => {
    const entry = buildRuleCatalog(builtInRules)[0];
    if (!entry) throw new Error("Expected a catalog entry");
    expect(RuleCatalogEntrySchema.safeParse({ ...entry, unexpected: true }).success).toBeFalse();
    expect(RuleCatalogEntrySchema.safeParse({ ...entry, schemaVersion: 2 }).success).toBeFalse();
    expect(RuleCatalogEntrySchema.safeParse({ ...entry, explanation: { ...entry.explanation, unexpected: true } }).success).toBeFalse();
    const firstRule = builtInRules[0];
    if (!firstRule) throw new Error("Expected a built-in rule");
    expect(() => buildRuleCatalog([firstRule, firstRule])).toThrow("duplicate rule id");
  });
});
