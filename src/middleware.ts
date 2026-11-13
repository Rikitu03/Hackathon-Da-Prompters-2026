import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  // The fictional /admin/demo UI never reads or writes privileged records.
  // Do not perform a remote Supabase getUser() call just to render this preview:
  // an unreachable auth service can otherwise stall the request in Codespaces.
  // Keep the real /admin and /api/admin routes fully protected.
  if (request.nextUrl.pathname === "/admin/demo" || request.nextUrl.pathname.startsWith("/admin/demo/")) {
    const preview = NextResponse.next({ request });
    preview.headers.set("Cache-Control", "private, no-store");
    return preview;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const client = createServerClient(url, key, {
      cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values: { name: string; value: string; options: CookieOptions }[]) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Verify the identity and refresh cookies; API handlers independently authorize every request.
    await client.auth.getUser();
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*"] };
