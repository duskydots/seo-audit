import { join } from "node:path";
import { TOOL_VERSION } from "../packages/seo-audit/src/tool-version.ts";
import { ReleasePackageSchema, ReleaseTagSchema, ReleaseVersionSchema } from "./release-version.schema.ts";

const versionIndex = process.argv.indexOf("--version");
const tagIndex = process.argv.indexOf("--tag");
const version = ReleaseVersionSchema.parse(process.argv[versionIndex + 1]);
ReleaseTagSchema.parse(process.argv[tagIndex + 1]);

const root = join(import.meta.dir, "..");
if (TOOL_VERSION !== version) throw new Error(`Audit manifest toolVersion is ${TOOL_VERSION}; expected ${version}`);
const packagePaths = ["package.json", "packages/seo-audit/package.json", "packages/cli/package.json", "apps/report-ui/package.json"] as const;

for (const relativePath of packagePaths) {
  const parsed = ReleasePackageSchema.parse(await Bun.file(join(root, relativePath)).json());
  if (parsed.version !== version) throw new Error(`${relativePath} has version ${parsed.version}; expected ${version}`);
  if (
    (relativePath === "packages/cli/package.json" || relativePath === "apps/report-ui/package.json") &&
    parsed.dependencies?.["@duskydots/seo-audit"] !== `workspace:${version}`
  ) {
    throw new Error(`${relativePath} must depend on @duskydots/seo-audit using workspace:${version}`);
  }
  if (!parsed.private) {
    if (!parsed.license || parsed.license === "UNLICENSED") throw new Error(`${relativePath} requires an approved SPDX license before publication`);
    if (!parsed.repository) throw new Error(`${relativePath} requires repository metadata for trusted publishing`);
  }
}

for (const path of [
  "CHANGELOG.md",
  "LICENSE",
  "packages/seo-audit/LICENSE",
  "packages/cli/LICENSE",
  "docs/CLI.md",
  "SECURITY.md",
  "packages/cli/ui-dist/index.html",
]) {
  if (!(await Bun.file(join(root, path)).exists())) throw new Error(`Required release file is missing: ${path}`);
}

const rootLicense = await Bun.file(join(root, "LICENSE")).text();
for (const path of ["packages/seo-audit/LICENSE", "packages/cli/LICENSE"]) {
  if ((await Bun.file(join(root, path)).text()) !== rootLicense) throw new Error(`${path} must match the root LICENSE`);
}

console.log(`Release ${version} metadata is internally consistent.`);
