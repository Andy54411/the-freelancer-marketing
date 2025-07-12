import { NextRequest, NextResponse } from 'next/server';

interface TranslateRequest {
  text: string;
  targetLang?: string;
  sourceLang?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = 'de', sourceLang = 'auto' }: TranslateRequest = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Google Translate API endpoint
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      // Fallback: Use a simple mock translation for development
      console.warn('Google Translate API key not found, using mock translation');
      return NextResponse.json({
        translatedText: `[DE] ${text}`,
        detectedSourceLanguage: 'en'
      });
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        source: sourceLang === 'auto' ? undefined : sourceLang,
        format: 'text'
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.translations || data.data.translations.length === 0) {
      throw new Error('Invalid response from Google Translate API');
    }

    const translation = data.data.translations[0];
    
    return NextResponse.json({
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage || sourceLang,
      originalText: text
    });

  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback response - we need to access the original request body again
    const fallbackText = "Text could not be translated";
    
    return NextResponse.json(
      { 
        error: 'Translation failed',
        translatedText: fallbackText
      },
      { status: 500 }
    );
  }
}

// Alternative method using a different translation service or local implementation
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get('text');
  const targetLang = searchParams.get('target') || 'de';

  if (!text) {
    return NextResponse.json(
      { error: 'Text parameter is required' },
      { status: 400 }
    );
  }

  // Simple mock translation for development/testing
  const mockTranslations: Record<string, Record<string, string>> = {
    'en': {
      'de': `[Übersetzt] ${text}`,
    },
    'de': {
      'en': `[Translated] ${text}`,
    }
  };

  return NextResponse.json({
    translatedText: mockTranslations['en']?.[targetLang] || `[${targetLang.toUpperCase()}] ${text}`,
    detectedSourceLanguage: 'en',
    originalText: text
  });
}
