import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = 'de' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text ist erforderlich und muss ein String sein' },
        { status: 400 }
      );
    }

    if (!targetLang || typeof targetLang !== 'string') {
      return NextResponse.json({ error: 'Target language ist erforderlich' }, { status: 400 });
    }

    console.log('Übersetzung gestartet:', { textLength: text.length, targetLang });

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

    const projectId = 'tilvo-f142f'; // Ihr Firebase Projekt-ID

    // Google Cloud Translation API v3 verwenden
    const response = await fetch(
      `https://translation.googleapis.com/v3/projects/${projectId}/locations/global:translateText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify({
          contents: [text],
          targetLanguageCode: targetLang,
          sourceLanguageCode: 'auto', // Automatische Spracherkennung
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

    if (!data.translations || !data.translations[0]) {
      console.error('Ungültige Antwort von Google Translate:', data);
      return NextResponse.json(
        { error: 'Ungültige Antwort von Google Translate' },
        { status: 500 }
      );
    }

    const translation = data.translations[0];

    console.log('Übersetzung erfolgreich abgeschlossen');

    return NextResponse.json({
      translatedText: translation.translatedText,
      originalText: text,
      detectedSourceLanguage: translation.detectedLanguageCode,
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
