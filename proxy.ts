import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Zero Trust Proxy - Validates sessions and sanitizes headers.
// Uses getToken (JWT only) so we do NOT import @/lib/auth or Prisma in the proxy bundle
// (middleware/proxy cannot resolve generated Prisma client).

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/auth/error",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/api/auth",
  ];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith("/api");

  if (!isPublicRoute && !isApiRoute) {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    const token = await getToken({
      req: request,
      secret,
    });
    if (!token) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Sanitize headers for security
  const response = NextResponse.next();

  // Remove sensitive headers
  response.headers.delete("x-powered-by");
  response.headers.delete("server");

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
