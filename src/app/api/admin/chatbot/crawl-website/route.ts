import { NextRequest, NextResponse } from 'next/server';
import { ChatbotKnowledgeService } from '@/services/ChatbotKnowledgeService';
import * as cheerio from 'cheerio';

/**
 * API Route zum Crawlen von Website-Inhalten für die Chatbot Knowledge Base
 * POST /api/admin/chatbot/crawl-website
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body as { urls?: string[] };

    // Standard-URLs wenn keine angegeben - basierend auf aktueller Sitemap
    const urlsToCrawl = urls || [
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
      // Blog
      'https://taskilo.de/blog',
      'https://taskilo.de/blog/wann-elektriker',
      'https://taskilo.de/blog/kaeufer-schutz-garantie',
      'https://taskilo.de/blog/steuer-grundlagen',
      'https://taskilo.de/blog/umzugscheckliste',
      'https://taskilo.de/blog/renovierungsfehler',
      'https://taskilo.de/blog/verifizierungsprozess',
      'https://taskilo.de/blog/kundenkommunikation',
      'https://taskilo.de/blog/perfektes-angebot',
      'https://taskilo.de/blog/rechnungsstellung-tipps',
      'https://taskilo.de/blog/digitalisierung-kleinunternehmen',
      'https://taskilo.de/blog/e-rechnung-leitfaden',
      'https://taskilo.de/blog/preisinformationen',
      'https://taskilo.de/blog/zahlungsablaeufe',
    ];

    const results: Array<{ url: string; success: boolean; title?: string; error?: string }> = [];

    for (const url of urlsToCrawl) {
      try {
        // Fetch the page
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Taskilo-Bot/1.0 (Knowledge Base Crawler)',
            Accept: 'text/html',
          },
          next: { revalidate: 3600 }, // Cache für 1 Stunde
        });

        if (!response.ok) {
          results.push({
            url,
            success: false,
            error: `HTTP ${response.status}`,
          });
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extrahiere relevante Inhalte
        const title = $('title').text().trim() || $('h1').first().text().trim() || 'Unbekannt';

        // Entferne Scripts, Styles, Navigation, Footer
        $('script, style, nav, footer, header, .cookie-banner, .chat-widget').remove();

        // Extrahiere Hauptinhalt
        let content = '';

        // Priorität: main > article > .content > body
        const mainContent = $('main').text() || $('article').text() || $('.content').text() || $('body').text();

        // Bereinige den Text
        content = mainContent
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, '\n')
          .trim()
          .substring(0, 5000); // Max 5000 Zeichen pro Seite

        // Bestimme die Sektion basierend auf URL
        let section = 'Allgemein';
        if (url.includes('/blog/')) section = 'Blog';
        else if (url.includes('/blog')) section = 'Blog';
        else if (url.includes('/features/')) section = 'Features';
        else if (url.includes('/features')) section = 'Features';
        else if (url.includes('/webmail/')) section = 'Webmail';
        else if (url.includes('/webmail')) section = 'Webmail';
        else if (url.includes('/services/')) section = 'Services';
        else if (url.includes('/services')) section = 'Services';
        else if (url.includes('/agb')) section = 'Rechtliches';
        else if (url.includes('/datenschutz')) section = 'Rechtliches';
        else if (url.includes('/impressum')) section = 'Rechtliches';
        else if (url.includes('/cookies')) section = 'Rechtliches';
        else if (url.includes('/nutzungsbedingungen')) section = 'Rechtliches';
        else if (url.includes('/privatsphaere')) section = 'Rechtliches';
        else if (url.includes('/about')) section = 'Unternehmen';
        else if (url.includes('/contact')) section = 'Unternehmen';
        else if (url.includes('/careers')) section = 'Unternehmen';
        else if (url.includes('/press')) section = 'Unternehmen';
        else if (url.includes('/newsletter')) section = 'Unternehmen';

        // Speichere in Firestore (lastCrawled wird automatisch hinzugefügt)
        await ChatbotKnowledgeService.saveWebsiteContent({
          url,
          title,
          content,
          section,
        });

        results.push({
          url,
          success: true,
          title,
        });
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} von ${urlsToCrawl.length} Seiten erfolgreich gecrawlt`,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Crawling fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Status des letzten Crawls abrufen
 */
export async function GET() {
  try {
    const websiteContent = await ChatbotKnowledgeService.getWebsiteContent();

    return NextResponse.json({
      success: true,
      count: websiteContent.length,
      pages: websiteContent.map(c => ({
        url: c.url,
        title: c.title,
        section: c.section,
        lastCrawled: c.lastCrawled,
        contentLength: c.content.length,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen des Crawl-Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
