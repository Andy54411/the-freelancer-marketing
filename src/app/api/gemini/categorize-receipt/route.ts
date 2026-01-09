import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
const genAI = new GoogleGenerativeAI(apiKey);

// DATEV-Kontenpläne für deutsche Buchhaltung
const DATEV_CATEGORIES = {
  // IT & Software
  6805: 'Software und EDV',
  6815: 'Geringwertige Wirtschaftsgüter bis 800€',

  // Büro & Verwaltung
  6640: 'Bürobedarf',
  6645: 'Telefon/Internet/Kommunikation',
  6650: 'Porto und Versandkosten',

  // Fahrzeugkosten
  6540: 'Kraftstoffe und Schmiermittel',
  6520: 'Kfz-Reparaturen und -Wartung',
  6530: 'Parkgebühren und Maut',

  // Bewirtung & Reisen
  6572: 'Reisekosten Unternehmer',
  6574: 'Bewirtungskosten (70% abzugsfähig)',

  // Beratung & Dienstleistungen
  6330: 'Rechts- und Beratungskosten',
  5900: 'Freelancer/Dienstleistungen',
  6360: 'Reinigung und Instandhaltung',

  // Marketing & Werbung
  6600: 'Werbekosten',
  6610: 'Messen und Ausstellungen',

  // Betriebsausgaben
  6300: 'Mieten für Einrichtungen',
  6200: 'Raumkosten',
  6850: 'Sonstiger Betriebsbedarf',

  // Personalkosten
  6100: 'Löhne und Gehälter',
  6210: 'Gesetzliche Sozialaufwendungen',

  // Versicherungen
  6500: 'Versicherungen',
  6510: 'Beiträge',

  // Zinsen & Gebühren
  6760: 'Zinsaufwendungen',
  6280: 'Bankgebühren',
} as const;

interface ReceiptData {
  vendor?: string;
  description?: string;
  title?: string;
  amount?: number;
  invoiceNumber?: string;
  date?: string;
}

