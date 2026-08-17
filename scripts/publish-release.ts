import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PublishReleaseOptionsSchema } from "./publish-release.schema.ts";

const root = join(import.meta.dir, "..");
const options = PublishReleaseOptionsSchema.parse(readOptions(process.argv.slice(2)));
const artifactDirectory = await mkdtemp(join(root, `.release-${options.version}-`));
const engineArchive = join(artifactDirectory, `duskydots-seo-audit-${options.version}.tgz`);
const cliArchive = join(artifactDirectory, `duskydots-seo-audit-cli-${options.version}.tgz`);

console.log(`Preparing release ${options.version} with npm tag ${options.tag}`);
await run(["npm", "whoami"]);
await run(["bun", "audit"]);
await run(["bun", "run", "check"]);
await run(["bun", "run", "test:unit"]);
await run(["bun", "run", "build"]);
await run(["bun", "run", "test:smoke"]);
await run(["bun", "run", "release:verify", "--", "--version", options.version, "--tag", options.tag]);
await run(["bun", "pm", "pack", "--cwd", "packages/seo-audit", "--destination", artifactDirectory]);
await run(["bun", "pm", "pack", "--cwd", "packages/cli", "--destination", artifactDirectory]);
await run(["tar", "-tzf", engineArchive]);
await run(["tar", "-tzf", cliArchive]);
const consumerDirectory = await mkdtemp(join(tmpdir(), `seo-audit-release-consumer-${options.version}-`));
await run(["npm", "init", "--yes"], consumerDirectory);
await run(["npm", "install", engineArchive, cliArchive], consumerDirectory);
await run([join(consumerDirectory, "node_modules", ".bin", "seo-audit"), "--help"], consumerDirectory);
await run(["npm", "publish", engineArchive, "--access", "public", "--tag", options.tag, "--dry-run"]);
await run(["npm", "publish", cliArchive, "--access", "public", "--tag", options.tag, "--dry-run"]);

if (options.confirmPublish === undefined) {
  console.log(`Dry run complete. Exact archives remain in ${artifactDirectory}`);
  console.log(`To publish them, rerun with --confirm-publish publish-${options.version}`);
  process.exit(0);
}

console.log(`Publishing @duskydots/seo-audit@${options.version}`);
await run(["npm", "publish", engineArchive, "--access", "public", "--tag", options.tag]);
console.log(`Publishing @duskydots/seo-audit-cli@${options.version}`);
await run(["npm", "publish", cliArchive, "--access", "public", "--tag", options.tag]);
console.log(`Published both packages at ${options.version}. Exact archives remain in ${artifactDirectory}`);

function readOptions(args: string[]): { version?: string; tag?: string; confirmPublish?: string } {
  const known = new Set(["--version", "--tag", "--confirm-publish"]);
  const values: { version?: string; tag?: string; confirmPublish?: string } = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name || !known.has(name)) throw new Error(`Unknown release argument: ${name ?? "<missing>"}`);
    if (value === undefined || value.startsWith("--")) throw new Error(`${name} requires a value`);
    if (name === "--version") values.version = value;
    else if (name === "--tag") values.tag = value;
    else values.confirmPublish = value;
  }
  return values;
}

async function run(command: string[], cwd = root): Promise<void> {
  const process = Bun.spawn(command, {
    cwd,
    env: globalThis.process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await process.exited;
  if (exitCode !== 0) throw new Error(`Command failed with exit code ${exitCode}: ${command.join(" ")}`);
}
