import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const { texts, targetLanguage, sourceLanguage = 'de' } = await request.json();

    // Unterstütze sowohl einzelne Texte als auch Arrays
    const textArray = Array.isArray(texts) ? texts : [texts || ''];
    const targetLang = targetLanguage || 'de';

    if (!textArray.length || textArray.every(text => !text || typeof text !== 'string')) {
      return NextResponse.json(
        { error: 'Texte sind erforderlich und müssen Strings sein' },
        { status: 400 }
      );
    }

    if (!targetLang || typeof targetLang !== 'string') {
      return NextResponse.json({ error: 'Target language ist erforderlich' }, { status: 400 });
    }

    console.log('Übersetzung gestartet:', { textCount: textArray.length, targetLang });

    // Google Auth mit Service Account für v2 API
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

    // Google Cloud Translation API v2 verwenden (einfacher)
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify({
          q: textArray,
          target: targetLang,
          source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      console.error('Google Translate API Fehler:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Fehlerdetails:', errorText);
      return NextResponse.json(
        {
          error: `Übersetzung fehlgeschlagen: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Google Translate Response:', data);

    if (!data.data || !data.data.translations || !Array.isArray(data.data.translations)) {
      console.error('Ungültige Antwort von Google Translate:', data);
      return NextResponse.json(
        { error: 'Ungültige Antwort von Google Translate' },
        { status: 500 }
      );
    }

    // Extrahiere übersetzten Text aus der v2 API Antwort
    const translations = data.data.translations.map((translation: any) => translation.translatedText);

    console.log('Übersetzung erfolgreich abgeschlossen');

    return NextResponse.json({
      translations: translations,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLang,
      detectedSourceLanguage: data.data.translations[0]?.detectedSourceLanguage,
    });
  } catch (error) {
    console.error('Übersetzungsfehler:', error);
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
