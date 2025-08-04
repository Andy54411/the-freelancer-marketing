import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  // Admin Authentication Protection
  if (
    request.nextUrl.pathname.startsWith('/dashboard/admin') &&
    !request.nextUrl.pathname.startsWith('/dashboard/admin/login')
  ) {
    // Check if admin session exists
    const adminToken = request.cookies.get('taskilo_admin_session')?.value;

    if (!adminToken) {
      // Redirect to login page if no session
      return NextResponse.redirect(new URL('/dashboard/admin/login', request.url));
    }
  }

  // Skip internationalization for admin routes and API routes
  if (
    request.nextUrl.pathname.startsWith('/dashboard/admin') ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Apply internationalization middleware for other routes
  return createMiddleware({
    locales: ['de', 'en', 'fr', 'es'],
    defaultLocale: 'de',
  })(request);
}

export const config = {
  // Apply to all routes except static files
  matcher: ['/((?!_next|favicon.ico|images|icon).*)'],
};
// Force redeploy Mo  4 Aug 2025 19:16:04 CEST
