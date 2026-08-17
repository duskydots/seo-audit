import { describe, expect, test } from "bun:test";
import { normalizeUrl } from "../../packages/seo-audit/src/domain/url/normalize-url.ts";

describe("normalizeUrl", () => {
  test("resolves relative URLs, removes fragments and default ports", () => {
    expect(normalizeUrl("../about#team", "https://EXAMPLE.com:443/products/item")).toEqual({ ok: true, value: "https://example.com/about" });
  });

  test("preserves query order and path case", () => {
    expect(normalizeUrl("https://example.com/A?b=2&a=1")).toEqual({ ok: true, value: "https://example.com/A?b=2&a=1" });
  });

  test("rejects unsupported schemes", () => {
    expect(normalizeUrl("mailto:test@example.com")).toEqual({ ok: false, error: "unsupported-scheme" });
  });
});
