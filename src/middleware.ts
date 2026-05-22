import { NextRequest, NextResponse } from "next/server";

// Protects the worker pages (/me, /api) behind HTTP Basic auth.
// If SITE_USERNAME or SITE_PASSWORD aren't set (local dev), auth is skipped.
// Dad's read-only view (/dad/[token]) is intentionally excluded — its URL
// token is already a 32-char random secret.

export function middleware(req: NextRequest) {
  const user = process.env.SITE_USERNAME;
  const pass = process.env.SITE_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const idx = decoded.indexOf(":");
        const u = decoded.slice(0, idx);
        const p = decoded.slice(idx + 1);
        if (u === user && p === pass) return NextResponse.next();
      } catch {
        // fall through to 401
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Hours for Dad", charset="UTF-8"',
    },
  });
}

export const config = {
  // Apply to everything except the dad route and Next.js internals/static files.
  matcher: ["/((?!dad/|_next/|favicon\\.ico|public/).*)"],
};
