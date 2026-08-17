import { describe, expect, test } from "bun:test";
import { createFinding } from "../../packages/seo-audit/src/domain/findings/create-finding.ts";
import { evaluateRules } from "../../packages/seo-audit/src/domain/findings/evaluate-rules.ts";
import { type RuleDefinition, RuleExplanationSchema, RuleMetadataSchema } from "../../packages/seo-audit/src/domain/findings/rule.schema.ts";

const metadata = RuleMetadataSchema.parse({
  id: "custom.homepage_present",
  version: "1.0.0",
  category: "content",
  defaultSeverity: "high",
  findingType: "issue",
  confidence: "confirmed",
  requires: ["content-markdown"],
  description: "Example custom rule.",
});

const customRule: RuleDefinition = {
  metadata,
  explanation: RuleExplanationSchema.parse({
    title: "Custom finding",
    whyItMatters: "Custom summary.",
    trigger: "The custom content capability reports the condition.",
    remediation: "Custom fix.",
    evidence: ["Custom content observation."],
    tags: ["content"],
  }),
  evaluate() {
    return [
      createFinding(metadata, {
        title: "Custom finding",
        summary: "Custom summary.",
        remediation: "Custom fix.",
        affectedUrls: ["https://example.com/"],
        sourceUrls: [],
      }),
    ];
  },
};

describe("rule engine", () => {
  test("marks missing-capability rules as not evaluated", () => {
    const run = evaluateRules({ pages: [], edges: [], capabilities: ["page-summary"], rules: [customRule] });
    expect(run.findings).toHaveLength(0);
    expect(run.evaluations[0]).toEqual({
      ruleId: metadata.id,
      ruleVersion: metadata.version,
      status: "not_evaluated",
      findingCount: 0,
      missingCapabilities: ["content-markdown"],
    });
  });

  test("runs externally supplied rules when capabilities are available", () => {
    const run = evaluateRules({ pages: [], edges: [], capabilities: ["content-markdown"], rules: [customRule] });
    expect(run.findings[0]?.ruleId).toBe("custom.homepage_present");
    expect(run.evaluations[0]?.status).toBe("failed");
  });

  test("rejects duplicate rule identifiers", () => {
    expect(() => evaluateRules({ pages: [], edges: [], capabilities: ["content-markdown"], rules: [customRule, customRule] })).toThrow("duplicate rule id");
  });
});
