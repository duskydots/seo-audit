import { arch, availableParallelism, platform, totalmem } from "node:os";
import { type RuntimeResources, RuntimeResourcesSchema } from "../../domain/execution/execution-resource-plan.schema.ts";

export function detectRuntimeResources(environment: NodeJS.ProcessEnv = process.env): RuntimeResources {
  const constrainedMemoryBytes = process.constrainedMemory();
  return RuntimeResourcesSchema.parse({
    platform: platform(),
    architecture: arch(),
    logicalCpuCount: availableParallelism(),
    totalMemoryBytes: constrainedMemoryBytes > 0 ? Math.min(totalmem(), constrainedMemoryBytes) : totalmem(),
    ci: environment.CI === "true" || environment.CI === "1",
    githubActions: environment.GITHUB_ACTIONS === "true",
  });
}
