import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Lade lokale Übersetzungen
function loadLocalTranslations(
  sourceLanguage: string,
  targetLanguage: string
): Record<string, string> {
  try {
    const translationsPath = path.join(
      process.cwd(),
      'public',
      'translations',
      `${sourceLanguage}-${targetLanguage}.json`
    );
    if (fs.existsSync(translationsPath)) {
      const data = fs.readFileSync(translationsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Fehler beim Laden der lokalen Übersetzungen:', error);
  }
  return {};
}

// Speichere neue Übersetzungen in lokaler Datei
function saveLocalTranslations(
  sourceLanguage: string,
  targetLanguage: string,
  translations: Record<string, string>
): void {
  try {
    const translationsDir = path.join(process.cwd(), 'public', 'translations');
    if (!fs.existsSync(translationsDir)) {
      fs.mkdirSync(translationsDir, { recursive: true });
    }

    const translationsPath = path.join(translationsDir, `${sourceLanguage}-${targetLanguage}.json`);
    const existingTranslations = loadLocalTranslations(sourceLanguage, targetLanguage);

    const mergedTranslations = { ...existingTranslations, ...translations };

    fs.writeFileSync(translationsPath, JSON.stringify(mergedTranslations, null, 2), 'utf-8');
    console.log(
      `Lokale Übersetzungen gespeichert: ${Object.keys(translations).length} neue Einträge`
    );
  } catch (error) {
    console.error('Fehler beim Speichern der lokalen Übersetzungen:', error);
  }
}

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

    // 1. Lade lokale Übersetzungen
    const localTranslations = loadLocalTranslations(sourceLanguage, targetLang);

    // 2. Trenne lokale und zu übersetzende Texte
    const localResults: string[] = [];
    const textsToTranslate: string[] = [];
    const indexMapping: number[] = [];

    textArray.forEach((text, index) => {
      if (localTranslations[text]) {
        localResults[index] = localTranslations[text];
        console.log(`Lokale Übersetzung gefunden: "${text}" -> "${localTranslations[text]}"`);
      } else {
        textsToTranslate.push(text);
        indexMapping.push(index);
      }
    });

    console.log(
      `Lokale Treffer: ${textArray.length - textsToTranslate.length}/${textArray.length}`
    );
    console.log(`Zu übersetzen über API: ${textsToTranslate.length}`);

    // 3. Wenn alle Texte lokal verfügbar sind, gib sie zurück
    if (textsToTranslate.length === 0) {
      return NextResponse.json({
        translations: localResults,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLang,
        localHits: textArray.length,
        apiCalls: 0,
      });
    }

    // 4. Übersetze verbleibende Texte über Google API
    const auth = new GoogleAuth({
      keyFile: path.join(process.cwd(), 'firebase-service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/cloud-translation'],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    if (!accessToken.token) {
      console.error('Fehler: Konnte kein Access Token erhalten');
      throw new Error('Konnte kein Access Token erhalten');
    }

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.token}`,
      },
      body: JSON.stringify({
        q: textsToTranslate,
        target: targetLang,
        source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
        format: 'text',
      }),
    });

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

    if (!data.data || !data.data.translations || !Array.isArray(data.data.translations)) {
      console.error('Ungültige Antwort von Google Translate:', data);
      return NextResponse.json(
        { error: 'Ungültige Antwort von Google Translate' },
        { status: 500 }
      );
    }

    // 5. Extrahiere API-Übersetzungen
    const apiTranslations = data.data.translations.map(
      (translation: any) => translation.translatedText
    );

    // 6. Kombiniere lokale und API-Ergebnisse
    const finalTranslations = [...localResults];
    indexMapping.forEach((originalIndex, apiIndex) => {
      finalTranslations[originalIndex] = apiTranslations[apiIndex];
    });

    // 7. Speichere neue Übersetzungen lokal
    const newTranslations: Record<string, string> = {};
    textsToTranslate.forEach((text, index) => {
      newTranslations[text] = apiTranslations[index];
    });
    saveLocalTranslations(sourceLanguage, targetLang, newTranslations);

    console.log('Übersetzung erfolgreich abgeschlossen');

    return NextResponse.json({
      translations: finalTranslations,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLang,
      detectedSourceLanguage: data.data.translations[0]?.detectedSourceLanguage,
      localHits: textArray.length - textsToTranslate.length,
      apiCalls: textsToTranslate.length,
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
