# Security policy and audit baseline

## Reporting

Do not open a public issue for a suspected vulnerability. Report it through GitHub private vulnerability reporting for `duskydots/seo-audit`. Until that feature is enabled, contact the repository owners privately and include affected versions, reproduction steps, impact, and any suggested mitigation.

## Supported versions

Only the most recent npm release receives security fixes before version 1.0. After 1.0, this table must be replaced with an explicit supported-version policy.

## Release gates

- frozen Bun lockfile installation;
- full `bun audit`, with no ignored advisories in the release workflow;
- GitHub dependency review for new moderate-or-higher vulnerabilities;
- weekly and change-triggered CodeQL analysis;
- strict TypeScript and Zod boundary validation;
- unit, raw-crawl, renderer, and exact-package consumer tests;
- generated UI assets and npm tarball content inspection;
- immutable Git tag, protected GitHub environment approval, npm OIDC trusted publishing, and provenance where npm supports it;
- no long-lived npm write token after trusted publishing is configured.

## Current audit, 2026-08-14

The full `bun audit` reported no known vulnerabilities. A source review also found no embedded private keys or recognized npm, GitHub, or AWS token patterns in publishable source. These checks only cover known advisories and recognizable secrets; they are not proof that the software is vulnerability-free.

Hardening completed in this baseline:

- the local report server binds only to `127.0.0.1`;
- report data and UI asset paths are explicit allowlists;
- report responses include CSP, MIME-sniffing, framing, and referrer protections;
- static exports validate the complete audit through Zod before copying data;
- static exports refuse to overwrite an existing destination and are written through a temporary directory;
- production UI packages exclude source maps;
- Vite remains a private build dependency and is absent from the runtime CLI dependency graph.
- native response bodies are decoded through a 10 MiB hard ceiling by default;
- native crawl redirects are followed only within the original origin, while blocked cross-origin targets remain recorded as redirect evidence.

## Residual risks

- Browser rendering executes JavaScript from the audited site. A hostile site can make browser requests to services reachable from the runner. Do not enable rendering for untrusted sites on credential-bearing CI runners or sensitive networks. Prefer `--render off` or an isolated, disposable runner with restricted egress.
- Native crawling intentionally contacts operator-supplied URLs. Do not expose the CLI as an unauthenticated web service, and do not allow untrusted users to choose seeds on a privileged network without a separate SSRF policy and DNS/IP enforcement layer.
- Audit outputs can reveal internal URLs, titles, headings, link relationships, and browser failures. Review them before publishing a static report; never publish `bodies/` from an internal audit without authorization.
- The report UI validates structured data and React escapes displayed strings, but audit artifacts must still be treated as untrusted input.
- GitHub Action major tags are mutable upstream references. Organizations requiring a stricter supply-chain posture should pin every action to a reviewed full commit SHA and update those pins through dependency review.
