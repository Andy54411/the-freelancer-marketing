import type { Firestore } from 'firebase-admin/firestore';
import { extractOrderIds, getMultipleOrders, formatOrderForChat } from './order-utils';

// This generic type should be compatible with both the Firebase Admin SDK's Firestore
// and the client-side SDK's Firestore for the operations used in this function.
type FirestoreInstance = Pick<Firestore, 'collection'>;

// Interfaces für Knowledge Base
interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
}

interface WebsiteContent {
  url: string;
  title: string;
  content: string;
  section: string;
}

interface ChatbotConfig {
  companyName: string;
  welcomeMessage: string;
  fallbackMessage: string;
  escalationTriggers: string[];
}

let cachedSystemInstruction: string | null = null;
let cachedKnowledge: KnowledgeEntry[] | null = null;
let cachedWebsiteContent: WebsiteContent[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches and constructs the system instruction for the chatbot from Firestore, with caching.
 * This function is designed to be reusable across different environments (client/server, functions/API routes).
 * @param db - The Firestore instance (from either 'firebase-admin/firestore' or 'firebase/firestore').
 * @param logError - A function to log errors, defaults to console.error.
 * @param userMessage - Optional user message to check for order IDs.
 * @param chatHistory - Optional chat history to check for order IDs.
 * @returns A promise that resolves to the system instruction string.
 */
export async function getSystemInstruction(
  db: FirestoreInstance,
  logError: (message: string, ...args: any[]) => void = console.error,
  userMessage?: string,
  chatHistory?: string[]
): Promise<string> {
  const now = Date.now();
  const shouldUseCache = cachedSystemInstruction && now - lastFetchTime < CACHE_DURATION_MS;

  // Prüfe auf Auftragsnummern in der aktuellen Nachricht oder Chat-Historie
  let orderContext = '';
  if (userMessage || chatHistory) {
    const textToCheck = [userMessage || '', ...(chatHistory || [])].join(' ');
    const orderIds = extractOrderIds(textToCheck);

    if (orderIds.length > 0) {
      try {
        const orders = await getMultipleOrders(db, orderIds, logError);
        if (orders.length > 0) {
          orderContext =
            '\n\n## Relevante Aufträge:\n' +
            orders.map(order => formatOrderForChat(order)).join('\n\n');
        }
      } catch (error) {
        logError('Fehler beim Abrufen der Auftragsdaten:', error);
      }
    }
  }

  // Wenn wir Auftragskontext haben, verwende nicht den Cache
  if (orderContext || !shouldUseCache) {
    try {
      // Lade Knowledge Base aus Firestore (falls vorhanden)
      let knowledgeContext = '';
      let websiteContext = '';
      let configData: ChatbotConfig | null = null;

      try {
        // Lade Config
        const configDoc = await db.collection('chatbot_config').doc('config').get();
        if (configDoc.exists) {
          configData = configDoc.data() as ChatbotConfig;
        }

        // Lade Knowledge Base (mit Cache)
        if (!cachedKnowledge || now - lastFetchTime >= CACHE_DURATION_MS) {
          const knowledgeSnapshot = await db.collection('chatbot_knowledge').get();
          cachedKnowledge = knowledgeSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeEntry))
            .filter(entry => entry.isActive)
            .sort((a, b) => b.priority - a.priority);
        }

        // Lade Website-Content (mit Cache)
        if (!cachedWebsiteContent || now - lastFetchTime >= CACHE_DURATION_MS) {
          const websiteSnapshot = await db.collection('chatbot_website_content').get();
          cachedWebsiteContent = websiteSnapshot.docs.map(doc => doc.data() as WebsiteContent);
        }

        // Relevante Knowledge-Einträge finden basierend auf User-Message
        if (userMessage && cachedKnowledge.length > 0) {
          const relevantEntries = searchKnowledge(cachedKnowledge, userMessage);
          if (relevantEntries.length > 0) {
            knowledgeContext = '\n\n## Relevante Knowledge Base Einträge:\n' +
              relevantEntries.map(e => `- **${e.question}**\n  ${e.answer}`).join('\n\n');
          }
        }

        // Website-Content einbeziehen - RELEVANTE Seiten basierend auf User-Message
        if (cachedWebsiteContent && cachedWebsiteContent.length > 0 && userMessage) {
          const relevantPages = searchWebsiteContent(cachedWebsiteContent, userMessage);
          if (relevantPages.length > 0) {
            websiteContext = '\n\n## Relevante Informationen von taskilo.de:\n' +
              relevantPages.map(c => 
                `### ${c.title} (${c.section}):\n${c.content.substring(0, 1500)}`
              ).join('\n\n');
          }
        }
      } catch (kbError) {
        logError('Knowledge Base konnte nicht geladen werden (Fallback auf Standard):', kbError);
      }

      // Generiere System-Instruction
      const companyName = configData?.companyName || 'Taskilo';
      const instruction = `
Du bist der offizielle Support-Bot von Taskilo, einer deutschen Plattform für lokale Dienstleistungen. Du hilfst Kunden bei Fragen zu ihren Aufträgen, der Plattform und Services.

## Kontext über Taskilo:
Taskilo ist eine deutsche Plattform, die Kunden mit lokalen Dienstleistern verbindet. Kunden können verschiedene Services buchen - von Reinigung über Handwerk bis hin zu Catering. Die Plattform verarbeitet Zahlungen sicher über ein Escrow-System, verwaltet Aufträge und bietet Support.

## WICHTIG - Deine Rolle:
- Du bist der TASKILO Support-Bot
- Antworte IMMER im Kontext von Taskilo
- Erwähne NIE andere Plattformen oder Unternehmen
- Nutze die verfügbaren Auftragsdaten für spezifische Antworten

## Kernprozesse auf Taskilo (Deine Handlungsanweisungen):
- Wenn ein Kunde eine Auftragsnummer (#ABC123) erwähnt, verwende die automatisch geladenen Auftragsdaten aus dem System
- Bei Stornierungsanfragen: Prüfe den Auftragsstatus und erkläre die Taskilo-Stornierungsrichtlinien
- Bei Zahlungsfragen: Verwende die Auftragsdaten um spezifische Informationen zu geben
- Bei Zeitplan-Fragen: Nutze die Termine aus den Auftragsdaten
- Wenn du nicht weiterhelfen kannst, leite an einen Taskilo-Mitarbeiter weiter

## Taskilo-spezifische FAQs:
1. **Frage: Kann ich meinen Auftrag stornieren?**
   * **Antwort:** Die Stornierung hängt vom Status deines Auftrags ab. Bei bezahlten Aufträgen im Clearing-Status ist eine Stornierung bis 24h vor dem Termin möglich. Nach Beginn der Leistung ist keine Stornierung mehr möglich.

2. **Frage: Wann wird mein Geld freigegeben?**
   * **Antwort:** Bei Taskilo wird die Zahlung nach erfolgreicher Leistungserbringung freigegeben. Bei Aufträgen im 'Clearing'-Status wird das Geld 14 Tage nach Auftragsabschluss automatisch an den Dienstleister freigegeben.

3. **Frage: Was bedeutet der Status meines Auftrags?**
   * **Antwort:** 'Zahlung erhalten - Clearing' = Auftrag ist bezahlt und wartet auf Ausführung. 'In Bearbeitung' = Dienstleister arbeitet gerade. 'Abgeschlossen' = Leistung wurde erbracht.

## Taskilo Webmail - E-Mail-Dienst:
Taskilo bietet professionelle E-Mail-Adressen für Unternehmen und Privatpersonen.

### Webmail-Tarife (AKTUELLE PREISE):
- **FreeMail**: 0 EUR/Monat - 1GB E-Mail-Speicher, 2GB Cloud-Speicher, 2 E-Mail-Adressen @taskilo.de
- **Eigene Domain**: 1,99 EUR/Monat - FreeMail + eigene Wunsch-Domain (z.B. mail@erika-muster.de), 100 E-Mail-Adressen
- **ProMail**: 2,99 EUR/Monat - 10GB E-Mail-Speicher, 25GB Cloud-Speicher, 10 E-Mail-Adressen, werbefreies Postfach, Priorität Support
- **BusinessMail**: 4,99 EUR/Monat - 50GB E-Mail-Speicher, 100GB Cloud-Speicher, eigene Domain, 500 E-Mail-Adressen, Premium Support, Team-Funktionen

### E-Mail-Server Einstellungen:
- **IMAP-Server**: imap.taskilo.de, Port 993 (SSL/TLS)
- **SMTP-Server**: smtp.taskilo.de, Port 587 (STARTTLS)
- **Benutzername**: Vollständige E-Mail-Adresse (z.B. max@firma.de)

### Webmail FAQs:
4. **Frage: Wie richte ich mein Taskilo Webmail-Konto ein?**
   * **Antwort:** Gehe zu Dashboard > Webmail > Neues Postfach. Wähle deinen Tarif (ProMail oder BusinessMail), gib deine gewünschte E-Mail-Adresse ein und setze ein sicheres Passwort.

5. **Frage: Wie kann ich mein Webmail-Passwort ändern?**
   * **Antwort:** Gehe zu Dashboard > Webmail > Einstellungen > Passwort ändern. Gib dein aktuelles und neues Passwort ein. Das Passwort muss mindestens 8 Zeichen haben.

6. **Frage: Wie konfiguriere ich meinen E-Mail-Client (Outlook, Apple Mail, etc.)?**
   * **Antwort:** IMAP-Einstellungen: Server imap.taskilo.de, Port 993, SSL/TLS aktiviert. SMTP-Einstellungen: Server smtp.taskilo.de, Port 587, STARTTLS aktiviert. Benutzername ist deine vollständige E-Mail-Adresse.

7. **Frage: Wie viel Speicherplatz habe ich und wie kann ich ihn überprüfen?**
   * **Antwort:** ProMail hat 10GB, BusinessMail hat 50GB. Deinen aktuellen Verbrauch siehst du unter Dashboard > Webmail > Speicher. Bei fast vollem Speicher empfehlen wir ein Upgrade oder das Löschen alter E-Mails.

8. **Frage: Kann ich meine eigene Domain mit Taskilo Webmail nutzen?**
   * **Antwort:** Ja! Du kannst deine eigene Domain verbinden. Gehe zu Dashboard > Webmail > Domains und füge deine Domain hinzu. Du musst dann MX-Records bei deinem Domain-Anbieter setzen.

## Taskilo E-Rechnung (elektronische Rechnung):
Taskilo unterstützt vollständig E-Rechnungen nach den deutschen und EU-Vorgaben.

### E-Rechnung Features:
- **XRechnung & ZUGFeRD**: Automatische Erstellung von E-Rechnungen im XRechnung- und ZUGFeRD-Format
- **GoBD-konform**: Alle Rechnungen sind GoBD-konform mit fortlaufender Nummerierung
- **Automatische Übermittlung**: E-Rechnungen werden automatisch an Behörden und Unternehmen übermittelt
- **PDF + XML**: Jede Rechnung enthält sowohl die visuelle PDF-Darstellung als auch die maschinenlesbare XML-Datei

### E-Rechnung FAQs:
9. **Frage: Wie erstelle ich eine E-Rechnung?**
   * **Antwort:** E-Rechnungen werden automatisch erstellt wenn du eine Rechnung in Taskilo erstellst. Das System generiert automatisch XRechnung und ZUGFeRD-konforme Formate. Du findest sie unter Dashboard > Finanzen > Rechnungen.

10. **Frage: Welche E-Rechnung-Formate unterstützt Taskilo?**
    * **Antwort:** Taskilo unterstützt XRechnung (für Behörden), ZUGFeRD 2.1 (für B2B), sowie klassische PDF-Rechnungen. Das richtige Format wird automatisch basierend auf dem Empfänger gewählt.

11. **Frage: Ist die E-Rechnung Pflicht?**
    * **Antwort:** Ab 2025 ist die E-Rechnung für B2B-Transaktionen in Deutschland verpflichtend. Taskilo macht dich automatisch compliant - du musst nichts extra tun.

## Taskilo Business Features:
- **Buchhaltung**: Automatische Rechnungserstellung, E-Rechnungen, DATEV-Export
- **Zeiterfassung**: Arbeitszeiten erfassen und abrechnen
- **Kalender**: Team-Kalender und Terminplanung
- **Inventar**: Lagerverwaltung und Bestandskontrolle
- **HR Management**: Mitarbeiterverwaltung und Personalakten
- **Banking**: Integrierte Zahlungsabwicklung über Revolut

## Verhaltensregeln:
- Antworte IMMER als ${companyName}-Support-Bot - erwähne nie andere Plattformen
- Nutze verfügbare Auftragsdaten um spezifische, hilfreiche Antworten zu geben
- Bei Auftragsfragen: Verwende die geladenen Daten anstatt nach Details zu fragen
- Wenn du eine Auftragsnummer erkennst, nutze die Daten direkt für deine Antwort
- Erkläre Taskilo-spezifische Prozesse und Richtlinien
- Gib konkrete Hilfestellungen basierend auf den Auftragsdaten
${knowledgeContext}${websiteContext}${orderContext}

WICHTIG: Wenn du eine Frage nicht beantworten kannst oder den Nutzer an einen Mitarbeiter weiterleiten musst, antworte wie gewohnt, aber füge am Ende deiner Antwort IMMER das spezielle Tag "[escalate]" hinzu. Beispiel: "Ich habe Ihre Anfrage an einen Mitarbeiter weitergeleitet. [escalate]"

WICHTIG: Wenn du Auftragsdaten oben siehst, nutze diese Informationen direkt, um dem Kunden bei Fragen zu seinem Taskilo-Auftrag zu helfen. Du kennst bereits alle Details und musst nicht nach weiteren Informationen fragen.
            `.trim();

      // Nur cachen, wenn kein Auftragskontext vorhanden ist
      if (!orderContext && !knowledgeContext) {
        cachedSystemInstruction = instruction;
        lastFetchTime = now;
      }

      return instruction;
    } catch (error) {
      logError('Fehler beim Laden der Chatbot-Konfiguration aus Firestore:', error);
      return 'Du bist ein hilfsbereiter Assistent für Taskilo. Antworte freundlich und auf Deutsch.';
    }
  }

  // Falls Cache verwendet wird
  return cachedSystemInstruction!;
}

