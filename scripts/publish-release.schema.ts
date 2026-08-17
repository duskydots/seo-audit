import { z } from "zod";
import { ReleaseTagSchema, ReleaseVersionSchema } from "./release-version.schema.ts";

export const PublishReleaseOptionsSchema = z
  .strictObject({
    version: ReleaseVersionSchema,
    tag: ReleaseTagSchema,
    confirmPublish: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.confirmPublish !== undefined && value.confirmPublish !== `publish-${value.version}`) {
      context.addIssue({
        code: "custom",
        path: ["confirmPublish"],
        message: `Actual publication requires --confirm-publish publish-${value.version}`,
      });
    }
  });

export type PublishReleaseOptions = z.infer<typeof PublishReleaseOptionsSchema>;
