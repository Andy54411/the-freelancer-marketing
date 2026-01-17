/**
 * API Route für Taskilo KI Hilfe-Chat
 * 
 * Leitet Anfragen an die Taskilo-KI auf Hetzner weiter.
 * Die KI läuft komplett auf Hetzner - KEIN Firebase/Firestore!
 * Endpoint: POST /api/company/[uid]/help-chat
 */

import { NextRequest, NextResponse } from 'next/server';

// Hetzner Taskilo-KI Endpunkt (über webmail-proxy erreichbar)
const TASKILO_KI_URL = process.env.TASKILO_KI_URL || 'https://mail.taskilo.de/ki-api';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  context?: Record<string, unknown>;
}

interface ChatResponse {
  message: string;
  suggestions: string[];
  related_links: Array<{ title: string; url: string }>;
  confidence: number;
  timestamp: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    
    // Einfache Auth-Prüfung - Token muss vorhanden sein
    // Die eigentliche Validierung macht die Session im Frontend
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ') || authHeader.split('Bearer ')[1].length < 100) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Request-Body parsen
    const body: ChatRequest = await request.json();
    
    if (!body.message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nachricht darf nicht leer sein' },
        { status: 400 }
      );
    }

    // An Taskilo-KI weiterleiten
    const kiResponse = await fetch(`${TASKILO_KI_URL}/api/v1/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Id': companyId,
      },
      body: JSON.stringify({
        message: body.message,
        company_id: companyId,
        conversation_history: body.conversation_history || [],
        context: body.context || {},
      }),
    });

    if (!kiResponse.ok) {
      // Fallback: Lokale Antwort bei KI-Fehler
      return NextResponse.json({
        success: true,
        data: generateFallbackResponse(body.message, companyId),
      });
    }

    const kiData: ChatResponse = await kiResponse.json();

    return NextResponse.json({
      success: true,
      data: kiData,
    });

  } catch (error) {
    // Fallback bei Netzwerkfehlern
    let companyIdFallback = 'unknown';
    let messageFallback = '';
    
    try {
      const { uid } = await params;
      companyIdFallback = uid;
      const body = await request.clone().json();
      messageFallback = body.message || '';
    } catch {
      // Ignorieren
    }
    
    return NextResponse.json({
      success: true,
      data: generateFallbackResponse(messageFallback, companyIdFallback),
    });
  }
}

/**
 * Fallback-Antwort wenn die KI nicht erreichbar ist
 */
function generateFallbackResponse(message: string, companyId: string): ChatResponse {
  const messageLower = message.toLowerCase();
  
  // Einfache Keyword-Erkennung für Fallback
  const topics: Record<string, { response: string; links: Array<{ title: string; url: string }> }> = {
    rechnung: {
      response: `**Rechnungen erstellen**

Sie finden die Rechnungsfunktion unter Buchhaltung → Rechnungen. Dort können Sie:
- Neue Rechnungen erstellen
- Bestehende Rechnungen bearbeiten
- Rechnungen als PDF exportieren
- E-Rechnungen (XRechnung, ZUGFeRD) generieren

Für Ihre Steuereinstellungen gehen Sie zu Einstellungen → Buchhaltung & Steuer.`,
      links: [
        { title: 'Rechnungen', url: `/dashboard/company/${companyId}/finance/invoices` },
        { title: 'Steuereinstellungen', url: `/dashboard/company/${companyId}/settings?view=tax` },
      ],
    },
    kunde: {
      response: `**Kunden verwalten**

Unter Geschäftspartner können Sie Ihre Kunden und Lieferanten verwalten:
- Neue Kunden anlegen
- Kundendaten bearbeiten
- Kunden nach Kategorien sortieren
- Kontakthistorie einsehen`,
      links: [
        { title: 'Geschäftspartner', url: `/dashboard/company/${companyId}/partners` },
      ],
    },
    mitarbeiter: {
      response: `**Personalverwaltung**

Im Bereich Personal können Sie Ihre Mitarbeiter verwalten:
- Mitarbeiterdaten pflegen
- Dienstpläne erstellen
- Urlaubsanträge verwalten
- Arbeitszeiten erfassen`,
      links: [
        { title: 'Personal', url: `/dashboard/company/${companyId}/personal` },
        { title: 'Dienstplan', url: `/dashboard/company/${companyId}/personal/shift-planning` },
      ],
    },
    inventur: {
      response: `**Inventur durchführen**

Unter Lagerbestand → Inventuren können Sie GoBD-konforme Inventuren erstellen:
- Neue Inventur starten
- Bestände zählen und erfassen
- Inventurprotokoll mit digitaler Unterschrift
- Abweichungen dokumentieren`,
      links: [
        { title: 'Inventuren', url: `/dashboard/company/${companyId}/inventory/inventur` },
      ],
    },
  };

  // Thema finden
  for (const [keyword, data] of Object.entries(topics)) {
    if (messageLower.includes(keyword)) {
      return {
        message: data.response,
        suggestions: [
          'Was kann ich sonst noch mit Taskilo machen?',
          'Wie ändere ich meine Einstellungen?',
        ],
        related_links: data.links,
        confidence: 0.7,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Standard-Antwort
  return {
    message: `**Willkommen beim Taskilo-Hilfe-Chat!**

Ich helfe Ihnen gerne bei Fragen zu Taskilo. Fragen Sie mich zum Beispiel:
- "Wie erstelle ich eine Rechnung?"
- "Wo finde ich meine Kunden?"
- "Wie verwalte ich Mitarbeiter?"
- "Wie funktioniert die Inventur?"

Was möchten Sie wissen?`,
    suggestions: [
      'Wie erstelle ich eine Rechnung?',
      'Wo sind meine Geschäftspartner?',
      'Wie starte ich eine Inventur?',
    ],
    related_links: [
      { title: 'Einstellungen', url: `/dashboard/company/${companyId}/settings` },
      { title: 'Support', url: `/dashboard/company/${companyId}/support` },
    ],
    confidence: 0.5,
    timestamp: new Date().toISOString(),
  };
}
