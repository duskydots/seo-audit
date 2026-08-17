import type { Finding } from "@duskydots/seo-audit/reporting";

export function SeverityPill({ severity }: { severity: Finding["severity"] }) {
  return <span className={`severity severity-${severity}`}>{severity}</span>;
}
