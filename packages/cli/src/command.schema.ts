import { AutomaticWorkerCountSchema } from "@duskydots/seo-audit";
import { z } from "zod";

export const CrawlCommandSchema = z
  .object({
    command: z.literal("crawl"),
    seed: z.url(),
    concurrency: AutomaticWorkerCountSchema,
    render: z.enum(["off", "smart", "all"]),
    renderWorkers: AutomaticWorkerCountSchema,
    maxRenderPages: z.number().int().nonnegative(),
    respectRobots: z.boolean(),
  })
  .strict();

export const OpenCommandSchema = z
  .object({
    command: z.literal("open"),
    auditDirectory: z.string().min(1),
  })
  .strict();

export type CrawlCommand = z.infer<typeof CrawlCommandSchema>;
export type OpenCommand = z.infer<typeof OpenCommandSchema>;
