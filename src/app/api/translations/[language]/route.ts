import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ language: string }> }
) {
  try {
    const { language } = await params;

    // Validiere Sprach-Parameter (z.B. de-en)
    if (!language || !language.includes('-')) {
      return NextResponse.json(
        { error: 'Ungültiger Sprach-Parameter. Format: source-target (z.B. de-en)' },
        { status: 400 }
      );
    }

    const [sourceLanguage, targetLanguage] = language.split('-');

    // 1. Lade lokale Übersetzungen (JSON-Datei)
    let localTranslations: Record<string, string> = {};
    try {
      const translationsPath = path.join(
        process.cwd(),
        'public',
        'translations',
        `${sourceLanguage}-${targetLanguage}.json`
      );
      if (fs.existsSync(translationsPath)) {
        const data = fs.readFileSync(translationsPath, 'utf-8');
        localTranslations = JSON.parse(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der lokalen Übersetzungen:', error);
    }

    // 2. Lade Firestore-Übersetzungen
    let firestoreTranslations: Record<string, string> = {};
    try {
      const translationKey = `${sourceLanguage}-${targetLanguage}`;
      const docRef = db.collection('translations').doc(translationKey);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        firestoreTranslations = data?.translations || {};
      }
    } catch (error) {
      console.error('Fehler beim Laden der Firestore-Übersetzungen:', error);
    }

    // 3. Kombiniere lokale und Firestore-Übersetzungen
    const allTranslations = { ...localTranslations, ...firestoreTranslations };

    console.log(`Übersetzungen bereitgestellt für ${language}:`, {
      localCount: Object.keys(localTranslations).length,
      firestoreCount: Object.keys(firestoreTranslations).length,
      totalCount: Object.keys(allTranslations).length,
    });

    return NextResponse.json(allTranslations);
  } catch (error) {
    console.error('Fehler beim Laden der Übersetzungen:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Laden der Übersetzungen' },
      { status: 500 }
    );
  }
}
