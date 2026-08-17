import { z } from "zod";

export const RobotsRuleSchema = z
  .object({
    userAgents: z.array(z.string()),
    allow: z.array(z.string()),
    disallow: z.array(z.string()),
  })
  .strict();

export const RobotsPolicySchema = z
  .object({
    url: z.url(),
    status: z.number().int(),
    groups: z.array(RobotsRuleSchema),
    sitemaps: z.array(z.url()),
  })
  .strict();

export type RobotsPolicy = z.infer<typeof RobotsPolicySchema>;
