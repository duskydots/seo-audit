import { z } from "zod";

export const UrlRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    url: z.url(),
    key: z.url(),
    origin: z.string().min(1),
    internal: z.boolean(),
  })
  .strict();

export type UrlRecord = z.infer<typeof UrlRecordSchema>;
