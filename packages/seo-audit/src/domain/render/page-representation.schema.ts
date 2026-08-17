import { z } from "zod";
import { PageObservationSchema } from "../html/page-observation.schema.ts";

export const RepresentationSourceSchema = z.enum(["fetch_raw", "browser_raw", "rendered_dom"]);

export const PageRepresentationSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: RepresentationSourceSchema,
    url: z.url(),
    htmlHash: z.string().regex(/^[a-f0-9]{64}$/),
    htmlBytes: z.number().int().nonnegative(),
    bodyPath: z.string().regex(/^(?:evidence\/)?bodies\/[a-f0-9]{64}\.html$/),
    observation: PageObservationSchema,
  })
  .strict();

export type RepresentationSource = z.infer<typeof RepresentationSourceSchema>;
export type PageRepresentation = z.infer<typeof PageRepresentationSchema>;
