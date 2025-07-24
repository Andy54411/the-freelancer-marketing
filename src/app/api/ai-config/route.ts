import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET() {
  try {
    const docRef = db.collection('chatbot_config').doc('knowledge_base');
    const configDoc = await docRef.get();

    if (!configDoc.exists) {
      console.warn(
        "Chatbot 'knowledge_base' document not found in Firestore. Returning default config."
      );
      return NextResponse.json({
        persona: '',
        context: '',
        faqs: [],
        rules: [],
        coreProcesses: [],
        moderationRules: [],
        moderationEnabled: false,
        autoEscalation: true,
        suspiciousWordsThreshold: 3,
      });
    }

    const config = configDoc.data();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Konfiguration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const docRef = db.collection('chatbot_config').doc('knowledge_base');
    await docRef.set(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving AI config:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern der Konfiguration' }, { status: 500 });
  }
}
