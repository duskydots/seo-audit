import { describe, expect, test } from "bun:test";
import { renderCliHelp } from "../../packages/cli/src/cli-help.ts";
import { CrawlCommandSchema, OpenCommandSchema } from "../../packages/cli/src/command.schema.ts";
import { automaticOutputDirectory } from "../../packages/cli/src/crawl.command.ts";
import { CrawlConfigSchema } from "../../packages/seo-audit/src/domain/crawl/crawl-config.schema.ts";

describe("crawl command", () => {
  test("generates a timestamped output directory from the seed", () => {
    expect(automaticOutputDirectory("https://www.example.com/", new Date("2026-08-13T05:37:43.171Z"), "/tmp/audits")).toBe(
      "/tmp/audits/audit-www.example.com-2026-08-13T05-37-43-171Z",
    );
  });

  test("defaults the engine to render-all Playwright crawling", () => {
    const config = CrawlConfigSchema.parse({ seed: "https://example.com/", outputDirectory: "audit" });
    expect(config.render).toBe("all");
    expect(config.maxRenderPages).toBe(20);
  });

  test("does not accept removed output or page-limit fields", () => {
    const base = { command: "crawl", seed: "https://example.com/", concurrency: 8, render: "off", renderWorkers: 2, maxRenderPages: 20, respectRobots: true };
    expect(CrawlCommandSchema.safeParse({ ...base, outputDirectory: "audit" }).success).toBeFalse();
    expect(CrawlCommandSchema.safeParse({ ...base, maxPages: 10 }).success).toBeFalse();
  });

  test("accepts automatic or explicit execution sizing", () => {
    const base = { command: "crawl", seed: "https://example.com/", render: "off", maxRenderPages: 20, respectRobots: true };
    expect(CrawlCommandSchema.safeParse({ ...base, concurrency: "auto", renderWorkers: "auto" }).success).toBeTrue();
    expect(CrawlCommandSchema.safeParse({ ...base, concurrency: 4, renderWorkers: 1 }).success).toBeTrue();
    expect(CrawlCommandSchema.safeParse({ ...base, concurrency: "four", renderWorkers: "auto" }).success).toBeFalse();
  });

  test("accepts only a fixed-port open command", () => {
    expect(OpenCommandSchema.safeParse({ command: "open", auditDirectory: "audit" }).success).toBeTrue();
    expect(OpenCommandSchema.safeParse({ command: "open", auditDirectory: "" }).success).toBeFalse();
    expect(OpenCommandSchema.safeParse({ command: "open", auditDirectory: "audit", port: 5000 }).success).toBeFalse();
  });

  test("documents only crawl and open as public commands", () => {
    const help = renderCliHelp();
    expect(help).toContain("seo-audit crawl");
    expect(help).toContain("seo-audit open");
    expect(help).not.toContain("seo-audit ui");
    expect(help).not.toContain("seo-audit setup");
  });
});
