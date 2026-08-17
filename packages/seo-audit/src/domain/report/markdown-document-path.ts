function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/^https?:\/\//u, "")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 80) || "item"
  );
}

export function issueMarkdownPath(index: number, total: number, ruleId: string): string {
  return `markdown/issues/${sequence(index, total)}-${slug(ruleId)}.md`;
}

export function pageMarkdownPath(index: number, total: number, url: string): string {
  return `markdown/pages/${sequence(index, total)}-${slug(url)}.md`;
}

function sequence(index: number, total: number): string {
  return String(index + 1).padStart(Math.max(4, String(total).length), "0");
}
