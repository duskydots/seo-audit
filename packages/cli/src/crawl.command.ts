import { resolve } from "node:path";
import { CrawlConfigSchema, crawlSite, detectRuntimeResources, resolveExecutionResourcePlan } from "@duskydots/seo-audit";
import type { CrawlCommand } from "./command.schema.ts";

export async function runCrawlCommand(command: CrawlCommand): Promise<void> {
  const outputDirectory = automaticOutputDirectory(command.seed, new Date());
  const execution = resolveExecutionResourcePlan(detectRuntimeResources(), {
    fetchConcurrency: command.concurrency,
    renderWorkers: command.renderWorkers,
  });
  const config = CrawlConfigSchema.parse({
    seed: command.seed,
    outputDirectory,
    concurrency: execution.fetchConcurrency,
    render: command.render,
    renderWorkers: execution.renderWorkers,
    maxRenderPages: command.maxRenderPages,
    respectRobots: command.respectRobots,
    requestTimeoutMs: 15_000,
    userAgent: "DuskyDotsSeoAudit/0.1 (+https://github.com/duskydots/seo-audit)",
    discoverSitemaps: true,
  });
  console.error(
    `Resources: ${execution.resources.logicalCpuCount} logical CPUs, ${(execution.resources.totalMemoryBytes / 1024 ** 3).toFixed(1)} GiB RAM; fetch concurrency ${execution.fetchConcurrency}, render workers ${execution.renderWorkers}`,
  );
  const bundle = await crawlSite(config, {
    executionPlan: execution,
    onEvent(event) {
      if (event.type === "fetched") {
        process.stderr.write(`\rCrawled ${event.completed} · queued ${event.queued} · ${event.status} ${event.url.slice(0, 90)}   `);
      } else if (event.type === "warning") {
        process.stderr.write(`\nWarning: ${event.message}\n`);
      } else if (event.type === "rendered") {
        process.stderr.write(`\nRendered ${event.url} in ${Math.round(event.durationMs)}ms\n`);
      }
    },
  });
  process.stderr.write("\n");
  console.log(`Audit complete: ${outputDirectory}`);
  console.log(`${bundle.summary.totals.crawled} crawled · ${bundle.findings.length} issue groups · ${bundle.summary.totals.errors4xx} 4xx`);
}

export function automaticOutputDirectory(seed: string, startedAt: Date, workingDirectory = process.cwd()): string {
  const host = new URL(seed).host.replace(/[^a-z0-9.-]+/gi, "-");
  const timestamp = startedAt.toISOString().replace(/[:.]/g, "-");
  return resolve(workingDirectory, `audit-${host}-${timestamp}`);
}
