import { z } from "zod";

export const ExtractedLinkSchema = z
  .object({
    url: z.url(),
    text: z.string(),
    rel: z.array(z.string()),
    kind: z.enum(["anchor", "canonical", "image", "script", "stylesheet"]),
  })
  .strict();

export const PageObservationSchema = z
  .object({
    lang: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    canonical: z.url().optional(),
    robots: z.array(z.string()),
    headings: z.array(z.object({ level: z.number().int().min(1).max(6), text: z.string() }).strict()),
    wordCount: z.number().int().nonnegative(),
    scriptCount: z.number().int().nonnegative(),
    imageCount: z.number().int().nonnegative(),
    missingAltCount: z.number().int().nonnegative(),
    normalizedText: z.string(),
    jsonLd: z.array(
      z
        .object({
          hash: z.string().regex(/^[a-f0-9]{64}$/),
          valid: z.boolean(),
          types: z.array(z.string()),
        })
        .strict(),
    ),
    links: z.array(ExtractedLinkSchema),
  })
  .strict();

export type PageObservation = z.infer<typeof PageObservationSchema>;
