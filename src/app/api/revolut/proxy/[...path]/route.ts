/**
 * Revolut API Proxy zu Hetzner
 * 
 * ALLE Revolut API-Aufrufe laufen ueber den Hetzner Server (91.99.79.104),
 * da nur diese IP in der Revolut IP-Whitelist steht.
 * 
 * Diese Vercel-Routen sind nur Proxies zum Hetzner-Server.
 */

import { NextRequest, NextResponse } from 'next/server';

const HETZNER_PROXY_URL = 'https://mail.taskilo.de/webmail-api/api/revolut-proxy';
const HETZNER_API_KEY = process.env.WEBMAIL_API_KEY;

async function proxyToHetzner(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: Record<string, unknown>;
  } = {}
): Promise<Response> {
  const { method = 'GET', body } = options;
  
  if (!HETZNER_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'WEBMAIL_API_KEY nicht konfiguriert',
    }, { status: 500 });
  }

  const response = await fetch(`${HETZNER_PROXY_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': HETZNER_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

/**
 * GET /api/revolut/proxy/accounts
 */
export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const endpoint = pathname.replace('/api/revolut/proxy', '');
  
  // Query params weiterleiten
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
  
  return proxyToHetzner(fullEndpoint, { method: 'GET' });
}

/**
 * POST /api/revolut/proxy/*
 */
export async function POST(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const endpoint = pathname.replace('/api/revolut/proxy', '');
  
  let body: Record<string, unknown> | undefined;
  try {
    body = await request.json();
  } catch {
    // Kein Body
  }
  
  return proxyToHetzner(endpoint, { method: 'POST', body });
}

/**
 * DELETE /api/revolut/proxy/*
 */
export async function DELETE(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const endpoint = pathname.replace('/api/revolut/proxy', '');
  
  return proxyToHetzner(endpoint, { method: 'DELETE' });
}
