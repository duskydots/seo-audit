import { describe, expect, test } from "bun:test";
import { BrowserConsoleEventSchema } from "../../packages/seo-audit/src/domain/render/browser-console-event.schema.ts";
import { BrowserResourceObservationSchema } from "../../packages/seo-audit/src/domain/render/browser-resource-observation.schema.ts";
import { summarizeBrowserTelemetry } from "../../packages/seo-audit/src/domain/render/summarize-browser-telemetry.ts";

describe("browser telemetry", () => {
  test("validates strict console and resource observations", () => {
    const event = {
      sequence: 0,
      type: "warning",
      text: "deprecated",
      timestampMs: 12,
      location: { url: "https://example.com/app.js", lineNumber: 2, columnNumber: 3 },
    };
    const resource = {
      sequence: 0,
      url: "https://cdn.example.net/app.js",
      method: "GET",
      resourceType: "script",
      status: 200,
      sizes: { requestBodyBytes: 0, requestHeaderBytes: 120, responseBodyBytes: 600_000, responseHeaderBytes: 240 },
    };
    expect(BrowserConsoleEventSchema.parse(JSON.parse(JSON.stringify(event)))).toEqual(event);
    expect(BrowserResourceObservationSchema.parse(JSON.parse(JSON.stringify(resource)))).toEqual(resource);
    expect(BrowserConsoleEventSchema.safeParse({ ...event, unexpected: true }).success).toBeFalse();
    expect(BrowserResourceObservationSchema.safeParse({ ...resource, status: 700 }).success).toBeFalse();
  });

  test("summarizes JavaScript, third-party transfer and execution errors", () => {
    const summary = summarizeBrowserTelemetry("https://example.com/", {
      requests: 2,
      resources: [
        {
          sequence: 0,
          url: "https://cdn.example.net/app.js",
          method: "GET",
          resourceType: "script",
          status: 200,
          durationMs: 84.5,
          sizes: { requestBodyBytes: 0, requestHeaderBytes: 100, responseBodyBytes: 600_000, responseHeaderBytes: 200 },
        },
        { sequence: 1, url: "https://example.com/api", method: "GET", resourceType: "fetch", status: 500 },
      ],
      failedRequests: [{ url: "https://example.com/missing.js", resourceType: "script", errorText: "failed" }],
      consoleEvents: [
        { sequence: 0, type: "warning", text: "warning", timestampMs: 1, location: { url: "", lineNumber: 0, columnNumber: 0 } },
        { sequence: 1, type: "error", text: "error", timestampMs: 2, location: { url: "", lineNumber: 0, columnNumber: 0 } },
      ],
      pageErrors: ["runtime"],
    });
    expect(summary.javascriptBytes).toBe(600_200);
    expect(summary.javascriptLoadDurationMs).toBe(84.5);
    expect(summary.thirdPartyBytes).toBe(600_200);
    expect(summary.thirdPartyRequests).toBe(1);
    expect(summary.httpErrors).toBe(1);
    expect(summary.failedRequests).toBe(1);
    expect(summary.consoleWarnings).toBe(1);
    expect(summary.consoleErrors).toBe(1);
    expect(summary.pageErrors).toBe(1);
  });
});
