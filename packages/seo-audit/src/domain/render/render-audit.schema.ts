import { z } from "zod";
import { PageRepresentationSchema } from "./page-representation.schema.ts";
import { RenderDeltaSchema } from "./render-delta.schema.ts";
import { RenderObservationSchema } from "./render-observation.schema.ts";

export const RenderAuditSchema = z
  .object({
    schemaVersion: z.literal(1),
    pageUrl: z.url(),
    fetchRaw: PageRepresentationSchema,
    browserRaw: PageRepresentationSchema,
    renderedDom: PageRepresentationSchema,
    execution: RenderObservationSchema.omit({ browserRawHtml: true, renderedHtml: true }),
    deliveryDelta: RenderDeltaSchema,
    renderDelta: RenderDeltaSchema,
    totalDelta: RenderDeltaSchema,
  })
  .strict();

export type RenderAudit = z.infer<typeof RenderAuditSchema>;
