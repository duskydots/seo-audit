# Manual release process

Releases are intentionally manual, tagged, reproducible, and published from exact inspected tarballs.

## One-time npm setup

1. Confirm that the `duskydots` npm organization exists and that maintainers use two-factor authentication.
2. Confirm the repository and both public packages retain the approved MIT license. The release verifier blocks publication if the license metadata or root `LICENSE` file is missing.
3. Confirm that `https://github.com/duskydots/seo-audit` is the final public repository URL. npm trusted publishing requires an exact repository match.
4. The first publication may need a local npm publish with two-factor authentication because npm package settings do not exist yet. Pack and test the archives exactly as described below; publish the engine first and the CLI second.
5. In each npm package's Trusted Publisher settings, authorize GitHub Actions for this repository, workflow `release.yml`, environment `npm-release`, and `npm publish`.
6. Create a protected GitHub environment named `npm-release` with required human reviewers. Remove legacy write tokens after trusted publishing works.

## Prepare a version

From a clean branch:

```bash
bun run release:set-version -- 1.0.2
bun install
bun run docs:generate
bun audit
bun run check
bun run test:unit
bun run build
bun run test:smoke
bun run pack:dry-run
```

Update `CHANGELOG.md`, then review the complete diff and both package file lists. Commit through a pull request. After it merges, create and push the immutable tag `v1.0.2` at that exact commit.

Both public packages use a `files` allowlist as the primary publication boundary and a package-level `.npmignore` as defense in depth. Consumer-facing `README.md`, `LICENSE`, package metadata, runtime TypeScript, and the CLI's prebuilt `ui-dist` are expected; internal documentation, tests, configuration, audit data, source maps, local credentials, and generated archives must not appear in either tarball.

## Publish

Open GitHub Actions, choose **manual npm release**, select the `v1.0.2` tag, enter `1.0.2`, and select `latest`, `next`, or `beta`. Approve the protected `npm-release` environment.

For the initial authenticated local publication, first run the guarded preview. It validates npm authentication, audits dependencies, checks, tests, builds, verifies metadata, creates and lists both exact archives, and runs `npm publish --dry-run` for each package:

```bash
bun run release:publish -- --version 1.0.2 --tag latest
```

Review both printed inventories and dry runs. Actual publication requires an exact version-bound confirmation and always publishes the engine before the CLI:

```bash
bun run release:publish -- --version 1.0.2 --tag latest --confirm-publish publish-1.0.2
```

The script never deletes its archives; it prints their ignored `.release-<version>-*` directory for checksum and incident-response records.

The workflow re-runs dependency, type, unit, browser, build, documentation, package-content, and consumer-install checks. It then publishes the engine followed by the CLI using npm trusted publishing and stores the exact tarballs as a GitHub artifact.

Because npm versions are immutable and two packages cannot be published transactionally, never reuse a partially published version. If engine publication succeeds and CLI publication fails, diagnose the CLI failure and retry only that exact CLI archive or prepare a new patch version.

## Consumer commands

```bash
bunx @duskydots/seo-audit-cli --help
bunx playwright install chromium
bunx @duskydots/seo-audit-cli crawl https://example.com --render smart
bunx @duskydots/seo-audit-cli open audit-example
```

Bun must already be installed. Vite is never installed for consumers: release CI builds the private UI and places the resulting HTML, CSS, and JavaScript in the CLI package.
