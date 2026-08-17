import { describe, expect, test } from "bun:test";
import { pageMatchesQuery } from "../../apps/report-ui/src/page-matches-query.ts";

const page = {
  url: "https://example.com/Guides/Technical-SEO",
  title: "Technical SEO guide",
};

describe("pageMatchesQuery", () => {
  test("accepts an empty or whitespace-only filter", () => {
    expect(pageMatchesQuery(page, "")).toBe(true);
    expect(pageMatchesQuery(page, "   ")).toBe(true);
  });

  test("matches URL substrings without case sensitivity", () => {
    expect(pageMatchesQuery(page, "/guides/technical-seo")).toBe(true);
  });

  test("matches title substrings and trims the filter", () => {
    expect(pageMatchesQuery(page, "  SEO GUIDE  ")).toBe(true);
  });

  test("rejects pages that do not contain the filter", () => {
    expect(pageMatchesQuery(page, "pricing")).toBe(false);
  });
});
