/**
 * Cross-site request protection for state-changing API routes.
 *
 * Sec-Fetch-Site is a forbidden browser request header. Browsers mark requests
 * initiated by the current page as "same-origin", even when a reverse proxy
 * forwards the public HTTPS hostname to an internal HTTP localhost address.
 * Other sites cannot forge this signal from browser JavaScript or HTML forms.
 *
 * For clients without Fetch Metadata headers, preserve strict Origin checking
 * against the request Host and its externally forwarded protocol.
 */
export function isSameOriginWrite(request: Pick<Request, "url" | "headers">): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;
  if (fetchSite === "same-origin") return true;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const expected = new URL(request.url);
    // Use Host, not X-Forwarded-Host: untrusted forwarded-host values can be spoofed.
    const host = request.headers.get("host");
    if (host) expected.host = host;

    // HTTPS-terminating proxies may forward requests to Next over HTTP.
    // This never bypasses the host comparison.
    const proto = request.headers.get("x-forwarded-proto");
    if (proto === "http" || proto === "https") expected.protocol = proto + ":";

    return origin === expected.origin;
  } catch {
    return false;
  }
}
