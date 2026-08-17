import type { ReleasePackage, ReleaseVersion } from "./release-version.schema.ts";

const coordinatedWorkspaceDependencies = Object.freeze(["@duskydots/seo-audit"] as const);

export function coordinateReleasePackage(metadata: ReleasePackage, version: ReleaseVersion): ReleasePackage {
  if (!metadata.dependencies) return { ...metadata, version };

  const dependencies = { ...metadata.dependencies };
  for (const dependencyName of coordinatedWorkspaceDependencies) {
    if (dependencies[dependencyName]?.startsWith("workspace:")) dependencies[dependencyName] = `workspace:${version}`;
  }

  return { ...metadata, version, dependencies };
}
