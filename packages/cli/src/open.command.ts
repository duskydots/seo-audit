import { extname, join, resolve } from "node:path";
import type { OpenCommand } from "./command.schema.ts";
import { loadAuditBundle } from "./load-audit-bundle.ts";
import { REPORT_UI_ARTIFACT_PATHS, REPORT_UI_DATA_FILES } from "./report-ui-files.ts";

export const REPORT_PORT = 4173;

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

export async function runOpenCommand(command: OpenCommand): Promise<void> {
  const uiDirectory = resolveReportUiDirectory();
  const auditDirectory = resolve(command.auditDirectory);
  if (!(await Bun.file(join(uiDirectory, "index.html")).exists())) {
    throw new Error("UI build is missing. Run `bun run build:ui` first.");
  }
  const bundle = await loadAuditBundle(auditDirectory);
  const generatedData = new Map<string, string>([["page-insights.json", `${JSON.stringify(bundle.pageInsights)}\n`]]);
  const server = startReportServer(auditDirectory, uiDirectory, generatedData);
  console.log(`SEO audit UI: http://localhost:${server.port}`);
  console.log(`Reading: ${auditDirectory}`);
  await new Promise<never>(() => undefined);
}

export function startReportServer(
  auditDirectory: string,
  uiDirectory: string,
  generatedData: ReadonlyMap<string, string> = new Map(),
): ReturnType<typeof Bun.serve> {
  try {
    return Bun.serve({
      hostname: "127.0.0.1",
      port: REPORT_PORT,
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/data/")) {
          const name = url.pathname.slice("/data/".length);
          if (!(REPORT_UI_DATA_FILES as readonly string[]).includes(name)) return new Response("Not found", { status: 404 });
          const generated = generatedData.get(name);
          if (generated !== undefined) return response(generated, contentTypes[extname(name)] ?? "application/octet-stream");
          const structuredPath = REPORT_UI_ARTIFACT_PATHS[name as keyof typeof REPORT_UI_ARTIFACT_PATHS];
          const structuredFile = Bun.file(join(auditDirectory, structuredPath));
          if (await structuredFile.exists()) return response(structuredFile, contentTypes[extname(name)] ?? "application/octet-stream");
          const legacyFile = Bun.file(join(auditDirectory, name));
          return (await legacyFile.exists())
            ? response(legacyFile, contentTypes[extname(name)] ?? "application/octet-stream")
            : new Response("Not found", { status: 404 });
        }
        const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
        if (requested === "index.html" || /^assets\/[a-zA-Z0-9._-]+$/.test(requested)) {
          const file = Bun.file(join(uiDirectory, requested));
          if (await file.exists()) return response(file, contentTypes[extname(requested)] ?? "application/octet-stream");
        }
        return response(Bun.file(join(uiDirectory, "index.html")), "text/html; charset=utf-8");
      },
    });
  } catch (error) {
    throw new Error(`Cannot open the audit report: http://localhost:${REPORT_PORT} is unavailable. Stop the process using port ${REPORT_PORT} and retry.`, {
      cause: error,
    });
  }
}

export function resolveReportUiDirectory(): string {
  return resolve(import.meta.dir, "../ui-dist");
}

function response(body: BodyInit, contentType: string): Response {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "content-security-policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}
