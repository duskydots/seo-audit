import { z } from "zod";

export const CrawlNodeStateSchema = z.enum(["discovered", "queued", "fetching", "fetched", "parsed", "render-queued", "rendered", "blocked", "failed"]);

export const PageNodeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    url: z.url(),
    key: z.url(),
    internal: z.boolean(),
    state: CrawlNodeStateSchema,
    depth: z.number().int().nonnegative(),
    navigationDepth: z.number().int().nonnegative().optional(),
    discoveryCount: z.number().int().positive(),
    discoveredVia: z.array(z.enum(["seed", "anchor", "sitemap", "canonical", "redirect", "rendered-anchor"])),
    status: z.number().int().min(0).max(599).optional(),
    statusText: z.string().optional(),
    contentType: z.string().optional(),
    responseTimeMs: z.number().nonnegative().optional(),
    htmlBytes: z.number().int().nonnegative().optional(),
    finalUrl: z.url().optional(),
    redirectChain: z
      .array(
        z
          .object({
            url: z.url(),
            status: z.number().int().min(300).max(399),
            target: z.url(),
          })
          .strict(),
      )
      .default([]),
    title: z.string().optional(),
    description: z.string().optional(),
    canonical: z.url().optional(),
    robots: z.array(z.string()),
    headings: z.array(z.object({ level: z.number().int().min(1).max(6), text: z.string() }).strict()),
    wordCount: z.number().int().nonnegative().optional(),
    scriptCount: z.number().int().nonnegative().optional(),
    imageCount: z.number().int().nonnegative().optional(),
    missingAltCount: z.number().int().nonnegative().optional(),
    rendered: z
      .object({
        termination: z.enum(["stable", "hard-timeout", "navigation-error"]),
        durationMs: z.number().nonnegative(),
        wordCount: z.number().int().nonnegative(),
        linkCount: z.number().int().nonnegative(),
        title: z.string().optional(),
        h1: z.array(z.string()),
        contentAddedWords: z.number().int(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PageNode = z.infer<typeof PageNodeSchema>;
export type CrawlNodeState = z.infer<typeof CrawlNodeStateSchema>;
