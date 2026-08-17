import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { builtInRules } from "../../packages/seo-audit/src/domain/findings/built-in-rules.ts";
import type { RuleDefinition } from "../../packages/seo-audit/src/domain/findings/rule.schema.ts";

const rulesDirectory = new URL("../../packages/seo-audit/src/domain/findings/rules/", import.meta.url).pathname;

describe("rule file layout", () => {
  test("keeps exactly one registered rule definition in every rule file", async () => {
    const entries = await readdir(rulesDirectory, { recursive: true });
    const ruleFiles = entries.filter((entry) => entry.endsWith(".rule.ts")).sort();
    const definitions = await Promise.all(
      ruleFiles.map(async (entry) => {
        const module = (await import(pathToFileURL(join(rulesDirectory, entry)).href)) as Record<string, unknown>;
        const exportedRules = Object.values(module).filter(isRuleDefinition);
        expect(exportedRules).toHaveLength(1);
        const definition = exportedRules[0];
        if (!definition) throw new Error(`Expected one rule definition in ${entry}`);
        return definition;
      }),
    );
    expect(ruleFiles).toHaveLength(builtInRules.length);
    expect(definitions.map((rule) => rule.metadata.id).sort()).toEqual(builtInRules.map((rule) => rule.metadata.id).sort());
  });
});

function isRuleDefinition(value: unknown): value is RuleDefinition {
  return typeof value === "object" && value !== null && "metadata" in value && "explanation" in value && "evaluate" in value;
}