export async function POST(request: NextRequest) {
  // Authentifizierung - AI-Dienste nur für eingeloggte Benutzer
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return authErrorResponse(authResult);
  }
  
  try {
    const receiptData: ReceiptData = await request.json();

    if (!receiptData.vendor && !receiptData.description && !receiptData.title) {
      return NextResponse.json(
        {
          error: 'Mindestens Anbieter, Beschreibung oder Titel erforderlich',
        },
        { status: 400 }
      );
    }

    // Erstelle den Kontext für Gemini AI
    const receiptContext = [
      receiptData.vendor && `Anbieter: ${receiptData.vendor}`,
      receiptData.description && `Beschreibung: ${receiptData.description}`,
      receiptData.title && `Titel: ${receiptData.title}`,
      receiptData.amount && `Betrag: ${receiptData.amount}€`,
      receiptData.invoiceNumber && `Rechnungsnummer: ${receiptData.invoiceNumber}`,
      receiptData.date && `Datum: ${receiptData.date}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Intelligenter Prompt für DATEV-Kategorisierung
    const prompt = `
Du bist ein Experte für deutsche Buchhaltung und DATEV-Kontenpläne. 
Analysiere diese Rechnung und schlage die passendste DATEV-Kategorie vor:

RECHNUNGSDETAILS:
${receiptContext}

VERFÜGBARE DATEV-KATEGORIEN:
${Object.entries(DATEV_CATEGORIES)
  .map(([code, name]) => `${code}: ${name}`)
  .join('\n')}

AUFGABE:
1. Analysiere den Anbieter, die Beschreibung und den Kontext der Rechnung
2. Bestimme die passendste DATEV-Kategorie basierend auf deutschen Buchhaltungsstandards
3. Gib GENAU EINE Kategorienummer zurück (z.B. "6805")
4. Erkläre kurz (max. 50 Wörter), warum diese Kategorie passt

WICHTIGE REGELN:
- "Honorar", "Freelancer", "Dienstleistung" → 5900 (Freelancer/Dienstleistungen)
- "Rechtsanwalt", "Steuerberater", "Notar" → 6330 (Rechts- und Beratungskosten)
- "Restaurant", "Bewirtung", "Catering" (echte Bewirtung) → 6574 (Bewirtungskosten)
- "Software", "Subscription", "SaaS" → 6805 (Software)
- Bei Unklarheit: Analysiere den Hauptzweck der Leistung

BEISPIELE:
- "Microsoft Office 365 Subscription" → 6805 (Software und EDV)
- "Shell Tankstelle Benzin" → 6540 (Kraftstoffe)
- "Restaurant Bewirtung Geschäftskunden" → 6574 (Bewirtungskosten)
- "Gastronomisch bezogene Honoraleistung Andy Staudinger" → 5900 (Freelancer/Dienstleistungen)
- "Honorar für Beratung" → 5900 (Freelancer/Dienstleistungen)
- "Steuerberater Honorar" → 6330 (Rechts- und Beratungskosten)
- "Google Ads Werbung" → 6600 (Werbekosten)
- "Anwaltskanzlei Beratung" → 6330 (Rechts- und Beratungskosten)

ANTWORT-FORMAT (JSON):
{
  "categoryCode": "6805",
  "categoryName": "Software und EDV",
  "confidence": 95,
  "reasoning": "Microsoft Office ist eine Software-Subscription für Büroarbeit"
}

Antworte nur mit dem JSON-Objekt, keine weiteren Texte.
`;

    // Versuche verschiedene Gemini-Modelle
    const modelNames = [
      'models/gemini-2.0-flash-exp',
      'models/gemini-exp-1206',
      'models/gemini-2.0-flash-thinking-exp',
      'models/gemini-exp-1121',
    ];

    let lastError: Error | null = null;

    for (const modelName of modelNames) {
      try {
        console.log(`🤖 Trying Gemini model: ${modelName}`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1, // Niedrige Temperatur für konsistente Ergebnisse
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 500,
          },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        console.log('🎯 Gemini Response:', text);

        // Parse JSON-Response
        let aiResponse;
        try {
          // Entferne mögliche Markdown-Formatierung
          const cleanedText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          aiResponse = JSON.parse(cleanedText);
        } catch (parseError) {
          console.warn('❌ JSON Parse Error, trying fallback:', parseError);
          // Fallback: Versuche Kategorie-Code zu extrahieren
          const codeMatch = text.match(/\b(6\d{3})\b/);
          if (codeMatch) {
            const code = codeMatch[1];
            aiResponse = {
              categoryCode: code,
              categoryName:
                DATEV_CATEGORIES[code as unknown as keyof typeof DATEV_CATEGORIES] ||
                'Unbekannte Kategorie',
              confidence: 75,
              reasoning: 'Automatisch extrahiert aus AI-Antwort',
            };
          } else {
            throw new Error('Keine gültige Kategorie gefunden');
          }
        }

        // Validiere die Antwort
        if (
          !aiResponse.categoryCode ||
          !DATEV_CATEGORIES[aiResponse.categoryCode as unknown as keyof typeof DATEV_CATEGORIES]
        ) {
          throw new Error('Ungültige Kategorienummer');
        }

        // Ergänze fehlende Daten
        const finalResponse = {
          categoryCode: aiResponse.categoryCode,
          categoryName:
            DATEV_CATEGORIES[aiResponse.categoryCode as unknown as keyof typeof DATEV_CATEGORIES],
          confidence: aiResponse.confidence || 80,
          reasoning: aiResponse.reasoning || 'AI-basierte Kategorisierung',
          modelUsed: modelName,
          receiptAnalyzed: {
            vendor: receiptData.vendor,
            description: receiptData.description,
            title: receiptData.title,
          },
        };

        console.log('✅ Successful categorization:', finalResponse);

        return NextResponse.json({
          success: true,
          ...finalResponse,
        });
      } catch (modelError) {
        console.log(
          `❌ Model ${modelName} failed:`,
          modelError instanceof Error ? modelError.message : String(modelError)
        );
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
      }
    }

    // Fallback wenn alle Modelle fehlschlagen
    console.warn('🔄 All AI models failed, using fallback logic');
    const fallbackCategory = getFallbackCategory(receiptData);

    return NextResponse.json({
      success: true,
      categoryCode: fallbackCategory.code,
      categoryName: fallbackCategory.name,
      confidence: 50,
      reasoning: 'Fallback-Regel verwendet (AI nicht verfügbar)',
      modelUsed: 'fallback',
      aiError: lastError?.message,
    });
  } catch (error) {
    console.error('❌ Gemini Categorization Error:', error);

    // Fallback-Kategorisierung
    try {
      const receiptData: ReceiptData = await request.json();
      const fallbackCategory = getFallbackCategory(receiptData);

      return NextResponse.json({
        success: true,
        categoryCode: fallbackCategory.code,
        categoryName: fallbackCategory.name,
        confidence: 30,
        reasoning: 'Fallback-Regel (Fehler bei AI-Analyse)',
        modelUsed: 'fallback',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } catch {
      return NextResponse.json(
        {
          error: 'Kategorisierung fehlgeschlagen',
          details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        },
        { status: 500 }
      );
    }
  }
}

// Fallback-Logik für einfache Keyword-basierte Kategorisierung
function getFallbackCategory(receiptData: ReceiptData): { code: string; name: string } {
  const text = [
    receiptData.vendor?.toLowerCase() || '',
    receiptData.description?.toLowerCase() || '',
    receiptData.title?.toLowerCase() || '',
  ].join(' ');

  // Einfache Keyword-Mappings
  if (
    text.includes('software') ||
    text.includes('subscription') ||
    text.includes('microsoft') ||
    text.includes('adobe')
  ) {
    return { code: '6805', name: 'Software und EDV' };
  }
  if (
    text.includes('tankstelle') ||
    text.includes('benzin') ||
    text.includes('diesel') ||
    text.includes('shell')
  ) {
    return { code: '6540', name: 'Kraftstoffe und Schmiermittel' };
  }
  if (text.includes('restaurant') || text.includes('bewirtung') || text.includes('essen')) {
    return { code: '6574', name: 'Bewirtungskosten (70% abzugsfähig)' };
  }
  if (text.includes('telefon') || text.includes('internet') || text.includes('telekom')) {
    return { code: '6645', name: 'Telefon/Internet/Kommunikation' };
  }
  if (text.includes('werbung') || text.includes('marketing') || text.includes('anzeige')) {
    return { code: '6600', name: 'Werbekosten' };
  }
  if (text.includes('beratung') || text.includes('anwalt') || text.includes('steuerberater')) {
    return { code: '6330', name: 'Rechts- und Beratungskosten' };
  }

  // Default fallback
  return { code: '6850', name: 'Sonstiger Betriebsbedarf' };
}
