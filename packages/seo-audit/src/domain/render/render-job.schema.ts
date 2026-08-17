import { z } from "zod";

export const RenderJobSchema = z
  .object({
    jobId: z.string().min(1),
    url: z.url(),
    userAgent: z.string().min(1),
    timeoutMs: z.number().int().positive(),
    quietWindowMs: z.number().int().positive().default(1_000),
  })
  .strict();

export type RenderJob = z.infer<typeof RenderJobSchema>;
