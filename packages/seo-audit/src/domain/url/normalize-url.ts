import { type DomainResult, err, ok } from "../../shared/result.ts";

export type NormalizeUrlError = "invalid-url" | "unsupported-scheme";

export function normalizeUrl(input: string, base?: string): DomainResult<string, NormalizeUrlError> {
  try {
    const url = base ? new URL(input, base) : new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return err("unsupported-scheme");
    }
    url.hash = "";
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
      url.port = "";
    }
    return ok(url.href);
  } catch {
    return err("invalid-url");
  }
}

export function isSameOrigin(url: string, origin: string): boolean {
  return new URL(url).origin === origin;
}
