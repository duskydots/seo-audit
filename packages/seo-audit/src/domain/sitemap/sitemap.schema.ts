import { z } from "zod";

export const SitemapEntrySchema = z
  .object({
    location: z.url(),
    lastModified: z.string().optional(),
  })
  .strict();

export const SitemapDocumentSchema = z
  .object({
    url: z.url(),
    kind: z.enum(["urlset", "index"]),
    entries: z.array(SitemapEntrySchema),
  })
  .strict();

export type SitemapDocument = z.infer<typeof SitemapDocumentSchema>;
