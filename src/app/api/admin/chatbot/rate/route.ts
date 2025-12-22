import { NextRequest, NextResponse } from 'next/server';
import { ChatbotKnowledgeService } from '@/services/ChatbotKnowledgeService';

/**
 * API Route zum Bewerten von Chatbot-Antworten
 * POST /api/admin/chatbot/rate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { knowledgeId, helpful } = body as { knowledgeId: string; helpful: boolean };

    if (!knowledgeId || helpful === undefined) {
      return NextResponse.json(
        { success: false, error: 'knowledgeId und helpful sind erforderlich' },
        { status: 400 }
      );
    }

    await ChatbotKnowledgeService.rateAnswer(knowledgeId, helpful);

    return NextResponse.json({
      success: true,
      message: 'Bewertung erfolgreich gespeichert',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern der Bewertung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
