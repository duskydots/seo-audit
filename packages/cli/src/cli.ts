#!/usr/bin/env bun
import { runRenderWorker } from "@duskydots/seo-audit/internal/render-worker";
import { renderCliHelp } from "./cli-help.ts";
import { CrawlCommandSchema, OpenCommandSchema } from "./command.schema.ts";
import { runCrawlCommand } from "./crawl.command.ts";
import { runOpenCommand } from "./open.command.ts";

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function numberOption(args: string[], name: string, fallback: number): number {
  const value = option(args, name);
  return value === undefined ? fallback : Number(value);
}

function workerOption(args: string[], name: string): "auto" | number {
  const value = option(args, name);
  return value === undefined || value === "auto" ? "auto" : Number(value);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || command === "--help" || command === "help") {
    console.log(renderCliHelp());
    return;
  }
  if (command === "__render-worker") return await runRenderWorker();
  if (command === "crawl") {
    const seed = args[1];
    if (!seed) throw new Error("crawl requires a seed URL");
    if (
      args.some((argument) => argument === "--output" || argument.startsWith("--output=") || argument === "--max-pages" || argument.startsWith("--max-pages="))
    ) {
      throw new Error("--output and --max-pages were removed. Output naming and the crawl safety limit are automatic.");
    }
    const parsed = CrawlCommandSchema.parse({
      command: "crawl",
      seed,
      concurrency: workerOption(args, "--concurrency"),
      render: option(args, "--render") ?? "all",
      renderWorkers: workerOption(args, "--render-workers"),
      maxRenderPages: numberOption(args, "--max-render-pages", 20),
      respectRobots: !args.includes("--ignore-robots"),
    });
    return await runCrawlCommand(parsed);
  }
  if (command === "open") {
    const auditDirectory = args[1];
    if (!auditDirectory) throw new Error("open requires an audit directory");
    if (args.length > 2) throw new Error("open accepts only an audit directory; it always uses http://localhost:4173");
    return await runOpenCommand(OpenCommandSchema.parse({ command: "open", auditDirectory }));
  }
  throw new Error(`Unknown command: ${command}\n\n${renderCliHelp()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});
