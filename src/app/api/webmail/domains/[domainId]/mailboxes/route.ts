/**
 * Domain Mailboxes API - Vercel Proxy zu Hetzner
 * 
 * GET  /api/webmail/domains/[domainId]/mailboxes - Mailboxen auflisten
 * POST /api/webmail/domains/[domainId]/mailboxes - Mailbox erstellen
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebase/server';
import { cookies } from 'next/headers';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

interface RouteContext {
  params: Promise<{ domainId: string }>;
}

/**
 * Helper: Get authenticated user email from session
 */
async function getAuthenticatedUserEmail(request: NextRequest): Promise<string | null> {
  try {
    if (!auth) return null;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await auth.verifyIdToken(token);
      return decodedToken.email || null;
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const decodedToken = await auth.verifySessionCookie(sessionCookie);
      return decodedToken.email || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/webmail/domains/[domainId]/mailboxes
 * Mailboxen einer Domain auflisten
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const email = await getAuthenticatedUserEmail(request);
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { domainId } = await context.params;

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/domains/${domainId}/mailboxes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': email,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webmail/domains/[domainId]/mailboxes
 * Neue Mailbox erstellen
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const email = await getAuthenticatedUserEmail(request);
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { domainId } = await context.params;
    const body = await request.json();

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/domains/${domainId}/mailboxes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
