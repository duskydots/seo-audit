import { z } from "zod";

export const AutomaticWorkerCountSchema = z.union([z.literal("auto"), z.number().int().positive()]);

export const RuntimeResourcesSchema = z
  .object({
    platform: z.string().min(1),
    architecture: z.string().min(1),
    logicalCpuCount: z.number().int().positive(),
    totalMemoryBytes: z.number().int().positive(),
    ci: z.boolean(),
    githubActions: z.boolean(),
  })
  .strict();

export const ExecutionResourceRequestSchema = z
  .object({
    fetchConcurrency: AutomaticWorkerCountSchema.default("auto"),
    renderWorkers: AutomaticWorkerCountSchema.default("auto"),
  })
  .strict();

export const ExecutionResourcePlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    resources: RuntimeResourcesSchema,
    fetchConcurrency: z.number().int().positive().max(64),
    renderWorkers: z.number().int().positive().max(8),
    estimatedRendererMemoryBytes: z.number().int().positive(),
    source: z
      .object({
        fetchConcurrency: z.enum(["automatic", "override"]),
        renderWorkers: z.enum(["automatic", "override"]),
      })
      .strict(),
  })
  .strict();

export type AutomaticWorkerCount = z.infer<typeof AutomaticWorkerCountSchema>;
export type RuntimeResources = z.infer<typeof RuntimeResourcesSchema>;
export type ExecutionResourceRequest = z.infer<typeof ExecutionResourceRequestSchema>;
export type ExecutionResourcePlan = z.infer<typeof ExecutionResourcePlanSchema>;
