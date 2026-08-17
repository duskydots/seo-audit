import type { RobotsPolicy } from "./robots-record.schema.ts";

function matches(path: string, rule: string): boolean {
  const escaped = rule
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")
    .replace(/\$$/, "$");
  return new RegExp(`^${escaped}`).test(path);
}

export function isAllowedByRobots(policy: RobotsPolicy, url: string, token: string): boolean {
  if (policy.status >= 400 && policy.status < 500) return true;
  if (policy.status >= 500 || policy.status === 0) return false;
  const lowerToken = token.toLowerCase();
  const exact = policy.groups.filter((group) => group.userAgents.some((agent) => lowerToken.includes(agent) && agent !== "*"));
  const groups = exact.length > 0 ? exact : policy.groups.filter((group) => group.userAgents.includes("*"));
  const path = `${new URL(url).pathname}${new URL(url).search}`;
  const decisions = groups
    .flatMap((group) => [
      ...group.allow.filter((rule) => matches(path, rule)).map((rule) => ({ allow: true, length: rule.length })),
      ...group.disallow.filter((rule) => matches(path, rule)).map((rule) => ({ allow: false, length: rule.length })),
    ])
    .sort((a, b) => b.length - a.length || Number(b.allow) - Number(a.allow));
  return decisions[0]?.allow ?? true;
}
