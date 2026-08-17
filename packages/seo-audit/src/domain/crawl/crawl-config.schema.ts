import { z } from "zod";

export const CrawlConfigSchema = z
  .object({
    seed: z.url(),
    outputDirectory: z.string().min(1),
    maxPages: z.number().int().positive().max(100_000).default(100_000),
    concurrency: z.number().int().positive().max(64).default(8),
    requestTimeoutMs: z.number().int().positive().default(15_000),
    userAgent: z.string().min(1).default("DuskyDotsSeoAudit/0.1 (+https://github.com/duskydots/seo-audit)"),
    respectRobots: z.boolean().default(true),
    discoverSitemaps: z.boolean().default(true),
    render: z.enum(["off", "smart", "all"]).default("all"),
    renderWorkers: z.number().int().positive().max(8).default(2),
    maxRenderPages: z.number().int().nonnegative().max(1_000).default(20),
  })
  .strict();

export type CrawlConfig = z.infer<typeof CrawlConfigSchema>;
