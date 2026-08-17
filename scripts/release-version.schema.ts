import { z } from "zod";

export const ReleaseVersionSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/, "Expected a SemVer version without a leading v");

export const ReleaseTagSchema = z.enum(["latest", "next", "beta"]);

export const ReleasePackageSchema = z.looseObject({
  name: z.string().min(1),
  version: ReleaseVersionSchema,
  private: z.boolean().optional(),
  license: z.string().min(1).optional(),
  repository: z.union([z.string().min(1), z.looseObject({ type: z.string().min(1), url: z.string().min(1) })]).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
});

export type ReleasePackage = z.infer<typeof ReleasePackageSchema>;
export type ReleaseVersion = z.infer<typeof ReleaseVersionSchema>;
