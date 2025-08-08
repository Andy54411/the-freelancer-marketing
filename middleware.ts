import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  // Company Dashboard Onboarding Protection (nach Dokumentation)
  if (request.nextUrl.pathname.startsWith('/dashboard/company/')) {
    const onboardingCheck = checkCompanyOnboardingStatus(request);
    if (onboardingCheck) return onboardingCheck;
  }

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

function checkCompanyOnboardingStatus(request: NextRequest) {
  try {
    // Get user UID from path
    const pathSegments = request.nextUrl.pathname.split('/');
    const companyUid = pathSegments[3]; // /dashboard/company/[uid]/...
    
    if (!companyUid) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    
    // Allow onboarding pages (nicht blockieren)
    if (pathSegments[4] === 'onboarding') {
      return null; // Continue to onboarding
    }
    
    // Check onboarding status via Firestore Admin SDK
    // TODO: Implement Firestore Admin check für onboarding status
    // For now, allow all access (wird in Phase 2 implementiert)
    
    return null; // Continue (no blocking for now)
    
  } catch (error) {
    console.error('Middleware onboarding check error:', error);
    return null; // Continue on error
  }
}

export const config = {
  // Apply to all routes except static files
  matcher: ['/((?!_next|favicon.ico|images|icon).*)'],
};
