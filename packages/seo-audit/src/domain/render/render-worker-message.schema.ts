import { z } from "zod";
import { RenderJobSchema } from "./render-job.schema.ts";
import { RenderObservationSchema } from "./render-observation.schema.ts";

export const CoordinatorMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("render"), job: RenderJobSchema }).strict(),
  z.object({ type: z.literal("shutdown") }).strict(),
]);

export const RendererMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), pid: z.number().int(), chromiumVersion: z.string() }).strict(),
  z.object({ type: z.literal("result"), jobId: z.string(), result: RenderObservationSchema }).strict(),
  z.object({ type: z.literal("error"), jobId: z.string(), error: z.string() }).strict(),
]);

export type CoordinatorMessage = z.infer<typeof CoordinatorMessageSchema>;
export type RendererMessage = z.infer<typeof RendererMessageSchema>;
