import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const { texts, targetLang, sourceKeys } = await request.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'Texts array ist erforderlich und darf nicht leer sein' }, { status: 400 });
    }

    if (!targetLang) {
      return NextResponse.json({ error: 'Target language ist erforderlich' }, { status: 400 });
    }

    console.log('Batch-Übersetzung gestartet:', { textsCount: texts.length, targetLang });

    // Google Auth mit Service Account
    const auth = new GoogleAuth({
      keyFile: './firebase-service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/cloud-translation'],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    if (!accessToken.token) {
      console.error('Fehler: Konnte kein Access Token erhalten');
      throw new Error('Konnte kein Access Token erhalten');
    }

    const projectId = 'tilvo-f142f';

    // Batch-Übersetzung für bessere Performance
    const response = await fetch(
      `https://translation.googleapis.com/v3/projects/${projectId}/locations/global:translateText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify({
          contents: texts,
          targetLanguageCode: targetLang,
          sourceLanguageCode: 'auto',
        }),
      }
    );

    if (!response.ok) {
      console.error('Google Translate API Fehler:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Fehlerdetails:', errorText);
      return NextResponse.json({ 
        error: `Übersetzung fehlgeschlagen: ${response.status} ${response.statusText}`,
        details: errorText 
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Google Translate Response:', data);
    
    // Erstelle ein Mapping von Keys zu übersetzten Texten
    const translations: Record<string, string> = {};
    
    if (!data.translations || !Array.isArray(data.translations)) {
      console.error('Ungültige Antwort von Google Translate:', data);
      return NextResponse.json({ error: 'Ungültige Antwort von Google Translate' }, { status: 500 });
    }

    data.translations.forEach((translation: any, index: number) => {
      if (sourceKeys && sourceKeys[index]) {
        translations[sourceKeys[index]] = translation.translatedText;
      } else {
        translations[texts[index]] = translation.translatedText;
      }
    });

    console.log('Übersetzung erfolgreich:', { translationsCount: Object.keys(translations).length });

    return NextResponse.json({ 
      translations,
      detectedLanguage: data.translations[0]?.detectedLanguageCode
    });

  } catch (error) {
    console.error('Batch-Übersetzungsfehler:', error);
    return NextResponse.json({ 
      error: 'Interner Server-Fehler',
      message: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
