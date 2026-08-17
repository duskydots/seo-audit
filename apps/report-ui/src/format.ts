export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-NZ").format(value);
}

export function formatBytes(value?: number): string {
  if (value === undefined) return "—";
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} kB`;
  return `${(value / 1_048_576).toFixed(1)} MB`;
}

export function hostLabel(url: string): string {
  return new URL(url).host;
}
