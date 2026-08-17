import { createHash } from "node:crypto";

export function stableId(namespace: string, value: string): string {
  return `${namespace}_${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}
