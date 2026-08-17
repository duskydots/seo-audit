import { describe, expect, test } from "bun:test";
import { TOOL_VERSION } from "../../packages/seo-audit/src/tool-version.ts";
import { coordinateBunLock } from "../../scripts/coordinate-bun-lock.ts";
import { coordinateReleasePackage } from "../../scripts/coordinate-release-package.ts";
import { PublishReleaseOptionsSchema } from "../../scripts/publish-release.schema.ts";
import { ReleasePackageSchema, ReleaseTagSchema, ReleaseVersionSchema } from "../../scripts/release-version.schema.ts";

describe("release validation", () => {
  test("accepts stable and prerelease SemVer values", () => {
    expect(ReleaseVersionSchema.parse("1.2.3")).toBe("1.2.3");
    expect(ReleaseVersionSchema.parse("1.2.3-beta.1")).toBe("1.2.3-beta.1");
    expect(ReleaseTagSchema.parse("next")).toBe("next");
  });

  test("rejects ambiguous versions, tags and unknown repository fields only when unsafe", () => {
    expect(ReleaseVersionSchema.safeParse("v1.2.3").success).toBeFalse();
    expect(ReleaseVersionSchema.safeParse("01.2.3").success).toBeFalse();
    expect(ReleaseTagSchema.safeParse("production").success).toBeFalse();
    expect(
      ReleasePackageSchema.parse({
        name: "@example/package",
        version: "1.0.0",
        repository: { type: "git", url: "https://example.com/repo.git", directory: "packages/example" },
      }).repository,
    ).toEqual({ type: "git", url: "https://example.com/repo.git", directory: "packages/example" });
  });

  test("requires an exact version-bound confirmation before publication", () => {
    expect(PublishReleaseOptionsSchema.parse({ version: "1.0.0", tag: "latest" }).confirmPublish).toBeUndefined();
    expect(PublishReleaseOptionsSchema.parse({ version: "1.0.0", tag: "latest", confirmPublish: "publish-1.0.0" }).confirmPublish).toBe("publish-1.0.0");
    expect(PublishReleaseOptionsSchema.safeParse({ version: "1.0.0", tag: "latest", confirmPublish: "yes" }).success).toBeFalse();
    expect(PublishReleaseOptionsSchema.safeParse({ version: "1.0.0", tag: "latest", unexpected: true }).success).toBeFalse();
  });

  test("keeps generated audit metadata aligned with the engine package version", async () => {
    const packageMetadata = ReleasePackageSchema.parse(await Bun.file(new URL("../../packages/seo-audit/package.json", import.meta.url)).json());
    expect(TOOL_VERSION).toBe(packageMetadata.version);
  });

  test("pins coordinated workspace dependencies to the release version", () => {
    const coordinated = coordinateReleasePackage(
      ReleasePackageSchema.parse({
        name: "@duskydots/seo-audit-cli",
        version: "1.0.3",
        dependencies: { "@duskydots/seo-audit": "workspace:*", zod: "^4.4.3" },
      }),
      ReleaseVersionSchema.parse("1.0.4"),
    );

    expect(coordinated.version).toBe("1.0.4");
    expect(coordinated.dependencies).toEqual({ "@duskydots/seo-audit": "workspace:1.0.4", zod: "^4.4.3" });
  });

  test("coordinates workspace versions and engine ranges in bun.lock", () => {
    const lock = `{
  "workspaces": {
    "apps/report-ui": {
      "version": "1.0.3",
      "dependencies": { "@duskydots/seo-audit": "workspace:*" },
    },
    "packages/cli": {
      "version": "1.0.3",
      "dependencies": { "@duskydots/seo-audit": "workspace:*" },
    },
    "packages/seo-audit": {
      "version": "1.0.3",
    },
  },
}`;

    const coordinated = coordinateBunLock(lock, ReleaseVersionSchema.parse("1.0.4"));
    expect(coordinated.match(/"version": "1\.0\.4"/g)?.length).toBe(3);
    expect(coordinated.match(/"@duskydots\/seo-audit": "workspace:1\.0\.4"/g)?.length).toBe(2);
    expect(() => coordinateBunLock("{}", ReleaseVersionSchema.parse("1.0.4"))).toThrow("missing workspace metadata");
  });
});
