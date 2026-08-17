import { renderingRules } from "./rendering-rules.ts";
import type { RuleDefinition } from "./rule.schema.ts";
import { htmlHeavy } from "./rules/content/html-heavy.rule.ts";
import { thinCandidate } from "./rules/content/thin-candidate.rule.ts";
import { h1Missing } from "./rules/headings/h1-missing.rule.ts";
import { h1Multiple } from "./rules/headings/h1-multiple.rule.ts";
import { skippedHeadingLevels } from "./rules/headings/level-skipped.rule.ts";
import { altMissing } from "./rules/images/alt-missing.rule.ts";
import { brokenCanonicals } from "./rules/indexability/canonical-broken.rule.ts";
import { redirectingCanonicals } from "./rules/indexability/canonical-redirect.rule.ts";
import { canonicalized } from "./rules/indexability/canonicalized.rule.ts";
import { noindex } from "./rules/indexability/noindex.rule.ts";
import { deepPages } from "./rules/links/deep-page.rule.ts";
import { brokenLinks } from "./rules/links/internal-broken.rule.ts";
import { internalNofollowLinks } from "./rules/links/internal-nofollow.rule.ts";
import { internalRedirectLinks } from "./rules/links/internal-redirect.rule.ts";
import { disconnected } from "./rules/links/unreachable-from-seed.rule.ts";
import { duplicateDescriptions } from "./rules/metadata/description-duplicate.rule.ts";
import { longDescriptions } from "./rules/metadata/description-long.rule.ts";
import { descriptionMissing } from "./rules/metadata/description-missing.rule.ts";
import { shortDescriptions } from "./rules/metadata/description-short.rule.ts";
import { duplicateTitles } from "./rules/metadata/title-duplicate.rule.ts";
import { longTitles } from "./rules/metadata/title-long.rule.ts";
import { titleMissing } from "./rules/metadata/title-missing.rule.ts";
import { shortTitles } from "./rules/metadata/title-short.rule.ts";
import { internal4xx } from "./rules/response/internal-4xx.rule.ts";
import { internal5xx } from "./rules/response/internal-5xx.rule.ts";
import { internalRedirect } from "./rules/response/internal-redirect.rule.ts";
import { redirectChain } from "./rules/response/redirect-chain.rule.ts";
import { slowResponses } from "./rules/response/slow.rule.ts";
import { sitemapCanonicalized } from "./rules/sitemap/canonicalized.rule.ts";
import { sitemapNoindex } from "./rules/sitemap/noindex.rule.ts";
import { sitemapErrors } from "./rules/sitemap/non-200.rule.ts";
import { sitemapOrphans } from "./rules/sitemap/orphan-candidate.rule.ts";

export const builtInRules: readonly RuleDefinition[] = Object.freeze([
  internal5xx,
  internal4xx,
  redirectChain,
  internalRedirect,
  brokenLinks,
  internalRedirectLinks,
  internalNofollowLinks,
  deepPages,
  noindex,
  canonicalized,
  brokenCanonicals,
  redirectingCanonicals,
  titleMissing,
  duplicateTitles,
  shortTitles,
  longTitles,
  descriptionMissing,
  duplicateDescriptions,
  shortDescriptions,
  longDescriptions,
  h1Missing,
  h1Multiple,
  skippedHeadingLevels,
  sitemapOrphans,
  disconnected,
  sitemapErrors,
  sitemapNoindex,
  sitemapCanonicalized,
  slowResponses,
  htmlHeavy,
  thinCandidate,
  altMissing,
  ...renderingRules,
]);
