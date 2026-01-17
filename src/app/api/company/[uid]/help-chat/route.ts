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
      // Fehler bei KI-Anfrage - KEIN Fallback, Fehler sichtbar machen!
      const errorText = await kiResponse.text();
      return NextResponse.json(
        { 
          success: false, 
          error: 'KI-Service nicht erreichbar',
          details: errorText,
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    const kiData: ChatResponse = await kiResponse.json();

    return NextResponse.json({
      success: true,
      data: kiData,
    });

  } catch (error) {
    // Echte Fehlerbehandlung - KEIN Fallback!
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Chat-Anfrage fehlgeschlagen',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// KEINE Fallback-Funktion mehr - Fehler müssen sichtbar sein!
