import { NextRequest, NextResponse } from 'next/server';

// Middleware-Logs für Audit-Trail (Datenschutz/Sicherheit)
function logMiddleware(message: string, request: NextRequest, additionalData?: Record<string, unknown>) {
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
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Skip static files completely - ALL public folder assets
  const isStaticAsset = (
    // Next.js internal
    pathname.startsWith('/_next/') || 
    // Public folders
    pathname.startsWith('/images/') || 
    pathname.startsWith('/app_svg/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/icon/') ||
    pathname.startsWith('/pdf-worker/') ||
    // API routes pass through (protected by their own auth)
    pathname.startsWith('/api/') ||
    // Root public files
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/pdf.worker.min.mjs' ||
    pathname === '/real-time-monitor.js' ||
    pathname === '/oauth-test.html' ||
    pathname === '/revolut-business-logo.svg' ||
    // All static file extensions
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.eot') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.map')
  );

  if (isStaticAsset) {
    return NextResponse.next();
  }

  // Helper function to redirect subdomain to path-based routing
  const createSubdomainRedirect = (targetPath: string) => {
    const redirectUrl = new URL(`https://taskilo.de${targetPath}`);
    logMiddleware('Subdomain Redirect', request, { to: redirectUrl.href });
    return NextResponse.redirect(redirectUrl, { status: 301 });
  };

  // ============================================
  // SUBDOMAIN ROUTING - Redirect to path-based URLs
  // ============================================
  
  // email.taskilo.de / mail.taskilo.de -> taskilo.de/webmail
  if (hostname.startsWith('email.') || hostname.startsWith('mail.')) {
    logMiddleware('Email Subdomain erkannt - redirecting', request, { hostname });
    return createSubdomainRedirect(`/webmail${pathname === '/' ? '' : pathname}`);
  }

  // drive.taskilo.de -> taskilo.de/drive
  if (hostname.startsWith('drive.')) {
    logMiddleware('Drive Subdomain erkannt - redirecting', request, { hostname });
    return createSubdomainRedirect(`/drive${pathname === '/' ? '' : pathname}`);
  }

  // kalender.taskilo.de / calendar.taskilo.de -> taskilo.de/kalender
  if (hostname.startsWith('kalender.') || hostname.startsWith('calendar.')) {
    logMiddleware('Kalender Subdomain erkannt - redirecting', request, { hostname });
    return createSubdomainRedirect(`/kalender${pathname === '/' ? '' : pathname}`);
  }

  // meet.taskilo.de -> taskilo.de/meet
  if (hostname.startsWith('meet.')) {
    logMiddleware('Meet Subdomain erkannt - redirecting', request, { hostname });
    return createSubdomainRedirect(`/meet${pathname === '/' ? '' : pathname}`);
  }

  // task.taskilo.de / tasks.taskilo.de -> taskilo.de/tasks
  if (hostname.startsWith('task.') || hostname.startsWith('tasks.')) {
    logMiddleware('Tasks Subdomain erkannt - redirecting', request, { hostname });
    return createSubdomainRedirect(`/tasks${pathname === '/' ? '' : pathname}`);
  }

  // kontakt.taskilo.de / contact.taskilo.de -> taskilo.de/kontakte
  if (hostname.startsWith('kontakt.') || hostname.startsWith('contact.') || hostname.startsWith('contacts.')) {
    logMiddleware('Contacts Subdomain erkannt - redirecting', request, { hostname });
    return createSubdomainRedirect(`/kontakte${pathname === '/' ? '' : pathname}`);
  }

  // ============================================
  // AUTHENTICATION & AUTHORIZATION CHECKS
  // ============================================

  // Company Dashboard - Role-based access with onboarding check
  if (pathname.startsWith('/dashboard/company/')) {
    logMiddleware('Company Dashboard Zugriff erkannt', request);
    
    // Extract company UID for audit logging
    const pathSegments = pathname.split('/');
    const companyUid = pathSegments[3];
    
    if (companyUid) {
      logMiddleware('Company Dashboard Zugriff', request, { 
        companyUid,
        accessType: 'company_dashboard'
      });
    }
    
    // TEMPORÄR DEAKTIVIERT FÜR PAYMENT TESTS
    // const onboardingCheck = await checkCompanyOnboardingStatus(request);
    // if (onboardingCheck) {
    //   return onboardingCheck;
    // }
  }

  // Admin Dashboard - Strict authentication required
  if (
    pathname.startsWith('/dashboard/admin') &&
    !pathname.startsWith('/dashboard/admin/login')
  ) {
    logMiddleware('Admin Dashboard Zugriff erkannt', request);
    const adminToken = request.cookies.get('taskilo_admin_session')?.value;

    if (!adminToken) {
      logMiddleware('Admin Dashboard blockiert - kein Token', request, {
        accessType: 'admin_blocked',
        reason: 'missing_token'
      });
      // Korrekte Admin-Login-Route ist /admin/login, nicht /dashboard/admin/login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    logMiddleware('Admin Dashboard Zugriff erlaubt', request, {
      accessType: 'admin_allowed'
    });
  }

  // ============================================
  // SPECIAL ACCESS CONTROLS
  // ============================================

  // PDF Generation Bypass - Allow server-side PDF generation
  const userAgent = request.headers.get('User-Agent') || '';
  const isPreviewRoute = pathname.includes('/preview');
  const isPdfGenerator = userAgent.includes('Taskilo-PDF-Generator');
  
  if (isPreviewRoute && isPdfGenerator) {
    logMiddleware('PDF Generation Bypass - Server access allowed', request, {
      userAgent: userAgent.substring(0, 50),
      path: pathname,
      accessType: 'pdf_generator'
    });
    return NextResponse.next();
  }

  // Allow all other routes
  return NextResponse.next();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Onboarding check function (currently disabled but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkCompanyOnboardingStatus(request: NextRequest): Promise<NextResponse | null> {
  try {
    logMiddleware('Onboarding-Status wird geprüft', request);

    const pathSegments = request.nextUrl.pathname.split('/');
    const companyUid = pathSegments[3]; // /dashboard/company/[uid]/...

    if (!companyUid) {
      logMiddleware('Kein Company UID gefunden - Umleitung zu Login', request);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Allow onboarding pages
    if (pathSegments[4] === 'onboarding') {
      logMiddleware('Onboarding-Seite erkannt - Zugriff erlaubt', request, { companyUid });
      return null;
    }

    // Check onboarding status from cookies (minimal data exposure)
    const onboardingComplete = request.cookies.get('taskilo_onboarding_complete')?.value;
    const profileStatus = request.cookies.get('taskilo_profile_status')?.value;

    logMiddleware('Cookie-basierte Prüfung', request, {
      companyUid,
      onboardingComplete: onboardingComplete ? 'present' : 'absent',
      profileStatus: profileStatus ? 'present' : 'absent',
    });

    if (!onboardingComplete) {
      logMiddleware('Keine Onboarding-Cookies gefunden - Zugriff erlaubt (Fallback)', request, {
        companyUid,
      });
      return null;
    }

    const needsOnboarding = onboardingComplete !== 'true';

    if (needsOnboarding) {
      logMiddleware('Onboarding erforderlich - Umleitung', request, { companyUid });
      return NextResponse.redirect(
        new URL(`/dashboard/company/${companyUid}/onboarding/welcome`, request.url)
      );
    }

    const isRejected = profileStatus === 'rejected';

    if (isRejected) {
      logMiddleware('Profil abgelehnt - Umleitung mit Rejection-Status', request, {
        companyUid,
      });
      return NextResponse.redirect(
        new URL(`/dashboard/company/${companyUid}/onboarding/welcome?status=rejected`, request.url)
      );
    }

    logMiddleware('Dashboard-Zugriff erlaubt', request, { companyUid });
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMiddleware('Middleware Fehler beim Onboarding-Check', request, { error: errorMessage });
    console.error('Middleware onboarding check error:', error);
    return null; // Allow access on error (safe fallback)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
