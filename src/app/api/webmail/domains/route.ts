/**
 * Custom Domains API - Vercel Proxy zu Hetzner
 * 
 * Diese Routen leiten alle Anfragen an den Hetzner webmail-proxy weiter.
 * Alle Daten werden auf Hetzner gespeichert, NICHT in Firebase!
 * 
 * GET  /api/webmail/domains       - Eigene Domains auflisten
 * POST /api/webmail/domains       - Neue Domain hinzufügen
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebase/server';
import { cookies } from 'next/headers';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

/**
 * Helper: Get authenticated user email from session
 */
async function getAuthenticatedUserEmail(request: NextRequest): Promise<string | null> {
  try {
    if (!auth) return null;

    // Prüfe Authorization Header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await auth.verifyIdToken(token);
      return decodedToken.email || null;
    }

    // Prüfe Session Cookie
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
 * Proxy-Request an Hetzner webmail-proxy
 */
async function proxyToHetzner(
  path: string,
  method: string,
  email: string,
  body?: unknown
): Promise<Response> {
  const response = await fetch(`${WEBMAIL_PROXY_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': WEBMAIL_API_KEY,
      'X-User-Email': email,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

/**
 * GET /api/webmail/domains
 * Eigene Domains auflisten
 */
export async function GET(request: NextRequest) {
  try {
    const email = await getAuthenticatedUserEmail(request);
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    return proxyToHetzner('/api/domains', 'GET', email);
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
 * POST /api/webmail/domains
 * Neue Domain hinzufügen
 */
export async function POST(request: NextRequest) {
  try {
    const email = await getAuthenticatedUserEmail(request);
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const body = await request.json();
    return proxyToHetzner('/api/domains', 'POST', email, body);
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