/**
 * Sucht relevante Knowledge Base Einträge basierend auf einer Anfrage
 */
function searchKnowledge(knowledge: KnowledgeEntry[], query: string): KnowledgeEntry[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = knowledge.map(entry => {
    let score = 0;

    // Keyword-Match (höchste Priorität)
    for (const keyword of entry.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (queryLower.includes(keywordLower)) {
        score += 15;
      }
      for (const word of queryWords) {
        if (keywordLower.includes(word) || word.includes(keywordLower)) {
          score += 8;
        }
      }
    }

    // Frage-Match
    const questionLower = entry.question.toLowerCase();
    for (const word of queryWords) {
      if (questionLower.includes(word)) {
        score += 5;
      }
    }

    // Antwort-Match (niedrigere Priorität)
    const answerLower = entry.answer.toLowerCase();
    for (const word of queryWords) {
      if (answerLower.includes(word)) {
        score += 2;
      }
    }

    // Priorität einbeziehen
    score += entry.priority;

    return { entry, score };
  });

  // Nur relevante Einträge zurückgeben (Score > 5)
  return scored
    .filter(s => s.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.entry);
}

/**
 * Sucht relevante Website-Inhalte basierend auf einer Anfrage
 */
function searchWebsiteContent(websiteContent: WebsiteContent[], query: string): WebsiteContent[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Spezielle Keywords für bestimmte Themen
  const topicMappings: Record<string, string[]> = {
    'e-rechnung': ['rechnung', 'e-rechnung', 'elektronische', 'xrechnung', 'zugferd', 'invoice'],
    'webmail': ['email', 'e-mail', 'mail', 'postfach', 'imap', 'smtp', 'webmail'],
    'zahlung': ['zahlung', 'bezahlung', 'geld', 'payment', 'clearing', 'auszahlung'],
    'storno': ['stornieren', 'storno', 'abbrechen', 'kündigen', 'rückgabe'],
    'handwerk': ['handwerker', 'elektriker', 'maler', 'klempner', 'renovierung'],
  };

  const scored = websiteContent.map(page => {
    let score = 0;
    const titleLower = page.title.toLowerCase();
    const contentLower = page.content.toLowerCase();
    const urlLower = page.url.toLowerCase();

    // URL-Match (höchste Priorität - sehr spezifisch)
    for (const word of queryWords) {
      if (urlLower.includes(word)) {
        score += 25;
      }
    }

    // Titel-Match
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        score += 20;
      }
    }

    // Content-Match
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 10;
        // Bonus für mehrfaches Vorkommen
        const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += Math.min(matches * 2, 10);
      }
    }

    // Topic-Mapping Bonus
    for (const [, keywords] of Object.entries(topicMappings)) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword) && (contentLower.includes(keyword) || titleLower.includes(keyword))) {
          score += 15;
        }
      }
    }

    // Section-basierter Bonus
    if (page.section === 'Blog' && score > 0) score += 5;
    if (page.section === 'Features' && score > 0) score += 5;

    return { page, score };
  });

  // Nur relevante Seiten zurückgeben (Score > 10)
  return scored
    .filter(s => s.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.page);
}
