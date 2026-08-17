import { normalizeUrl } from "../url/normalize-url.ts";
import { readBoundedResponseBody } from "./read-bounded-response-body.ts";
import { mayFollowRedirect } from "./redirect-policy.ts";

export type RedirectHop = { url: string; status: number; target: string };

export type FetchResourceResult = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  statusText: string;
  contentType: string;
  headers: Record<string, string>;
  body: Uint8Array;
  text?: string;
  durationMs: number;
  redirectChain: RedirectHop[];
};

export async function fetchResource(
  url: string,
  options: { userAgent: string; timeoutMs: number; maxRedirects?: number; maxBodyBytes?: number },
): Promise<FetchResourceResult> {
  const started = performance.now();
  const redirectChain: RedirectHop[] = [];
  let current = url;
  const maxRedirects = options.maxRedirects ?? 10;
  const maxBodyBytes = options.maxBodyBytes ?? 10 * 1024 * 1024;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: { "user-agent": options.userAgent, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const target = location ? normalizeUrl(location, current) : undefined;
      if (!target?.ok) {
        return buildResult(url, current, response, new Uint8Array(), started, redirectChain);
      }
      redirectChain.push({ url: current, status: response.status, target: target.value });
      if (!mayFollowRedirect(url, target.value)) {
        return buildResult(url, current, response, new Uint8Array(), started, redirectChain);
      }
      if (redirectChain.some((entry, index) => entry.target === target.value && index < redirectChain.length - 1)) {
        return buildResult(url, current, response, new Uint8Array(), started, redirectChain);
      }
      current = target.value;
      continue;
    }
    const body = await readBoundedResponseBody(response, maxBodyBytes);
    return buildResult(url, current, response, body, started, redirectChain);
  }
  throw new Error(`Too many redirects for ${url}`);
}

function buildResult(
  requestedUrl: string,
  finalUrl: string,
  response: Response,
  body: Uint8Array,
  started: number,
  redirectChain: RedirectHop[],
): FetchResourceResult {
  const contentType = response.headers.get("content-type") ?? "";
  const textual = /(?:text|html|xml|json|javascript)/i.test(contentType);
  return {
    requestedUrl,
    finalUrl,
    status: response.status,
    statusText: response.statusText,
    contentType,
    headers: Object.fromEntries(response.headers.entries()),
    body,
    ...(textual ? { text: new TextDecoder().decode(body) } : {}),
    durationMs: performance.now() - started,
    redirectChain,
  };
}
