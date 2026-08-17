import { describe, expect, test } from "bun:test";
import { comparePageRepresentations } from "../../packages/seo-audit/src/domain/render/compare-page-representations.ts";
import { createPageRepresentation } from "../../packages/seo-audit/src/domain/render/create-page-representation.ts";
import { RenderDeltaSchema } from "../../packages/seo-audit/src/domain/render/render-delta.schema.ts";

describe("render representation comparison", () => {
  test("reports metadata, content and rendered-only link changes", () => {
    const raw = createPageRepresentation(
      "fetch_raw",
      "<!doctype html><html lang='en'><head><title>Raw</title><meta name='robots' content='index'><link rel='canonical' href='/raw'></head><body><h1>Raw</h1><a href='/raw-link'>Raw link</a><p>server content</p></body></html>",
      "https://example.com/page",
    );
    const rendered = createPageRepresentation(
      "rendered_dom",
      "<!doctype html><html lang='en'><head><title>Rendered</title><meta name='robots' content='noindex'><link rel='canonical' href='/canonical'></head><body><h1>Rendered</h1><a href='/raw-link'>Raw link</a><a href='/js-link'>JS link</a><p>server content plus rendered words</p></body></html>",
      "https://example.com/page",
    );
    const delta = comparePageRepresentations(raw, rendered);
    expect(delta.title.state).toBe("changed");
    expect(delta.canonical.rendered).toBe("https://example.com/canonical");
    expect(delta.robotsAdded).toContain("noindex");
    expect(delta.linksAdded.some((link) => link.url === "https://example.com/js-link")).toBeTrue();
    expect(delta.renderedWordCount).toBeGreaterThan(delta.rawWordCount);
    expect(RenderDeltaSchema.parse(JSON.parse(JSON.stringify(delta)))).toEqual(delta);
  });

  test("rejects unknown delta fields", () => {
    const representation = createPageRepresentation("fetch_raw", "<title>Same</title><p>same</p>", "https://example.com/");
    const delta = comparePageRepresentations(representation, { ...representation, source: "rendered_dom" });
    expect(RenderDeltaSchema.safeParse({ ...delta, surprise: true }).success).toBeFalse();
  });
});
