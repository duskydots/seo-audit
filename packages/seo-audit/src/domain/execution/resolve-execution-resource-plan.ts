import {
  type ExecutionResourcePlan,
  ExecutionResourcePlanSchema,
  type ExecutionResourceRequest,
  type RuntimeResources,
} from "./execution-resource-plan.schema.ts";

const GIBIBYTE = 1024 ** 3;
const ESTIMATED_RENDERER_MEMORY_BYTES = 2 * GIBIBYTE;

export function resolveExecutionResourcePlan(resources: RuntimeResources, request: ExecutionResourceRequest): ExecutionResourcePlan {
  const automaticFetchConcurrency = clamp(resources.logicalCpuCount * 2, 4, 16);
  const memoryBoundRenderers = Math.max(1, Math.floor(resources.totalMemoryBytes / ESTIMATED_RENDERER_MEMORY_BYTES));
  const cpuBoundRenderers = Math.max(1, Math.floor(resources.logicalCpuCount / 2));
  const automaticRenderWorkers = Math.min(4, cpuBoundRenderers, memoryBoundRenderers);

  return ExecutionResourcePlanSchema.parse({
    schemaVersion: 1,
    resources,
    fetchConcurrency: request.fetchConcurrency === "auto" ? automaticFetchConcurrency : request.fetchConcurrency,
    renderWorkers: request.renderWorkers === "auto" ? automaticRenderWorkers : request.renderWorkers,
    estimatedRendererMemoryBytes: ESTIMATED_RENDERER_MEMORY_BYTES,
    source: {
      fetchConcurrency: request.fetchConcurrency === "auto" ? "automatic" : "override",
      renderWorkers: request.renderWorkers === "auto" ? "automatic" : "override",
    },
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
