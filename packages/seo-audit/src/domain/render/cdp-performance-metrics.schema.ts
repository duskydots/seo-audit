import { z } from "zod";

export const CdpPerformanceMetricsSchema = z
  .object({
    metrics: z.array(z.object({ name: z.string().min(1), value: z.number() }).strict()),
  })
  .strict();

export type CdpPerformanceMetrics = z.infer<typeof CdpPerformanceMetricsSchema>;
