import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Add edge runtime for middleware
export const runtime = 'edge';

// Middleware-Logs
function logMiddleware(message: string, request: NextRequest, additionalData?: any) {
  const timestamp = new Date().toISOString();
  const url = request.nextUrl.pathname;
  const method = request.method;
  const userAgent = request.headers.get('user-agent')?.substring(0, 100) || 'Unknown';

  console.log(`[MIDDLEWARE ${timestamp}] ${message}`, {
    url,
    method,
    userAgent,
    ...additionalData,
  });
}

export default async function middleware(request: NextRequest) {
  logMiddleware('Middleware ausgeführt', request);

  // Subdomain Routing
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Skip API and static paths for all subdomains
  const isApiOrStatic = pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/images/');

  // Helper function to add no-cache headers for subdomain rewrites
  const createSubdomainRewrite = (targetPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    const response = NextResponse.rewrite(url);
    // Prevent Vercel Edge from caching subdomain rewrites
    response.headers.set('x-middleware-cache', 'no-cache');
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  };

  // email.taskilo.de -> /webmail
  if (hostname.startsWith('email.') || hostname.startsWith('mail.')) {
    logMiddleware('Email Subdomain erkannt', request, { hostname });
    if (!pathname.startsWith('/webmail') && !isApiOrStatic) {
      return createSubdomainRewrite(`/webmail${pathname === '/' ? '' : pathname}`);
    }
    return NextResponse.next();
  }

  // drive.taskilo.de -> /webmail/drive
  if (hostname.startsWith('drive.')) {
    logMiddleware('Drive Subdomain erkannt', request, { hostname });
    if (!pathname.startsWith('/webmail/drive') && !isApiOrStatic) {
      return createSubdomainRewrite(`/webmail/drive${pathname === '/' ? '' : pathname}`);
    }
    return NextResponse.next();
  }

  // kalender.taskilo.de / calendar.taskilo.de -> /webmail/calendar
  if (hostname.startsWith('kalender.') || hostname.startsWith('calendar.')) {
    logMiddleware('Kalender Subdomain erkannt', request, { hostname });
    if (!pathname.startsWith('/webmail/calendar') && !isApiOrStatic) {
      return createSubdomainRewrite(`/webmail/calendar${pathname === '/' ? '' : pathname}`);
    }
    return NextResponse.next();
  }

  // meet.taskilo.de -> /webmail/meet
  if (hostname.startsWith('meet.')) {
    logMiddleware('Meet Subdomain erkannt', request, { hostname });
    if (!pathname.startsWith('/webmail/meet') && !isApiOrStatic) {
      return createSubdomainRewrite(`/webmail/meet${pathname === '/' ? '' : pathname}`);
    }
    return NextResponse.next();
  }

  // task.taskilo.de / tasks.taskilo.de -> /webmail/tasks
  if (hostname.startsWith('task.') || hostname.startsWith('tasks.')) {
    logMiddleware('Tasks Subdomain erkannt', request, { hostname });
    if (!pathname.startsWith('/webmail/tasks') && !isApiOrStatic) {
      return createSubdomainRewrite(`/webmail/tasks${pathname === '/' ? '' : pathname}`);
    }
    return NextResponse.next();
  }

  // kontakt.taskilo.de / contact.taskilo.de -> /webmail/contacts
  if (hostname.startsWith('kontakt.') || hostname.startsWith('contact.') || hostname.startsWith('contacts.')) {
    logMiddleware('Contacts Subdomain erkannt', request, { hostname });
    if (!pathname.startsWith('/webmail/contacts') && !isApiOrStatic) {
      return createSubdomainRewrite(`/webmail/contacts${pathname === '/' ? '' : pathname}`);
    }
    return NextResponse.next();
  }

  // Skip middleware for SEO machine-readable endpoints
  if (
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/sitemap.xml.gz' ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json'
  ) {
    logMiddleware('SEO/Static endpoint – Middleware übersprungen', request, { pathname });
    return;
  }

  // Company Dashboard Onboarding Protection (nach Dokumentation)
  if (request.nextUrl.pathname.startsWith('/dashboard/company/')) {
    logMiddleware('Company Dashboard Zugriff erkannt', request);
    // TEMPORÄR DEAKTIVIERT FÜR PAYMENT TESTS
    // const onboardingCheck = checkCompanyOnboardingStatus(request);
    // if (onboardingCheck) {
    //   logMiddleware('Company Dashboard blockiert - Umleitung zu Onboarding', request);
    //   return onboardingCheck;
    // }
    logMiddleware('Company Dashboard Zugriff erlaubt (ONBOARDING CHECK DEAKTIVIERT)', request);
  }

  // Admin Authentication Protection
  if (
    request.nextUrl.pathname.startsWith('/dashboard/admin') &&
    !request.nextUrl.pathname.startsWith('/dashboard/admin/login')
  ) {
    logMiddleware('Admin Dashboard Zugriff erkannt', request);
    // Check if admin session exists
    const adminToken = request.cookies.get('taskilo_admin_session')?.value;

    if (!adminToken) {
      logMiddleware('Admin Dashboard blockiert - kein Token', request);
      // Redirect to login page if no session
      return NextResponse.redirect(new URL('/dashboard/admin/login', request.url));
    }
    logMiddleware('Admin Dashboard Zugriff erlaubt', request);
  }

  // ✅ PDF Generation Bypass - Allow server-side PDF generation access
  const userAgent = request.headers.get('User-Agent') || '';
  const isPreviewRoute = request.nextUrl.pathname.includes('/preview');
  const isPdfGenerator = userAgent.includes('Taskilo-PDF-Generator');
  
  if (isPreviewRoute && isPdfGenerator) {
    logMiddleware('✅ PDF Generation Bypass - Server access allowed', request, {
      userAgent: userAgent.substring(0, 50),
      path: request.nextUrl.pathname,
    });
    return NextResponse.next(); // Allow direct access for PDF generation
  }

  // Skip internationalization for admin routes and API routes
  if (
    request.nextUrl.pathname.startsWith('/dashboard/admin') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/contacts')
  ) {
    return;
  }

  // Apply internationalization middleware for other routes
  return createMiddleware({
    locales: ['de', 'en', 'fr', 'es'],
    defaultLocale: 'de',
  })(request);
}

