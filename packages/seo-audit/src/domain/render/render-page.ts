import type { Browser, CDPSession, Request } from "playwright";
import type { BrowserConsoleEvent } from "./browser-console-event.schema.ts";
import type { BrowserLongTask } from "./browser-long-task.schema.ts";
import type { BrowserResourceObservation } from "./browser-resource-observation.schema.ts";
import type { BrowserRuntimeMetrics } from "./browser-runtime-metrics.schema.ts";
import { type CdpPerformanceMetrics, CdpPerformanceMetricsSchema } from "./cdp-performance-metrics.schema.ts";
import { compareRuntimeMetrics } from "./compare-runtime-metrics.ts";
import { stabilityInitScript } from "./content-stability.ts";
import { longTaskObserverInitScript } from "./long-task-observer.ts";
import type { RenderJob } from "./render-job.schema.ts";
import type { RenderObservation } from "./render-observation.schema.ts";

export async function renderPage(browser: Browser, job: RenderJob): Promise<RenderObservation> {
  const started = performance.now();
  const context = await browser.newContext({
    userAgent: job.userAgent,
    viewport: { width: 412, height: 915 },
    locale: "en-NZ",
    timezoneId: "Pacific/Auckland",
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  await page.addInitScript({ content: stabilityInitScript });
  await page.addInitScript({ content: longTaskObserverInitScript });
  let cdpSession: CDPSession | undefined;
  let runtimeBaseline: CdpPerformanceMetrics | undefined;
  let runtimeMetricsUnavailableReason: string | undefined;
  try {
    cdpSession = await context.newCDPSession(page);
    await cdpSession.send("Performance.enable", { timeDomain: "threadTicks" });
    runtimeBaseline = CdpPerformanceMetricsSchema.parse(await cdpSession.send("Performance.getMetrics"));
  } catch (error) {
    runtimeMetricsUnavailableReason = error instanceof Error ? error.message : String(error);
  }
  let requests = 0;
  let relevantInFlight = 0;
  let lastRelevantNetwork = performance.now();
  let domContentLoadedMs: number | undefined;
  let loadMs: number | undefined;
  let contentStableMs: number | undefined;
  const requestCounts: Record<string, number> = {};
  const failedRequests: Array<{ url: string; resourceType: string; errorText: string }> = [];
  const resources: BrowserResourceObservation[] = [];
  const consoleEvents: BrowserConsoleEvent[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const clientRedirects: string[] = [];
  let lastContentSignature = "";
  let lastContentChange = started;
  let requestSequence = 0;
  let consoleSequence = 0;
  let consoleMessages = 0;
  const requestSequences = new WeakMap<Request, number>();
  const pendingResourceCaptures = new Set<Promise<void>>();
  const relevantTypes = new Set(["document", "script", "xhr", "fetch"]);

  const captureRuntimeMetrics = async (): Promise<BrowserRuntimeMetrics | undefined> => {
    if (!cdpSession || !runtimeBaseline) return undefined;
    try {
      const after = CdpPerformanceMetricsSchema.parse(await cdpSession.send("Performance.getMetrics"));
      return compareRuntimeMetrics(runtimeBaseline, after);
    } catch (error) {
      runtimeMetricsUnavailableReason = error instanceof Error ? error.message : String(error);
      return undefined;
    }
  };
  const captureLongTasks = async (): Promise<{ entries: BrowserLongTask[]; truncated: boolean }> =>
    page
      .evaluate(() => {
        const state = (
          window as unknown as {
            __SEO_AUDIT_LONG_TASKS__?: { entries: BrowserLongTask[]; total: number };
          }
        ).__SEO_AUDIT_LONG_TASKS__;
        return { entries: state?.entries ?? [], truncated: (state?.total ?? 0) > (state?.entries.length ?? 0) };
      })
      .catch(() => ({ entries: [], truncated: false }));

  const duration = (request: Request): number | undefined => {
    const responseEnd = request.timing().responseEnd;
    return responseEnd >= 0 ? responseEnd : undefined;
  };
  const trackResource = (request: Request): void => {
    const capture = (async () => {
      if (resources.length >= 500) return;
      const response = await request.response();
      const sizes = await request.sizes().catch(() => undefined);
      const durationMs = duration(request);
      resources.push({
        sequence: requestSequences.get(request) ?? requestSequence++,
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        ...(response
          ? {
              status: response.status(),
              mimeType: response.headers()["content-type"] ?? "",
              fromServiceWorker: response.fromServiceWorker(),
            }
          : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
        ...(sizes
          ? {
              sizes: {
                requestBodyBytes: sizes.requestBodySize,
                requestHeaderBytes: sizes.requestHeadersSize,
                responseBodyBytes: sizes.responseBodySize,
                responseHeaderBytes: sizes.responseHeadersSize,
              },
            }
          : {}),
      });
    })();
    pendingResourceCaptures.add(capture);
    void capture.then(
      () => pendingResourceCaptures.delete(capture),
      () => pendingResourceCaptures.delete(capture),
    );
  };
  const settleResourceCaptures = async (): Promise<void> => {
    while (pendingResourceCaptures.size > 0) await Promise.allSettled([...pendingResourceCaptures]);
  };
  page.on("domcontentloaded", () => {
    domContentLoadedMs = performance.now() - started;
  });
  page.on("load", () => {
    loadMs = performance.now() - started;
  });
  page.on("framenavigated", (frame) => {
    if (domContentLoadedMs !== undefined && frame === page.mainFrame() && frame.url() !== job.url && !clientRedirects.includes(frame.url()))
      clientRedirects.push(frame.url());
  });
  page.on("request", (request) => {
    requestSequences.set(request, requestSequence++);
    requests += 1;
    const type = request.resourceType();
    requestCounts[type] = (requestCounts[type] ?? 0) + 1;
    if (relevantTypes.has(type)) relevantInFlight += 1;
  });
  page.on("requestfinished", (request) => {
    trackResource(request);
    if (!relevantTypes.has(request.resourceType())) return;
    relevantInFlight = Math.max(0, relevantInFlight - 1);
    lastRelevantNetwork = performance.now();
  });
  page.on("requestfailed", (request) => {
    const type = request.resourceType();
    if (relevantTypes.has(type)) {
      relevantInFlight = Math.max(0, relevantInFlight - 1);
      lastRelevantNetwork = performance.now();
    }
    const errorText = request.failure()?.errorText ?? "unknown failure";
    failedRequests.push({ url: request.url(), resourceType: type, errorText });
    if (resources.length < 500) {
      const durationMs = duration(request);
      resources.push({
        sequence: requestSequences.get(request) ?? requestSequence++,
        url: request.url(),
        method: request.method(),
        resourceType: type,
        ...(durationMs !== undefined ? { durationMs } : {}),
        failureText: errorText,
      });
    }
  });
  page.on("console", (message) => {
    consoleMessages += 1;
    const text = message.text();
    const type = message.type();
    if (consoleEvents.length < 200) {
      const location = message.location();
      consoleEvents.push({
        sequence: consoleSequence++,
        type,
        text,
        timestampMs: performance.now() - started,
        location: {
          url: location.url,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
        },
      });
    }
    if (type === "error") consoleErrors.push(text);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: job.timeoutMs });
    const browserRawHtml = response ? await response.text().catch(() => "") : "";
    const deadline = started + job.timeoutMs;
    let termination: RenderObservation["termination"] = "hard-timeout";
    while (performance.now() < deadline) {
      const stability = await page.evaluate(() => {
        const state = (window as unknown as { __SEO_AUDIT_STABILITY__?: { lastMutation: number; mutationCount: number } }).__SEO_AUDIT_STABILITY__;
        const body = document.body;
        const content = body?.innerText ?? "";
        let hash = 2166136261;
        for (let index = 0; index < content.length; index += 1) hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
        const signature = [
          document.title,
          hash >>> 0,
          content.length,
          document.querySelector("link[rel~='canonical']")?.getAttribute("href") ?? "",
          document.querySelector("meta[name='robots' i]")?.getAttribute("content") ?? "",
          document.querySelectorAll("a[href]").length,
          document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
          document.querySelectorAll("*").length,
        ].join("|");
        return { mutationCount: state?.mutationCount ?? 0, signature };
      });
      const now = performance.now();
      if (stability.signature !== lastContentSignature) {
        lastContentSignature = stability.signature;
        lastContentChange = now;
      }
      if (now - started >= 1_000 && now - lastContentChange >= job.quietWindowMs && now - lastRelevantNetwork >= 750 && relevantInFlight === 0) {
        termination = "stable";
        contentStableMs = now - started;
        break;
      }
      await Bun.sleep(250);
    }
    await settleResourceCaptures();
    const [runtimeMetrics, longTasks] = await Promise.all([captureRuntimeMetrics(), captureLongTasks()]);
    return {
      jobId: job.jobId,
      url: page.url() || job.url,
      browserRawHtml,
      renderedHtml: await page.content(),
      termination,
      durationMs: performance.now() - started,
      requests,
      consoleMessages,
      requestCounts,
      checkpoints: {
        ...(domContentLoadedMs !== undefined ? { domContentLoadedMs } : {}),
        ...(loadMs !== undefined ? { loadMs } : {}),
        ...(contentStableMs !== undefined ? { contentStableMs } : {}),
      },
      mutationCount: await page.evaluate(
        () => (window as unknown as { __SEO_AUDIT_STABILITY__?: { mutationCount: number } }).__SEO_AUDIT_STABILITY__?.mutationCount ?? 0,
      ),
      ...(runtimeMetrics ? { runtimeMetrics } : {}),
      ...(runtimeMetricsUnavailableReason ? { runtimeMetricsUnavailableReason } : {}),
      longTasks: longTasks.entries,
      longTasksTruncated: longTasks.truncated,
      resources: resources.sort((left, right) => left.sequence - right.sequence).slice(0, 500),
      resourcesTruncated: resources.length > 500,
      consoleEvents,
      consoleEventsTruncated: consoleMessages > consoleEvents.length,
      failedRequests: failedRequests.slice(0, 100),
      consoleErrors: consoleErrors.slice(0, 50),
      pageErrors: pageErrors.slice(0, 50),
      clientRedirects: clientRedirects.slice(0, 20),
      ...(response ? { documentStatus: response.status() } : {}),
    };
  } catch (error) {
    await settleResourceCaptures();
    const [runtimeMetrics, longTasks] = await Promise.all([captureRuntimeMetrics(), captureLongTasks()]);
    return {
      jobId: job.jobId,
      url: job.url,
      browserRawHtml: "",
      renderedHtml: await page.content().catch(() => ""),
      termination: "navigation-error",
      durationMs: performance.now() - started,
      requests,
      consoleMessages,
      requestCounts,
      checkpoints: { ...(domContentLoadedMs !== undefined ? { domContentLoadedMs } : {}), ...(loadMs !== undefined ? { loadMs } : {}) },
      mutationCount: 0,
      ...(runtimeMetrics ? { runtimeMetrics } : {}),
      ...(runtimeMetricsUnavailableReason ? { runtimeMetricsUnavailableReason } : {}),
      longTasks: longTasks.entries,
      longTasksTruncated: longTasks.truncated,
      resources: resources.sort((left, right) => left.sequence - right.sequence).slice(0, 500),
      resourcesTruncated: resources.length > 500,
      consoleEvents,
      consoleEventsTruncated: consoleMessages > consoleEvents.length,
      failedRequests: failedRequests.slice(0, 100),
      consoleErrors: consoleErrors.slice(0, 50),
      pageErrors: [...pageErrors, error instanceof Error ? error.message : String(error)].slice(0, 50),
      clientRedirects: clientRedirects.slice(0, 20),
    };
  } finally {
    await context.close();
  }
}
