import { z } from "zod";

export const MetricScoreSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    status: z.enum(["good", "needs-work", "poor"]),
  })
  .strict();

export type MetricScore = z.infer<typeof MetricScoreSchema>;
