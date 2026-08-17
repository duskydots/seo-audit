import type { PageObservation } from "../html/page-observation.schema.ts";
import type { PageRepresentation } from "./page-representation.schema.ts";
import { type RenderDelta, RenderDeltaSchema } from "./render-delta.schema.ts";

function textDelta(raw: string | undefined, rendered: string | undefined) {
  const state = raw === rendered ? "unchanged" : !raw && rendered ? "added" : raw && !rendered ? "removed" : "changed";
  return { state, ...(raw !== undefined ? { raw } : {}), ...(rendered !== undefined ? { rendered } : {}) } as const;
}

function difference<T>(left: readonly T[], right: readonly T[], key: (value: T) => string): T[] {
  const rightKeys = new Set(right.map(key));
  return left.filter((value) => !rightKeys.has(key(value)));
}

function words(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function jaccard(left: string, right: string): number {
  const a = words(left);
  const b = words(right);
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function comparePageRepresentations(raw: PageRepresentation, rendered: PageRepresentation): RenderDelta {
  const a: PageObservation = raw.observation;
  const b: PageObservation = rendered.observation;
  const rawTokens = a.normalizedText.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const renderedTokens = b.normalizedText.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const headingKey = (value: PageObservation["headings"][number]) => `${value.level}|${value.text}`;
  const linkKey = (value: PageObservation["links"][number]) => `${value.kind}|${value.url}`;
  const rawJsonLd = a.jsonLd.map((value) => value.hash);
  const renderedJsonLd = b.jsonLd.map((value) => value.hash);
  return RenderDeltaSchema.parse({
    schemaVersion: 1,
    title: textDelta(a.title, b.title),
    description: textDelta(a.description, b.description),
    canonical: textDelta(a.canonical, b.canonical),
    lang: textDelta(a.lang, b.lang),
    robotsAdded: difference(b.robots, a.robots, String),
    robotsRemoved: difference(a.robots, b.robots, String),
    headingsAdded: difference(b.headings, a.headings, headingKey),
    headingsRemoved: difference(a.headings, b.headings, headingKey),
    linksAdded: difference(b.links, a.links, linkKey),
    linksRemoved: difference(a.links, b.links, linkKey),
    jsonLdAdded: difference(renderedJsonLd, rawJsonLd, String),
    jsonLdRemoved: difference(rawJsonLd, renderedJsonLd, String),
    rawWordCount: a.wordCount,
    renderedWordCount: b.wordCount,
    addedWords: Math.max(0, renderedTokens - rawTokens),
    removedWords: Math.max(0, rawTokens - renderedTokens),
    textSimilarity: jaccard(a.normalizedText, b.normalizedText),
  });
}
