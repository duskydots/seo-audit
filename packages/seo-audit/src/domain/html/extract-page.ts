import { createHash } from "node:crypto";
import { load } from "cheerio";
import { normalizeUrl } from "../url/normalize-url.ts";
import type { PageObservation } from "./page-observation.schema.ts";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function extractPage(html: string, documentUrl: string): PageObservation {
  const $ = load(html);
  const baseHref = $("base[href]").first().attr("href");
  const baseResult = baseHref ? normalizeUrl(baseHref, documentUrl) : undefined;
  const baseUrl = baseResult?.ok ? baseResult.value : documentUrl;
  const links: PageObservation["links"] = [];

  const pushLink = (raw: string | undefined, kind: PageObservation["links"][number]["kind"], text = "", rel: string[] = []) => {
    if (!raw) return;
    const result = normalizeUrl(raw, baseUrl);
    if (!result.ok) return;
    links.push({ url: result.value, kind, text: cleanText(text), rel });
  };

  $("a[href], area[href]").each((_, element) => {
    const item = $(element);
    const imageAlt = item.find("img[alt]").first().attr("alt") ?? "";
    const rel = (item.attr("rel") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    pushLink(item.attr("href"), "anchor", item.text() || imageAlt || item.attr("title") || "", rel);
  });
  $("img[src]").each((_, element) => pushLink($(element).attr("src"), "image", $(element).attr("alt") ?? ""));
  $("script[src]").each((_, element) => pushLink($(element).attr("src"), "script"));
  $("link[rel~='stylesheet'][href]").each((_, element) => pushLink($(element).attr("href"), "stylesheet"));

  const canonicalRaw = $("link[rel~='canonical'][href]").first().attr("href");
  const canonicalResult = canonicalRaw ? normalizeUrl(canonicalRaw, baseUrl) : undefined;
  if (canonicalResult?.ok) pushLink(canonicalRaw, "canonical");

  const robots = $("meta[name='robots' i], meta[name='googlebot' i]")
    .map((_, element) => $(element).attr("content") ?? "")
    .get()
    .flatMap((value) =>
      value
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean),
    );
  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_, element) => ({
      level: Number(element.tagName.slice(1)),
      text: cleanText($(element).text()),
    }))
    .get();
  const scriptCount = $("script").length;
  const imageCount = $("img").length;
  const missingAltCount = $("img:not([alt])").length;
  const jsonLd = $("script[type='application/ld+json' i]")
    .map((_, element) => {
      const raw = $(element).text().trim();
      try {
        const parsed: unknown = JSON.parse(raw);
        const values = Array.isArray(parsed) ? parsed : [parsed];
        const types = values.flatMap((value) => {
          if (!value || typeof value !== "object" || !("@type" in value)) return [];
          const type = (value as { "@type"?: unknown })["@type"];
          return Array.isArray(type) ? type.filter((item): item is string => typeof item === "string") : typeof type === "string" ? [type] : [];
        });
        return { hash: createHash("sha256").update(raw).digest("hex"), valid: true, types: [...new Set(types)].sort() };
      } catch {
        return { hash: createHash("sha256").update(raw).digest("hex"), valid: false, types: [] };
      }
    })
    .get();
  $("script,style,noscript,template,svg").remove();
  const bodyText = cleanText($("body").text());
  const words = bodyText ? bodyText.split(/\s+/u).filter(Boolean) : [];
  const title = cleanText($("title").first().text());
  const description = cleanText($("meta[name='description' i]").first().attr("content") ?? "");

  return {
    ...($("html").first().attr("lang") ? { lang: cleanText($("html").first().attr("lang")!) } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(canonicalResult?.ok ? { canonical: canonicalResult.value } : {}),
    robots: [...new Set(robots)],
    headings,
    wordCount: words.length,
    scriptCount,
    imageCount,
    missingAltCount,
    normalizedText: bodyText,
    jsonLd,
    links,
  };
}
