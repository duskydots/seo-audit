import { z } from "zod";

export const BrowserLongTaskSchema = z
  .object({
    sequence: z.number().int().nonnegative(),
    startTimeMs: z.number().nonnegative(),
    durationMs: z.number().nonnegative(),
    name: z.string().min(1),
  })
  .strict();

export type BrowserLongTask = z.infer<typeof BrowserLongTaskSchema>;
