# Modular SEO rule system

The crawler separates observed data from interpretation. A rule does not fetch, parse, mutate the graph, read files, or call an LLM. It receives an immutable, Zod-validated audit shape and returns evidence-backed findings.

## Finding semantics

- **Issue** — confirmed breakage or a direct technical blocker, such as an internal 404, 5xx response, or broken internal anchor target.
- **Warning** — a real signal requiring business or implementation context, such as `noindex`, a non-self canonical, or content that depends on JavaScript.
- **Opportunity** — optional optimization or heuristic review, such as missing descriptions, heading clarity, HTML weight, or thin-content candidates.

Severity ranks potential impact. Confidence describes evidence quality. Neither means that Google guarantees a ranking change. A missing capability is `not_evaluated`, never `passed`.

Page-level evidence identifies the affected URL and representation. Link-level evidence must preserve each occurrence as a paired relationship rather than independent URL arrays:

```ts
{
  kind: "link",
  edgeId: "edge_…",
  edgeKind: "anchor",
  sourceUrl: "https://example.com/source-page",
  targetUrl: "https://example.com/missing-page",
  targetStatus: 404,
  text: "Read the guide",
  rel: [],
  sequence: 42,
}
```

This lets reports answer where the crawler saw a broken target, what users saw as anchor text, and whether several occurrences came from the same page. `sourceUrls` remains a deduplicated convenience index; it is not a substitute for paired evidence.

## Rule contract

```ts
import {
  createFinding,
  evaluateRules,
  RuleMetadataSchema,
  type RuleDefinition,
} from "./src/index.ts";

const metadata = RuleMetadataSchema.parse({
  id: "business.service_page_without_cta",
  version: "1.0.0",
  category: "content",
  defaultSeverity: "medium",
  findingType: "opportunity",
  confidence: "heuristic",
  requires: ["content-markdown"],
  description: "Service pages with no extracted conversion action.",
});

const servicePageWithoutCta: RuleDefinition = {
  metadata,
  evaluate(context) {
    // Future Markdown/page-section records are exposed through the context when
    // that capability lands. Until then this rule is recorded as not evaluated.
    const affectedUrls: string[] = [];
    return affectedUrls.length === 0 ? [] : [createFinding(metadata, {
      title: "Service pages without a clear action",
      summary: "Likely service pages do not expose an extracted conversion action.",
      remediation: "Review the intended journey and add a useful next step where appropriate.",
      affectedUrls,
      sourceUrls: [],
    })];
  },
};
```

Run custom rules during crawling:

```ts
await crawlSite(config, {
  additionalRules: [servicePageWithoutCta],
  additionalCapabilities: ["content-markdown"],
});
```

Or run rules over an existing validated audit:

```ts
const run = evaluateRules({
  pages: audit.pages,
  edges: audit.edges,
  capabilities: ["page-summary", "graph"],
  rules: [servicePageWithoutCta],
});
```

Each audit writes `rules.json` and `rules.jsonl` with `passed`, `failed`, and `not_evaluated` coverage.

## Top ten product rule families

These are ranked by customer impact, evidential strength, and differentiation—not by raw rule count.

### 1. Availability and response integrity

Detect internal 4xx/5xx, DNS/TLS/timeout failures, redirect chains and loops, empty successful responses, soft-404 candidates, and inconsistent status between raw and rendered navigation. This is the clearest high-value family because inaccessible pages cannot satisfy search or users.

### 2. Crawl and index controls

Evaluate robots access, `noindex`, `nofollow`, `X-Robots-Tag`, snippet restrictions, blocked resources, and contradictions such as a heavily linked or sitemap-listed page that requests exclusion. Distinguish intentional exclusion from accidental business-page loss.

### 3. Canonicalization and duplicate consolidation

Validate every HTML/header canonical, its target status/indexability, chains/cycles, conflicting declarations, sitemap consistency, exact content hashes, near-duplicate clusters, and URL variants. This protects crawl efficiency and prevents competing versions of the same commercial content.

