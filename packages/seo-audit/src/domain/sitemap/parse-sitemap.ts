import { XMLParser } from "fast-xml-parser";
import { normalizeUrl } from "../url/normalize-url.ts";
import type { SitemapDocument } from "./sitemap.schema.ts";

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, trimValues: true });

function arrayOf<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseSitemap(xml: string, sitemapUrl: string): SitemapDocument | undefined {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object") return undefined;
  const root = parsed as Record<string, unknown>;
  const isIndex = typeof root.sitemapindex === "object" && root.sitemapindex !== null;
  const container = (isIndex ? root.sitemapindex : root.urlset) as Record<string, unknown> | undefined;
  if (!container) return undefined;
  const rawEntries = arrayOf((isIndex ? container.sitemap : container.url) as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const entries = rawEntries.flatMap((entry) => {
    const loc = typeof entry.loc === "string" ? entry.loc : undefined;
    if (!loc) return [];
    const normalized = normalizeUrl(loc, sitemapUrl);
    if (!normalized.ok) return [];
    return [
      {
        location: normalized.value,
        ...(typeof entry.lastmod === "string" ? { lastModified: entry.lastmod } : {}),
      },
    ];
  });
  return { url: sitemapUrl, kind: isIndex ? "index" : "urlset", entries };
}
