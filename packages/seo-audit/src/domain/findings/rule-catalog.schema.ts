import { z } from "zod";
import { RuleExplanationSchema, RuleMetadataSchema } from "./rule.schema.ts";

export const RuleCatalogEntrySchema = z
  .object({
    schemaVersion: z.literal(1),
    metadata: RuleMetadataSchema,
    explanation: RuleExplanationSchema,
  })
  .strict();

export type RuleCatalogEntry = z.infer<typeof RuleCatalogEntrySchema>;
