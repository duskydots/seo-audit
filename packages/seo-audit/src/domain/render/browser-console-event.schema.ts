import { z } from "zod";

export const BrowserConsoleEventSchema = z
  .object({
    sequence: z.number().int().nonnegative(),
    type: z.string().min(1),
    text: z.string(),
    timestampMs: z.number().nonnegative(),
    location: z
      .object({
        url: z.string(),
        lineNumber: z.number().int().nonnegative(),
        columnNumber: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type BrowserConsoleEvent = z.infer<typeof BrowserConsoleEventSchema>;