### 4. Internal architecture and business journeys

Compute click depth, unique contextual inlinks, dead ends, isolated components, sitemap-only pages, link targets behind redirects, anchor distributions, and paths from educational content to product/service/conversion pages. This turns the graph into an information-architecture and funnel diagnostic.

### 5. Raw versus rendered search parity

Compare title, canonical, directives, headings, main text, links, JSON-LD, and client-side error states. Flag blank app shells, hydration loss, blocked APIs, content appearing only after JavaScript, and SPA 200 error pages. This is a meaningful differentiator from inexpensive raw-only crawlers.

### 6. Search appearance and content structure

Audit useful titles, descriptions, heading hierarchy, primary content, repeated boilerplate, language, dates/authors, tables/lists, and title-to-content alignment. Missing descriptions and H1 patterns are opportunities, not universal blockers. Future Markdown sections enable template-aware and business-page-aware rules.

### 7. Structured data and entity consistency

Parse JSON-LD losslessly, report syntax failures, normalize `@type`/`@id`, validate profile-required fields, and compare price, availability, rating, author, organization, dates, and canonical URLs against visible content. Business-specific profiles should cover Product, LocalBusiness, Organization, Article, Event, and service-oriented sites.

### 8. Sitemap and freshness integrity

Validate sitemap syntax/limits, index loops, canonical/indexable URL membership, non-200 entries, missing important pages, and credible `lastmod` values. Later comparison rules should distinguish new, fixed, regressed, and disappeared pages rather than treating a bounded absence as deletion.

### 9. Page experience and content weight

Measure transferred and decoded bytes, resource counts by type/origin, DOM nodes/depth, inline code, text-to-markup ratio, largest images, compression, and lab/field performance as separately labeled capabilities. Use Core Web Vitals thresholds only for appropriate field or declared lab data—not raw fetch latency.

### 10. International, mobile, and media parity

Validate hreflang syntax/reciprocity/targets, language consistency, mobile content/link/directive parity, viewport availability, responsive images, image alt state, captions/transcripts, and mobile-only rendering failures. Enable international rules only when alternate-language evidence exists.

## Business-analysis layer

The same engine can run non-ranking business checks once these additional immutable capabilities exist:

- `content-text` — normalized primary and boilerplate text with hashes;
- `content-markdown` — ordered page sections, headings, tables, lists, FAQs, CTAs, and evidence ranges;
- `structured-data` — parsed entity graphs and visible-content comparisons;
- `resource-fetch` — actual request/byte observations;
- `field-performance` — Search Console/CrUX-like field evidence;
- `international` — normalized language and alternate relationships;
- `prior-crawl` — stable previous entities and findings.

That enables persona candidates, product/service inventories, funnel coverage, missing trust evidence, pages without conversion paths, topic clusters, cannibalization candidates, content gaps, and claim consistency. These remain `opportunity` findings with `heuristic` confidence unless supported by deterministic evidence.

## Evidence and versioning requirements

Every rule must:

1. use a globally unique stable ID and semantic version;
2. declare every required capability;
3. preserve issue/warning/opportunity separately from severity;
4. return affected URLs and typed evidence; edge rules preserve every source → target occurrence and its provenance;
5. avoid findings on error templates unless explicitly designed for errors;
6. add unit tests for pass, fail, unavailable capability, and schema rejection;
7. bump its version whenever interpretation or thresholds change;
8. never claim indexing, ranking, rich-result eligibility, or AI citation as a guaranteed outcome.

The research baseline is Google Search Central's technical requirements, crawling/indexing guidance, canonical guidance, JavaScript guidance, sitemap documentation, structured-data documentation, mobile-first guidance, and Core Web Vitals documentation. Professional crawler catalogs are useful for coverage ideas but do not turn contextual recommendations into search-engine rules.
