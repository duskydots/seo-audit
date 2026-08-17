export function mayFollowRedirect(requestedUrl: string, targetUrl: string): boolean {
  return new URL(requestedUrl).origin === new URL(targetUrl).origin;
}
