import { NextRequest, NextResponse } from 'next/server';
import { ChatbotKnowledgeService } from '@/services/ChatbotKnowledgeService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * API Route für einzelne Knowledge Base Einträge
 * GET /api/admin/chatbot/knowledge/[id] - Einzelnen Eintrag abrufen
 * PUT /api/admin/chatbot/knowledge/[id] - Eintrag aktualisieren
 * DELETE /api/admin/chatbot/knowledge/[id] - Eintrag löschen (Soft Delete)
 */

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const entries = await ChatbotKnowledgeService.getAllKnowledge();
    const entry = entries.find(e => e.id === id);

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Eintrag nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen des Eintrags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { question, answer, category, keywords, priority, isActive } = body;

    await ChatbotKnowledgeService.updateKnowledge(id, {
      ...(question && { question }),
      ...(answer && { answer }),
      ...(category && { category }),
      ...(keywords && { keywords }),
      ...(priority !== undefined && { priority }),
      ...(isActive !== undefined && { isActive }),
    });

    return NextResponse.json({
      success: true,
      message: 'Eintrag erfolgreich aktualisiert',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren des Eintrags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await ChatbotKnowledgeService.deleteKnowledge(id);

    return NextResponse.json({
      success: true,
      message: 'Eintrag erfolgreich deaktiviert',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Löschen des Eintrags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
