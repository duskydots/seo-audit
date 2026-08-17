import { describe, expect, test } from "bun:test";
import { isAllowedByRobots } from "../../packages/seo-audit/src/domain/robots/evaluate-robots.ts";
import { parseRobots } from "../../packages/seo-audit/src/domain/robots/parse-robots.ts";

describe("robots", () => {
  const policy = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/public\nSitemap: /sitemap.xml", "https://example.com/robots.txt", 200);

  test("uses the longest matching rule", () => {
    expect(isAllowedByRobots(policy, "https://example.com/private/page", "SeoAuditBot")).toBeFalse();
    expect(isAllowedByRobots(policy, "https://example.com/private/public/page", "SeoAuditBot")).toBeTrue();
  });

  test("extracts sitemap URLs", () => {
    expect(policy.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });
});
