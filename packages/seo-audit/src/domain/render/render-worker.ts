import { type Browser, chromium } from "playwright";
import { renderPage } from "./render-page.ts";
import { CoordinatorMessageSchema, type RendererMessage } from "./render-worker-message.schema.ts";

function send(message: RendererMessage): void {
  if (typeof process.send === "function") process.send(message);
}

export async function runRenderWorker(): Promise<never> {
  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    send({ type: "error", jobId: "startup", error: error instanceof Error ? error.message : String(error) });
    process.exit(2);
  }
  send({ type: "ready", pid: process.pid, chromiumVersion: browser.version() });

  process.on("message", async (raw) => {
    const parsed = CoordinatorMessageSchema.safeParse(raw);
    if (!parsed.success) {
      send({ type: "error", jobId: "protocol", error: parsed.error.message });
      return;
    }
    if (parsed.data.type === "shutdown") {
      await browser.close();
      process.exit(0);
    }
    const job = parsed.data.job;
    try {
      const result = await renderPage(browser, job);
      send({ type: "result", jobId: job.jobId, result });
    } catch (error) {
      send({ type: "error", jobId: job.jobId, error: error instanceof Error ? error.message : String(error) });
    }
  });

  return await new Promise<never>(() => undefined);
}
