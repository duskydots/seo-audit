import { type RuleExplanation, RuleExplanationSchema, type RuleMetadata } from "../rule.schema.ts";

export function ruleExplanation(
  metadata: RuleMetadata,
  title: string,
  whyItMatters: string,
  remediation: string,
  evidence: string[],
  tags: string[] = [metadata.category],
): RuleExplanation {
  return RuleExplanationSchema.parse({ title, whyItMatters, trigger: metadata.description, remediation, evidence, tags });
}
