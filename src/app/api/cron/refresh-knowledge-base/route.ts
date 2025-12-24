import { NextRequest, NextResponse } from 'next/server';
import { ChatbotKnowledgeService } from '@/services/ChatbotKnowledgeService';
import * as cheerio from 'cheerio';

/**
 * Cron-Job API zum wöchentlichen Aktualisieren der Knowledge Base
 * 
 * Wird automatisch von Vercel Cron jeden Sonntag um 3:00 Uhr ausgeführt
 * Kann auch manuell via POST aufgerufen werden
 * 
 * POST /api/cron/refresh-knowledge-base
 * 
 * Security: Vercel Cron Jobs senden einen Authorization Header
 */

// Aktuelle Website-URLs - HIER NEUE SEITEN HINZUFÜGEN!
// Diese Liste wird wöchentlich gecrawlt
const WEBSITE_URLS = [
  // Hauptseiten
  'https://taskilo.de',
  'https://taskilo.de/about',
  'https://taskilo.de/contact',
  'https://taskilo.de/careers',
  'https://taskilo.de/press',
  'https://taskilo.de/newsletter',
  // Rechtliches
  'https://taskilo.de/impressum',
  'https://taskilo.de/datenschutz',
  'https://taskilo.de/agb',
  'https://taskilo.de/cookies',
  'https://taskilo.de/nutzungsbedingungen',
  'https://taskilo.de/privatsphaere',
  // Services
  'https://taskilo.de/services',
  'https://taskilo.de/services/handwerk',
  'https://taskilo.de/services/haushalt',
  'https://taskilo.de/services/transport',
  'https://taskilo.de/services/it-digital',
  'https://taskilo.de/services/garten',
  'https://taskilo.de/services/wellness',
  'https://taskilo.de/services/hotel-gastronomie',
  'https://taskilo.de/services/marketing-vertrieb',
  'https://taskilo.de/services/finanzen-recht',
  'https://taskilo.de/services/bildung-unterstuetzung',
  'https://taskilo.de/services/tiere-pflanzen',
  'https://taskilo.de/services/kreativ-kunst',
  'https://taskilo.de/services/event-veranstaltung',
  'https://taskilo.de/services/buero-administration',
  // Features
  'https://taskilo.de/features',
  'https://taskilo.de/features/accounting',
  'https://taskilo.de/features/advertising',
  'https://taskilo.de/features/banking',
  'https://taskilo.de/features/business',
  'https://taskilo.de/features/calendar',
  'https://taskilo.de/features/email',
  'https://taskilo.de/features/employee-records',
  'https://taskilo.de/features/hr-management',
  'https://taskilo.de/features/inventory',
  'https://taskilo.de/features/recruiting',
  'https://taskilo.de/features/time-tracking',
  'https://taskilo.de/features/workspace',
  // Webmail
  'https://taskilo.de/webmail',
  'https://taskilo.de/webmail/pricing',
  // Blog - E-Rechnung & Finanzen
  'https://taskilo.de/blog',
  'https://taskilo.de/blog/e-rechnung-leitfaden',
  'https://taskilo.de/blog/steuer-grundlagen',
  'https://taskilo.de/blog/rechnungsstellung-tipps',
  'https://taskilo.de/blog/preisinformationen',
  'https://taskilo.de/blog/zahlungsablaeufe',
  // Blog - Handwerk & Dienstleistungen
  'https://taskilo.de/blog/wann-elektriker',
  'https://taskilo.de/blog/umzugscheckliste',
  'https://taskilo.de/blog/renovierungsfehler',
  // Blog - Geschäft & Marketing
  'https://taskilo.de/blog/kaeufer-schutz-garantie',
  'https://taskilo.de/blog/verifizierungsprozess',
  'https://taskilo.de/blog/kundenkommunikation',
  'https://taskilo.de/blog/perfektes-angebot',
  'https://taskilo.de/blog/digitalisierung-kleinunternehmen',
  // Hilfe - Terminplan
  'https://taskilo.de/hilfe/terminplan/erstellen',
  'https://taskilo.de/hilfe/terminplan/verfuegbarkeit',
  'https://taskilo.de/hilfe/terminplan/teilen',
  'https://taskilo.de/hilfe/terminplan/bearbeiten',
];

