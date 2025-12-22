import { NextResponse } from 'next/server';
import { ChatbotKnowledgeService } from '@/services/ChatbotKnowledgeService';

/**
 * API Route zum Initialisieren der Knowledge Base mit Standardeinträgen
 * POST /api/admin/chatbot/initialize
 * 
 * Query Parameter:
 * - force=true: Löscht alle bestehenden Einträge permanent und initialisiert neu
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    let deletedCount = 0;
    if (force) {
      // Alle bestehenden Knowledge-Einträge PERMANENT löschen
      deletedCount = await ChatbotKnowledgeService.purgeAllKnowledge();
    }

    await ChatbotKnowledgeService.initializeDefaultKnowledge();

    const entries = await ChatbotKnowledgeService.getActiveKnowledge();

    return NextResponse.json({
      success: true,
      message: force 
        ? `Knowledge Base komplett neu initialisiert (${deletedCount} alte Einträge gelöscht)`
        : 'Knowledge Base erfolgreich initialisiert',
      count: entries.length,
      forced: force,
      deletedCount: force ? deletedCount : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Initialisieren der Knowledge Base',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Prüft ob die Knowledge Base initialisiert ist
 */
export async function GET() {
  try {
    const entries = await ChatbotKnowledgeService.getAllKnowledge();
    const config = await ChatbotKnowledgeService.getConfig();
    const websiteContent = await ChatbotKnowledgeService.getWebsiteContent();

    return NextResponse.json({
      success: true,
      initialized: entries.length > 0,
      stats: {
        knowledgeEntries: entries.length,
        activeEntries: entries.filter(e => e.isActive).length,
        websitePages: websiteContent.length,
        configExists: !!config,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Prüfen der Knowledge Base',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
