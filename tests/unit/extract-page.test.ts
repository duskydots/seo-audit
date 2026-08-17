import { describe, expect, test } from "bun:test";
import { extractPage } from "../../packages/seo-audit/src/domain/html/extract-page.ts";

describe("extractPage", () => {
  test("extracts SEO fields and typed links", () => {
    const page = extractPage(
      `<!doctype html><html><head><title> Example </title><meta name="description" content="Useful page"><link rel="canonical" href="/"><script src="/app.js"></script></head><body><h1>Hello world</h1><h3>Details</h3><a href="/about"><img src="/hero.jpg" alt="About us"></a><img src="/missing.jpg"><p>Some useful content here.</p></body></html>`,
      "https://example.com/page",
    );
    expect(page.title).toBe("Example");
    expect(page.headings.map((heading) => heading.level)).toEqual([1, 3]);
    expect(page.links.find((link) => link.kind === "anchor")?.text).toBe("About us");
    expect(page.canonical).toBe("https://example.com/");
    expect(page.scriptCount).toBe(1);
    expect(page.imageCount).toBe(2);
    expect(page.missingAltCount).toBe(1);
  });
});