async function checkCompanyOnboardingStatus(request: NextRequest) {
  try {
    logMiddleware('Onboarding-Status wird geprüft', request);

    // Get user UID from path
    const pathSegments = request.nextUrl.pathname.split('/');
    const companyUid = pathSegments[3]; // /dashboard/company/[uid]/...

    if (!companyUid) {
      logMiddleware('Kein Company UID gefunden - Umleitung zu Login', request);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Allow onboarding pages (nicht blockieren)
    if (pathSegments[4] === 'onboarding') {
      logMiddleware('Onboarding-Seite erkannt - Zugriff erlaubt', request, { companyUid });
      return null; // Continue to onboarding
    }

    // ALTERNATIVE: Check onboarding status from cookies (falls verfügbar)
    const onboardingComplete = request.cookies.get('taskilo_onboarding_complete')?.value;
    const profileStatus = request.cookies.get('taskilo_profile_status')?.value;

    logMiddleware('Cookie-basierte Prüfung', request, {
      companyUid,
      onboardingComplete,
      profileStatus,
    });

    // If no cookies available, allow access (safer fallback)
    if (!onboardingComplete) {
      logMiddleware('Keine Onboarding-Cookies gefunden - Zugriff erlaubt (Fallback)', request, {
        companyUid,
      });
      return null;
    }

    // Check if onboarding is required
    const needsOnboarding = onboardingComplete !== 'true';

    if (needsOnboarding) {
      logMiddleware('Onboarding erforderlich (Cookie) - Umleitung zu Onboarding', request, {
        companyUid,
      });
      return NextResponse.redirect(
        new URL(`/dashboard/company/${companyUid}/onboarding/welcome`, request.url)
      );
    }

    // Check profile status
    const isRejected = profileStatus === 'rejected';

    if (isRejected) {
      logMiddleware(
        'Profil abgelehnt (Cookie) - Umleitung zu Onboarding mit Rejection-Status',
        request,
        {
          companyUid,
          profileStatus,
        }
      );
      return NextResponse.redirect(
        new URL(`/dashboard/company/${companyUid}/onboarding/welcome?status=rejected`, request.url)
      );
    }

    logMiddleware('Dashboard-Zugriff vollständig erlaubt (Cookie)', request, {
      companyUid,
      profileStatus,
    });
    return null; // Continue to dashboard
  } catch (error) {
    logMiddleware('Middleware Fehler beim Onboarding-Check', request, { error: error.message });
    console.error('Middleware onboarding check error:', error);
    // Allow access on error (safe fallback)
    return null;
  }
}

export const config = {
  // Apply to all routes except static files
  matcher: ['/((?!_next|favicon.ico|images|icon|robots\.txt|sitemap\.xml).*)'],
};
