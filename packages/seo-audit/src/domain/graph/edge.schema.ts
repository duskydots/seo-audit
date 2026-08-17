import { z } from "zod";

export const EdgeKindSchema = z.enum(["anchor", "rendered-anchor", "sitemap-entry", "canonical", "redirect", "image", "script", "stylesheet"]);

export const EdgeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    sourceId: z.string().min(1),
    sourceUrl: z.string().min(1),
    targetId: z.string().min(1).optional(),
    targetUrl: z.url(),
    kind: EdgeKindSchema,
    internal: z.boolean(),
    text: z.string().optional(),
    rel: z.array(z.string()),
    nofollow: z.boolean(),
    sequence: z.number().int().nonnegative(),
  })
  .strict();

export type Edge = z.infer<typeof EdgeSchema>;
export type EdgeKind = z.infer<typeof EdgeKindSchema>;