/**
 * Ermittelt die Section basierend auf der URL
 */
function getSectionFromUrl(url: string): string {
  if (url.includes('/blog/')) return 'Blog';
  if (url.includes('/services/')) return 'Services';
  if (url.includes('/features/')) return 'Features';
  if (url.includes('/webmail')) return 'Webmail';
  if (url.includes('/hilfe/')) return 'Hilfe';
  if (url.includes('/impressum') || url.includes('/datenschutz') || url.includes('/agb')) return 'Rechtliches';
  return 'Allgemein';
}

/**
 * Crawlt eine einzelne URL und extrahiert den Inhalt
 */
async function crawlUrl(url: string): Promise<{
  success: boolean;
  title?: string;
  content?: string;
  section?: string;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Taskilo-Knowledge-Crawler/1.0',
        Accept: 'text/html',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Entferne unwichtige Elemente
    $('script, style, nav, footer, header, aside, .cookie-banner, .newsletter-popup').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || url;
    const mainContent = $('main, article, .content, .page-content, [role="main"]').first();
    let content = mainContent.length > 0 ? mainContent.text() : $('body').text();

    // Bereinige Content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .substring(0, 5000); // Max 5000 Zeichen pro Seite

    const section = getSectionFromUrl(url);

    return { success: true, title, content, section };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifiziere Cron-Job Authorization (optional für manuelle Aufrufe)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Bei manuellen Aufrufen ohne Secret erlauben wir Zugriff (für Admin-UI)
    // In Produktion sollte das eingeschränkt werden
    const isAuthorized =
      !cronSecret || // Kein Secret konfiguriert
      authHeader === `Bearer ${cronSecret}` || // Korrektes Secret
      request.headers.get('x-admin-request') === 'true'; // Admin-Request

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // 1. Lösche alten Website-Content
    await ChatbotKnowledgeService.purgeWebsiteContent();

    // 2. Crawle alle URLs
    const results: Array<{
      url: string;
      success: boolean;
      title?: string;
      contentLength?: number;
      error?: string;
    }> = [];

    for (const url of WEBSITE_URLS) {
      const result = await crawlUrl(url);

      if (result.success && result.content && result.content.length > 50) {
        await ChatbotKnowledgeService.saveWebsiteContent({
          url,
          title: result.title || url,
          content: result.content,
          section: result.section || 'Allgemein',
        });

        results.push({
          url,
          success: true,
          title: result.title,
          contentLength: result.content.length,
        });
      } else {
        results.push({
          url,
          success: false,
          error: result.error || 'Kein Inhalt gefunden',
        });
      }

      // Rate limiting - 100ms zwischen Requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const duration = Date.now() - startTime;

    // 3. Aktualisiere Knowledge Base Einträge (optional: neu initialisieren)
    // await ChatbotKnowledgeService.purgeAllKnowledge();
    // await ChatbotKnowledgeService.initializeDefaultKnowledge();

    return NextResponse.json({
      success: true,
      message: `Knowledge Base aktualisiert: ${successCount}/${WEBSITE_URLS.length} Seiten gecrawlt`,
      stats: {
        totalUrls: WEBSITE_URLS.length,
        successCount,
        failedCount: WEBSITE_URLS.length - successCount,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren der Knowledge Base',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Status der letzten Aktualisierung
 */
export async function GET() {
  try {
    const websiteContent = await ChatbotKnowledgeService.getWebsiteContent();
    const knowledge = await ChatbotKnowledgeService.getActiveKnowledge();

    return NextResponse.json({
      success: true,
      stats: {
        websitePages: websiteContent.length,
        knowledgeEntries: knowledge.length,
        configuredUrls: WEBSITE_URLS.length,
      },
      urls: WEBSITE_URLS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen des Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
