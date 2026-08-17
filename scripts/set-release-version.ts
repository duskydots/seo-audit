import { rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { coordinateBunLock } from "./coordinate-bun-lock.ts";
import { coordinateReleasePackage } from "./coordinate-release-package.ts";
import { ReleasePackageSchema, ReleaseVersionSchema } from "./release-version.schema.ts";

const version = ReleaseVersionSchema.parse(process.argv[2]);
const root = join(import.meta.dir, "..");
const packagePaths = ["package.json", "packages/seo-audit/package.json", "packages/cli/package.json", "apps/report-ui/package.json"] as const;

for (const relativePath of packagePaths) {
  const path = join(root, relativePath);
  const parsed = ReleasePackageSchema.parse(await Bun.file(path).json());
  const coordinated = coordinateReleasePackage(parsed, version);
  const temporary = join(dirname(path), `.package.json.release-${process.pid}`);
  await Bun.write(temporary, `${JSON.stringify(coordinated, null, 2)}\n`);
  await rename(temporary, path);
  console.log(`${parsed.name}: ${parsed.version} -> ${version}`);
}

const lockPath = join(root, "bun.lock");
const lockTemporary = join(root, `.bun.lock.release-${process.pid}`);
await Bun.write(lockTemporary, coordinateBunLock(await Bun.file(lockPath).text(), version));
await rename(lockTemporary, lockPath);
console.log(`bun.lock workspace metadata -> ${version}`);

const toolVersionPath = join(root, "packages/seo-audit/src/tool-version.ts");
const toolVersionSource = await Bun.file(toolVersionPath).text();
const toolVersionMatch = toolVersionSource.match(/export const TOOL_VERSION = "([^"]+)";/);
if (!toolVersionMatch?.[1]) throw new Error("packages/seo-audit/src/tool-version.ts does not contain the expected TOOL_VERSION declaration");
const previousToolVersion = ReleaseVersionSchema.parse(toolVersionMatch[1]);
const toolVersionTemporary = join(dirname(toolVersionPath), `.tool-version.ts.release-${process.pid}`);
await Bun.write(toolVersionTemporary, `export const TOOL_VERSION = "${version}";\n`);
await rename(toolVersionTemporary, toolVersionPath);
console.log(`audit manifest toolVersion: ${previousToolVersion} -> ${version}`);

console.log("Next: bun install, bun run docs:generate, review the diff, and commit the release version.");
