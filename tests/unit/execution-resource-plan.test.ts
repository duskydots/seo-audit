import { describe, expect, test } from "bun:test";
import { ExecutionResourcePlanSchema } from "../../packages/seo-audit/src/domain/execution/execution-resource-plan.schema.ts";
import { resolveExecutionResourcePlan } from "../../packages/seo-audit/src/domain/execution/resolve-execution-resource-plan.ts";

const gibibyte = 1024 ** 3;

describe("execution resource plan", () => {
  test("keeps a four-core GitHub Actions runner conservative", () => {
    const plan = resolveExecutionResourcePlan(
      {
        platform: "linux",
        architecture: "x64",
        logicalCpuCount: 4,
        totalMemoryBytes: 16 * gibibyte,
        ci: true,
        githubActions: true,
      },
      { fetchConcurrency: "auto", renderWorkers: "auto" },
    );

    expect(plan.fetchConcurrency).toBe(8);
    expect(plan.renderWorkers).toBe(2);
  });

  test("limits rendering by memory before CPU", () => {
    const plan = resolveExecutionResourcePlan(
      {
        platform: "linux",
        architecture: "arm64",
        logicalCpuCount: 16,
        totalMemoryBytes: 3 * gibibyte,
        ci: true,
        githubActions: false,
      },
      { fetchConcurrency: "auto", renderWorkers: "auto" },
    );

    expect(plan.fetchConcurrency).toBe(16);
    expect(plan.renderWorkers).toBe(1);
  });

  test("honors explicit overrides and round-trips through Zod", () => {
    const plan = resolveExecutionResourcePlan(
      {
        platform: "darwin",
        architecture: "arm64",
        logicalCpuCount: 10,
        totalMemoryBytes: 32 * gibibyte,
        ci: false,
        githubActions: false,
      },
      { fetchConcurrency: 7, renderWorkers: 3 },
    );

    expect(plan.fetchConcurrency).toBe(7);
    expect(plan.renderWorkers).toBe(3);
    expect(ExecutionResourcePlanSchema.parse(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
    expect(() => ExecutionResourcePlanSchema.parse({ ...plan, schemaVersion: 2 })).toThrow();
    expect(() => ExecutionResourcePlanSchema.parse({ ...plan, unexpected: true })).toThrow();
  });
});
