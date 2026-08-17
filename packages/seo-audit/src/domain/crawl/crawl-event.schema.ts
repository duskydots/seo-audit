import { z } from "zod";

export const CrawlEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("discovered"), url: z.url(), depth: z.number().int() }).strict(),
  z.object({ type: z.literal("fetched"), url: z.url(), status: z.number().int(), completed: z.number().int(), queued: z.number().int() }).strict(),
  z.object({ type: z.literal("rendered"), url: z.url(), durationMs: z.number() }).strict(),
  z.object({ type: z.literal("warning"), message: z.string() }).strict(),
]);

export type CrawlEvent = z.infer<typeof CrawlEventSchema>;
