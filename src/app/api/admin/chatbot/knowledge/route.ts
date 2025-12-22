import { NextRequest, NextResponse } from 'next/server';
import { ChatbotKnowledgeService, KnowledgeEntry } from '@/services/ChatbotKnowledgeService';

/**
 * API Route für die Chatbot Knowledge Base Verwaltung
 * GET /api/admin/chatbot/knowledge - Alle Einträge abrufen
 * POST /api/admin/chatbot/knowledge - Neuen Eintrag hinzufügen
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    let entries: KnowledgeEntry[];

    if (search) {
      entries = await ChatbotKnowledgeService.searchKnowledge(search);
    } else if (activeOnly) {
      entries = await ChatbotKnowledgeService.getActiveKnowledge();
    } else {
      entries = await ChatbotKnowledgeService.getAllKnowledge();
    }

    // Filter nach Kategorie
    if (category && category !== 'all') {
      entries = entries.filter(e => e.category === category);
    }

    // Statistiken berechnen
    const stats = {
      total: entries.length,
      active: entries.filter(e => e.isActive).length,
      byCategory: entries.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      totalUsage: entries.reduce((sum, e) => sum + e.usageCount, 0),
      avgHelpfulRate:
        entries.length > 0
          ? entries.reduce((sum, e) => {
              const total = e.helpful + e.notHelpful;
              return sum + (total > 0 ? e.helpful / total : 0);
            }, 0) / entries.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      entries,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen der Knowledge Base',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { question, answer, category, keywords, priority, source } = body as {
      question: string;
      answer: string;
      category: KnowledgeEntry['category'];
      keywords: string[];
      priority?: number;
      source?: KnowledgeEntry['source'];
    };

    // Validierung
    if (!question || !answer || !category) {
      return NextResponse.json(
        { success: false, error: 'Frage, Antwort und Kategorie sind erforderlich' },
        { status: 400 }
      );
    }

    const id = await ChatbotKnowledgeService.addKnowledge({
      question,
      answer,
      category,
      keywords: keywords || [],
      priority: priority || 5,
      source: source || 'manual',
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      id,
      message: 'Knowledge Base Eintrag erfolgreich erstellt',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erstellen des Eintrags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
