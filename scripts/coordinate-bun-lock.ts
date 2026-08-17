import type { ReleaseVersion } from "./release-version.schema.ts";

const workspacePaths = Object.freeze(["apps/report-ui", "packages/cli", "packages/seo-audit"] as const);
const engineConsumers = new Set(["apps/report-ui", "packages/cli"]);

export function coordinateBunLock(source: string, version: ReleaseVersion): string {
  let coordinated = source;

  for (const workspacePath of workspacePaths) {
    const marker = `    "${workspacePath}": {`;
    const start = coordinated.indexOf(marker);
    if (start < 0) throw new Error(`bun.lock is missing workspace metadata for ${workspacePath}`);
    const end = coordinated.indexOf("\n    },", start);
    if (end < 0) throw new Error(`bun.lock has malformed workspace metadata for ${workspacePath}`);

    const block = coordinated.slice(start, end + 7);
    const versionPattern = /"version": "[^"]+"/;
    if (!versionPattern.test(block)) throw new Error(`bun.lock workspace ${workspacePath} is missing its version`);
    let nextBlock = block.replace(versionPattern, `"version": "${version}"`);

    if (engineConsumers.has(workspacePath)) {
      const dependencyPattern = /("@duskydots\/seo-audit": ")workspace:[^"]+("[,]?)/;
      if (!dependencyPattern.test(nextBlock)) throw new Error(`bun.lock workspace ${workspacePath} is missing its engine workspace dependency`);
      nextBlock = nextBlock.replace(dependencyPattern, `$1workspace:${version}$2`);
    }

    coordinated = `${coordinated.slice(0, start)}${nextBlock}${coordinated.slice(end + 7)}`;
  }

  return coordinated;
}
