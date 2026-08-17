import { z } from "zod";
import { ExtractedLinkSchema } from "../html/page-observation.schema.ts";

const TextFieldDeltaSchema = z
  .object({
    state: z.enum(["unchanged", "added", "removed", "changed"]),
    raw: z.string().optional(),
    rendered: z.string().optional(),
  })
  .strict();

export const RenderDeltaSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: TextFieldDeltaSchema,
    description: TextFieldDeltaSchema,
    canonical: TextFieldDeltaSchema,
    lang: TextFieldDeltaSchema,
    robotsAdded: z.array(z.string()),
    robotsRemoved: z.array(z.string()),
    headingsAdded: z.array(z.object({ level: z.number().int().min(1).max(6), text: z.string() }).strict()),
    headingsRemoved: z.array(z.object({ level: z.number().int().min(1).max(6), text: z.string() }).strict()),
    linksAdded: z.array(ExtractedLinkSchema),
    linksRemoved: z.array(ExtractedLinkSchema),
    jsonLdAdded: z.array(z.string()),
    jsonLdRemoved: z.array(z.string()),
    rawWordCount: z.number().int().nonnegative(),
    renderedWordCount: z.number().int().nonnegative(),
    addedWords: z.number().int().nonnegative(),
    removedWords: z.number().int().nonnegative(),
    textSimilarity: z.number().min(0).max(1),
  })
  .strict();

export type RenderDelta = z.infer<typeof RenderDeltaSchema>;
