import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
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
