export function escapeMarkdownCell(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll("\n", " ").replaceAll("\r", " ");
}

export function markdownValue(value: string | number | undefined): string {
  if (value === undefined || value === "") return "—";
  return escapeMarkdownCell(String(value));
}
