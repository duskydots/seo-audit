import { describe, expect, test } from "bun:test";
import { readBoundedResponseBody } from "../../packages/seo-audit/src/domain/http/read-bounded-response-body.ts";
import { mayFollowRedirect } from "../../packages/seo-audit/src/domain/http/redirect-policy.ts";

describe("HTTP safety policy", () => {
  test("follows only redirects within the seed origin", () => {
    expect(mayFollowRedirect("https://example.com/start", "https://example.com/final")).toBeTrue();
    expect(mayFollowRedirect("https://example.com/start", "https://www.example.com/final")).toBeFalse();
    expect(mayFollowRedirect("https://example.com/start", "http://169.254.169.254/latest/meta-data")).toBeFalse();
  });

  test("reads a response within the decoded byte limit", async () => {
    const body = await readBoundedResponseBody(new Response("hello"), 5);
    expect(new TextDecoder().decode(body)).toBe("hello");
  });

  test("rejects declared and streamed bodies over the limit", async () => {
    await expect(readBoundedResponseBody(new Response("hello", { headers: { "content-length": "5" } }), 4)).rejects.toThrow("exceeds 4 bytes");
    await expect(readBoundedResponseBody(new Response("hello"), 4)).rejects.toThrow("exceeds 4 bytes");
  });
});
