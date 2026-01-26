import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const HETZNER_WEBMAIL_API = 'https://mail.taskilo.de';

/**
 * Helper: Decode webmail session cookie
 */
function decodeWebmailSession(encoded: string): { email: string; password: string } | null {
  try {
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Helper: Get authenticated user email from webmail session or query param
 */
async function getAuthenticatedUserEmail(request: NextRequest): Promise<string | null> {
  try {
    // 1. Prüfe Query-Parameter (vom ProfileModal)
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    if (emailParam && emailParam.includes('@')) {
      return emailParam;
    }

    // 2. Prüfe Webmail Session Cookie
    const cookieStore = await cookies();
    const webmailSession = cookieStore.get('webmail_session')?.value;
    if (webmailSession) {
      const decoded = decodeWebmailSession(webmailSession);
      if (decoded?.email) {
        return decoded.email;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Session prüfen
    const email = await getAuthenticatedUserEmail(request);
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Nicht authentifiziert',
      }, { status: 401 });
    }

    // Verknüpfte Konten vom Hetzner-Server abrufen
    const response = await fetch(`${HETZNER_WEBMAIL_API}/api/profile/linked-accounts/${encodeURIComponent(email)}`, {
      headers: {
        'X-User-Email': email,
      },
    });

    if (!response.ok) {
      // Keine verknüpften Konten gefunden
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data.data || data || [],
    });
  } catch {
    // Fallback: Leere Liste
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}
