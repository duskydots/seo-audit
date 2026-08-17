import { z } from "zod";

export const BrowserResourceSizesSchema = z
  .object({
    requestBodyBytes: z.number().int().nonnegative(),
    requestHeaderBytes: z.number().int().nonnegative(),
    responseBodyBytes: z.number().int().nonnegative(),
    responseHeaderBytes: z.number().int().nonnegative(),
  })
  .strict();

export const BrowserResourceObservationSchema = z
  .object({
    sequence: z.number().int().nonnegative(),
    url: z.url(),
    method: z.string().min(1),
    resourceType: z.string().min(1),
    status: z.number().int().min(0).max(599).optional(),
    mimeType: z.string().optional(),
    fromServiceWorker: z.boolean().optional(),
    durationMs: z.number().nonnegative().optional(),
    sizes: BrowserResourceSizesSchema.optional(),
    failureText: z.string().min(1).optional(),
  })
  .strict();

export type BrowserResourceObservation = z.infer<typeof BrowserResourceObservationSchema>;
