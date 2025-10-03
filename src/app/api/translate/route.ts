import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang } = await request.json();

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: 'Text und Zielsprache sind erforderlich' },
        { status: 400 }
      );
    }

    // Google Translate API
    const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!GOOGLE_TRANSLATE_API_KEY) {
      // Development: Returniere einfach den Original-Text mit einem Hinweis
      return NextResponse.json({
        translatedText: `[DE] ${text}`,
        originalText: text,
        targetLanguage: targetLang,
      });
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: 'auto',
        }),
      }
    );

    if (!response.ok) {
      // Fallback für Development
      return NextResponse.json({
        translatedText: `[DE] ${text}`,
        originalText: text,
        targetLanguage: targetLang,
      });
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;

    return NextResponse.json({
      translatedText,
      originalText: text,
      targetLanguage: targetLang,
    });
  } catch (error) {
    console.error('Translation error:', error);
    // Development Fallback
    const { text, targetLang } = await request
      .json()
      .catch(() => ({ text: 'Text nicht verfügbar', targetLang: 'de' }));
    return NextResponse.json({
      translatedText: `[DE] ${text}`,
      originalText: text,
      targetLanguage: targetLang,
    });
  }
}
