import type { RobotsPolicy } from "./robots-record.schema.ts";

export function parseRobots(text: string, url: string, status: number): RobotsPolicy {
  const groups: RobotsPolicy["groups"] = [];
  const sitemaps: string[] = [];
  let current: RobotsPolicy["groups"][number] | undefined;
  let rulesStarted = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "sitemap") {
      try {
        sitemaps.push(new URL(value, url).href);
      } catch {
        /* retain no invalid sitemap */
      }
      continue;
    }
    if (field === "user-agent") {
      if (!current || rulesStarted) {
        current = { userAgents: [], allow: [], disallow: [] };
        groups.push(current);
        rulesStarted = false;
      }
      current.userAgents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    if (field === "allow") {
      if (value) current.allow.push(value);
      rulesStarted = true;
    } else if (field === "disallow") {
      if (value) current.disallow.push(value);
      rulesStarted = true;
    }
  }
  return { url, status, groups, sitemaps: [...new Set(sitemaps)] };
}
