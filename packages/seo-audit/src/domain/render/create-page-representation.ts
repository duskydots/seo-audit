import { createHash } from "node:crypto";
import { extractPage } from "../html/extract-page.ts";
import { type PageRepresentation, PageRepresentationSchema, type RepresentationSource } from "./page-representation.schema.ts";

export function createPageRepresentation(source: RepresentationSource, html: string, url: string): PageRepresentation {
  const htmlHash = createHash("sha256").update(html).digest("hex");
  return PageRepresentationSchema.parse({
    schemaVersion: 1,
    source,
    url,
    htmlHash,
    htmlBytes: Buffer.byteLength(html),
    bodyPath: `evidence/bodies/${htmlHash}.html`,
    observation: extractPage(html, url),
  });
}
