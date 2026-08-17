import type { z } from "zod";
import type { Edge } from "../graph/edge.schema.ts";
import type { PageNode } from "../graph/page-node.schema.ts";
import type { RenderAudit } from "../render/render-audit.schema.ts";
import { FindingSchema, type SeveritySchema } from "./finding.schema.ts";
import { type RuleCapability, type RuleDefinition, RuleEvaluationSchema, type RuleRun } from "./rule.schema.ts";

type Severity = z.infer<typeof SeveritySchema>;

export function evaluateRules(input: {
  pages: readonly PageNode[];
  edges: readonly Edge[];
  renderAudits?: readonly RenderAudit[];
  capabilities: Iterable<RuleCapability>;
  rules: readonly RuleDefinition[];
}): RuleRun {
  const capabilities = new Set(input.capabilities);
  const context = Object.freeze({ pages: input.pages, edges: input.edges, renderAudits: input.renderAudits ?? [], capabilities });
  const findings = [];
  const evaluations = [];
  const seenRuleIds = new Set<string>();

  for (const rule of input.rules) {
    if (seenRuleIds.has(rule.metadata.id)) throw new Error(`Rule invariant: duplicate rule id ${rule.metadata.id}`);
    seenRuleIds.add(rule.metadata.id);
    const missingCapabilities = rule.metadata.requires.filter((capability) => !capabilities.has(capability));
    if (missingCapabilities.length > 0) {
      evaluations.push(
        RuleEvaluationSchema.parse({
          ruleId: rule.metadata.id,
          ruleVersion: rule.metadata.version,
          status: "not_evaluated",
          findingCount: 0,
          missingCapabilities,
        }),
      );
      continue;
    }
    const ruleFindings = [...rule.evaluate(context)].map((finding) => FindingSchema.parse(finding));
    for (const finding of ruleFindings) {
      if (finding.ruleId !== rule.metadata.id || finding.ruleVersion !== rule.metadata.version)
        throw new Error(`Rule invariant: ${rule.metadata.id} emitted mismatched finding metadata`);
      findings.push(finding);
    }
    evaluations.push(
      RuleEvaluationSchema.parse({
        ruleId: rule.metadata.id,
        ruleVersion: rule.metadata.version,
        status: ruleFindings.length > 0 ? "failed" : "passed",
        findingCount: ruleFindings.length,
        missingCapabilities: [],
      }),
    );
  }

  const weight: Record<Severity, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  findings.sort((a, b) => weight[b.severity] - weight[a.severity] || b.count - a.count || a.ruleId.localeCompare(b.ruleId));
  return Object.freeze({ findings, evaluations });
}
