import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Knowledge Base Entry Interface
 */
export interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'billing' | 'technical' | 'account' | 'webmail' | 'orders' | 'platform';
  keywords: string[];
  priority: number; // Höhere Priorität = wichtiger
  createdAt: string;
  updatedAt: string;
  usageCount: number; // Wie oft wurde diese Antwort verwendet
  helpful: number; // Positive Bewertungen
  notHelpful: number; // Negative Bewertungen
  source: 'manual' | 'learned' | 'website';
  isActive: boolean;
}

/**
 * Website Content für Crawling
 */
export interface WebsiteContent {
  url: string;
  title: string;
  content: string;
  lastCrawled: string;
  section: string;
}

/**
 * Chatbot Configuration
 */
export interface ChatbotConfig {
  companyName: string;
  welcomeMessage: string;
  fallbackMessage: string;
  escalationTriggers: string[];
  maxHistoryLength: number;
  enableWebsiteCrawling: boolean;
  websiteUrls: string[];
  lastUpdated: string;
}

/**
 * Service für die Chatbot Knowledge Base
 */
export class ChatbotKnowledgeService {
  private static readonly COLLECTION = 'chatbot_config';
  private static readonly KNOWLEDGE_COLLECTION = 'chatbot_knowledge';
  private static readonly WEBSITE_COLLECTION = 'chatbot_website_content';

  /**
   * Holt die Chatbot-Konfiguration
   */
  static async getConfig(): Promise<ChatbotConfig | null> {
    if (!db) return null;

    const docRef = db.collection(this.COLLECTION).doc('config');
    const doc = await docRef.get();

    if (!doc.exists) {
      // Erstelle Standard-Konfiguration
      const defaultConfig: ChatbotConfig = {
        companyName: 'Taskilo',
        welcomeMessage: 'Hallo! Ich bin der Taskilo Support-Assistent. Wie kann ich Ihnen heute helfen?',
        fallbackMessage: 'Entschuldigung, ich konnte keine passende Antwort finden. Möchten Sie mit einem Mitarbeiter sprechen?',
        escalationTriggers: ['mitarbeiter', 'mensch', 'support', 'beschwerde', 'manager'],
        maxHistoryLength: 10,
        enableWebsiteCrawling: true,
        websiteUrls: [
          'https://taskilo.de',
          'https://taskilo.de/hilfe',
          'https://taskilo.de/faq',
          'https://taskilo.de/agb',
          'https://taskilo.de/datenschutz',
        ],
        lastUpdated: new Date().toISOString(),
      };

      await docRef.set(defaultConfig);
      return defaultConfig;
    }

    return doc.data() as ChatbotConfig;
  }

  /**
   * Aktualisiert die Chatbot-Konfiguration
   */
  static async updateConfig(updates: Partial<ChatbotConfig>): Promise<void> {
    if (!db) return;

    const docRef = db.collection(this.COLLECTION).doc('config');
    await docRef.set(
      {
        ...updates,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  /**
   * Holt alle Knowledge Base Einträge
   */
  static async getAllKnowledge(): Promise<KnowledgeEntry[]> {
    if (!db) return [];

    const snapshot = await db.collection(this.KNOWLEDGE_COLLECTION).get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as KnowledgeEntry[];
  }

  /**
   * Holt aktive Knowledge Base Einträge
   */
  static async getActiveKnowledge(): Promise<KnowledgeEntry[]> {
    if (!db) return [];

    const snapshot = await db
      .collection(this.KNOWLEDGE_COLLECTION)
      .where('isActive', '==', true)
      .get();

    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as KnowledgeEntry[];

    // Sortiere nach Priorität (höher = wichtiger)
    return entries.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Sucht relevante Knowledge Base Einträge basierend auf Keywords
   */
  static async searchKnowledge(query: string): Promise<KnowledgeEntry[]> {
    const allKnowledge = await this.getActiveKnowledge();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    // Score-basierte Suche
    const scored = allKnowledge.map(entry => {
      let score = 0;

      // Keyword-Match
      for (const keyword of entry.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 10;
        }
        for (const word of queryWords) {
          if (keyword.toLowerCase().includes(word)) {
            score += 5;
          }
        }
      }

      // Frage-Match
      if (entry.question.toLowerCase().includes(queryLower)) {
        score += 20;
      }

      // Priorität einbeziehen
      score += entry.priority;

      // Erfolgsrate einbeziehen
      if (entry.usageCount > 0) {
        const helpfulRate = entry.helpful / (entry.helpful + entry.notHelpful + 1);
        score += helpfulRate * 10;
      }

      return { entry, score };
    });

    // Nur relevante Einträge zurückgeben (Score > 0)
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.entry);
  }

  /**
   * Fügt einen neuen Knowledge Base Eintrag hinzu
   */
  static async addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'helpful' | 'notHelpful'>): Promise<string> {
    if (!db) throw new Error('Database nicht verfügbar');

    const now = new Date().toISOString();
    const docRef = await db.collection(this.KNOWLEDGE_COLLECTION).add({
      ...entry,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      helpful: 0,
      notHelpful: 0,
    });

    return docRef.id;
  }

  /**
   * Aktualisiert einen Knowledge Base Eintrag
   */
  static async updateKnowledge(id: string, updates: Partial<KnowledgeEntry>): Promise<void> {
    if (!db) return;

    await db.collection(this.KNOWLEDGE_COLLECTION).doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Erhöht den Usage Counter für einen Eintrag
   */
  static async incrementUsage(id: string): Promise<void> {
    if (!db) return;

    await db.collection(this.KNOWLEDGE_COLLECTION).doc(id).update({
      usageCount: FieldValue.increment(1),
    });
  }

  /**
   * Bewertet eine Antwort
   */
  static async rateAnswer(id: string, helpful: boolean): Promise<void> {
    if (!db) return;

    await db.collection(this.KNOWLEDGE_COLLECTION).doc(id).update({
      [helpful ? 'helpful' : 'notHelpful']: FieldValue.increment(1),
    });
  }

  /**
   * Löscht einen Knowledge Base Eintrag (Soft Delete)
   */
  static async deleteKnowledge(id: string): Promise<void> {
    if (!db) return;

    await db.collection(this.KNOWLEDGE_COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Löscht einen Knowledge Base Eintrag permanent (Hard Delete)
   */
  static async hardDeleteKnowledge(id: string): Promise<void> {
    if (!db) return;

    await db.collection(this.KNOWLEDGE_COLLECTION).doc(id).delete();
  }

  /**
   * Löscht ALLE Knowledge Base Einträge permanent (für Neuinitialisierung)
   */
  static async purgeAllKnowledge(): Promise<number> {
    if (!db) return 0;

    const snapshot = await db.collection(this.KNOWLEDGE_COLLECTION).get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.docs.length;
  }

  /**
   * Löscht ALLE Website-Content Einträge permanent (für wöchentliches Re-Crawling)
   */
  static async purgeWebsiteContent(): Promise<number> {
    if (!db) return 0;

    const snapshot = await db.collection(this.WEBSITE_COLLECTION).get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.docs.length;
  }

  /**
   * Speichert gecrawlten Website-Content
   */
  static async saveWebsiteContent(content: Omit<WebsiteContent, 'lastCrawled'>): Promise<void> {
    if (!db) return;

    const docId = Buffer.from(content.url).toString('base64').replace(/[/+=]/g, '_');
    await db.collection(this.WEBSITE_COLLECTION).doc(docId).set({
      ...content,
      lastCrawled: new Date().toISOString(),
    });
  }

  /**
   * Holt gecrawlten Website-Content
   */
  static async getWebsiteContent(): Promise<WebsiteContent[]> {
    if (!db) return [];

    const snapshot = await db.collection(this.WEBSITE_COLLECTION).get();
    return snapshot.docs.map(doc => doc.data() as WebsiteContent);
  }

  /**
   * Generiert die System-Instruktion aus der Knowledge Base
   */
  static async generateSystemInstruction(userMessage?: string): Promise<string> {
    const config = await this.getConfig();
    const knowledge = await this.getActiveKnowledge();
    const websiteContent = await this.getWebsiteContent();

    // Relevante Knowledge-Einträge finden
    let relevantKnowledge: KnowledgeEntry[] = [];
    if (userMessage) {
      relevantKnowledge = await this.searchKnowledge(userMessage);
    }

    // Basis-Instruktion
    let instruction = `
Du bist der offizielle Support-Bot von ${config?.companyName || 'Taskilo'}, einer deutschen Plattform für lokale Dienstleistungen.

## Deine Aufgaben:
- Beantworte Kundenfragen freundlich und kompetent auf Deutsch
- Nutze die Knowledge Base für präzise Antworten
- Bei unbekannten Fragen: Leite an einen Mitarbeiter weiter mit [escalate]

## Verhaltensregeln:
- Antworte IMMER im Kontext von Taskilo
- Erwähne NIE andere Plattformen oder Unternehmen
- Sei höflich und professionell
- Gib konkrete, hilfreiche Antworten

`;

    // Knowledge Base FAQ hinzufügen
    if (knowledge.length > 0) {
      instruction += '\n## Häufige Fragen & Antworten:\n';

      // Nach Kategorie gruppieren
      const byCategory = knowledge.reduce(
        (acc, entry) => {
          if (!acc[entry.category]) acc[entry.category] = [];
          acc[entry.category].push(entry);
          return acc;
        },
        {} as Record<string, KnowledgeEntry[]>
      );

      for (const [category, entries] of Object.entries(byCategory)) {
        instruction += `\n### ${this.getCategoryLabel(category)}:\n`;
        for (const entry of entries.slice(0, 5)) {
          instruction += `- **Frage:** ${entry.question}\n  **Antwort:** ${entry.answer}\n\n`;
        }
      }
    }

    // Relevante Knowledge für aktuelle Frage
    if (relevantKnowledge.length > 0) {
      instruction += '\n## Besonders relevante Informationen für diese Anfrage:\n';
      for (const entry of relevantKnowledge) {
        instruction += `- ${entry.question}: ${entry.answer}\n`;
        // Usage tracken
        await this.incrementUsage(entry.id);
      }
    }

    // Website-Content einbeziehen
    if (websiteContent.length > 0) {
      instruction += '\n## Aktuelle Website-Informationen:\n';
      for (const content of websiteContent.slice(0, 3)) {
        instruction += `### ${content.title} (${content.section}):\n${content.content.substring(0, 500)}...\n\n`;
      }
    }

    // Escalation-Trigger
    if (config?.escalationTriggers) {
      instruction += `
## Eskalation:
Wenn der Kunde eines dieser Wörter verwendet, leite an einen Mitarbeiter weiter: ${config.escalationTriggers.join(', ')}
Füge dann "[escalate]" am Ende deiner Antwort hinzu.
`;
    }

    return instruction.trim();
  }

  /**
   * Hilfsmethode: Kategorie-Label
   */
  private static getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      general: 'Allgemein',
      billing: 'Zahlung & Rechnung',
      technical: 'Technische Fragen',
      account: 'Konto & Einstellungen',
      webmail: 'Webmail & E-Mail',
      orders: 'Aufträge',
      platform: 'Plattform',
    };
    return labels[category] || category;
  }

  /**
   * Initialisiert die Knowledge Base mit Standardeinträgen
   */
  static async initializeDefaultKnowledge(): Promise<void> {
    const existing = await this.getAllKnowledge();
    if (existing.length > 0) return; // Bereits initialisiert

    const defaultEntries: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'helpful' | 'notHelpful'>[] = [
      // Webmail
      {
        question: 'Was kostet Taskilo Webmail?',
        answer: 'Taskilo Webmail gibt es in 4 Tarifen: FreeMail (0,00 Euro/Monat, 1GB E-Mail, 2GB Cloud), Eigene Domain (1,99 Euro/Monat), ProMail (2,99 Euro/Monat, 10GB E-Mail, 10GB Cloud, IMAP/SMTP), BusinessMail (4,99 Euro/Monat, 50GB E-Mail, 50GB Cloud, alle Features inklusive).',
        category: 'webmail',
        keywords: ['webmail', 'email', 'preis', 'kosten', 'tarif', 'freemail', 'promail', 'businessmail'],
        priority: 10,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Wie richte ich mein Taskilo Webmail-Konto ein?',
        answer: 'Gehe zu Dashboard > Webmail > Neues Postfach. Wähle deinen Tarif (FreeMail 0 Euro, ProMail 2,99 Euro oder BusinessMail 4,99 Euro/Monat), gib deine gewünschte E-Mail-Adresse ein und setze ein sicheres Passwort.',
        category: 'webmail',
        keywords: ['webmail', 'email', 'einrichten', 'konto', 'postfach', 'neu'],
        priority: 10,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Wie kann ich mein Webmail-Passwort ändern?',
        answer: 'Gehe zu Dashboard > Webmail > Einstellungen > Passwort ändern. Gib dein aktuelles und neues Passwort ein. Das Passwort muss mindestens 8 Zeichen haben.',
        category: 'webmail',
        keywords: ['passwort', 'ändern', 'webmail', 'zurücksetzen'],
        priority: 9,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Wie konfiguriere ich IMAP/SMTP für meinen E-Mail-Client?',
        answer: 'IMAP: Server imap.taskilo.de, Port 993, SSL/TLS aktiviert. SMTP: Server smtp.taskilo.de, Port 587, STARTTLS aktiviert. Benutzername ist deine vollständige E-Mail-Adresse.',
        category: 'webmail',
        keywords: ['imap', 'smtp', 'outlook', 'apple mail', 'thunderbird', 'konfiguration', 'einstellungen'],
        priority: 8,
        source: 'manual',
        isActive: true,
      },
      // Aufträge
      {
        question: 'Kann ich meinen Auftrag stornieren?',
        answer: 'Die Stornierung hängt vom Status deines Auftrags ab. Bei bezahlten Aufträgen im Clearing-Status ist eine Stornierung bis 24h vor dem Termin möglich. Nach Beginn der Leistung ist keine Stornierung mehr möglich.',
        category: 'orders',
        keywords: ['stornieren', 'abbrechen', 'auftrag', 'kündigen'],
        priority: 10,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Wann wird mein Geld freigegeben?',
        answer: 'Bei Taskilo wird die Zahlung nach erfolgreicher Leistungserbringung freigegeben. Bei Aufträgen im Clearing-Status wird das Geld 14 Tage nach Auftragsabschluss automatisch an den Dienstleister freigegeben.',
        category: 'billing',
        keywords: ['geld', 'freigabe', 'zahlung', 'auszahlung', 'clearing'],
        priority: 9,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Was bedeutet der Status meines Auftrags?',
        answer: '"Zahlung erhalten - Clearing" = Auftrag ist bezahlt und wartet auf Ausführung. "In Bearbeitung" = Dienstleister arbeitet gerade. "Abgeschlossen" = Leistung wurde erbracht.',
        category: 'orders',
        keywords: ['status', 'auftrag', 'bedeutung', 'clearing', 'bearbeitung'],
        priority: 8,
        source: 'manual',
        isActive: true,
      },
      // E-Rechnung
      {
        question: 'Was ist eine E-Rechnung?',
        answer: 'Eine E-Rechnung ist eine elektronische Rechnung im strukturierten Format. Taskilo unterstützt die deutschen Standards XRechnung (XML-Format für Behörden) und ZUGFeRD (PDF mit eingebetteten XML-Daten). Seit Januar 2025 sind E-Rechnungen für B2B-Transaktionen in Deutschland Pflicht.',
        category: 'billing',
        keywords: ['e-rechnung', 'elektronische rechnung', 'xrechnung', 'zugferd', 'xml'],
        priority: 10,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Was ist XRechnung?',
        answer: 'XRechnung ist der deutsche Standard für elektronische Rechnungen an Behörden und öffentliche Auftraggeber. Es ist ein reines XML-Format ohne PDF. Taskilo generiert automatisch XRechnung-konforme Rechnungen für B2G-Geschäfte (Business-to-Government).',
        category: 'billing',
        keywords: ['xrechnung', 'behörde', 'xml', 'standard', 'b2g'],
        priority: 9,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Was ist ZUGFeRD?',
        answer: 'ZUGFeRD ist ein hybrides E-Rechnungsformat: Ein PDF mit eingebetteten maschinenlesbaren XML-Daten. Es kann sowohl von Menschen als auch von Maschinen gelesen werden. Taskilo unterstützt ZUGFeRD 2.1 und ist vollständig GoBD-konform.',
        category: 'billing',
        keywords: ['zugferd', 'pdf', 'hybrid', 'maschinenlesbar'],
        priority: 9,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Ab wann ist die E-Rechnung Pflicht?',
        answer: 'Die E-Rechnung ist in Deutschland seit Januar 2025 für B2B-Transaktionen schrittweise Pflicht. Für Rechnungen an Behörden gilt die Pflicht schon länger. Mit Taskilo bist du automatisch vorbereitet, da alle Rechnungen E-Rechnungs-konform erstellt werden.',
        category: 'billing',
        keywords: ['pflicht', 'gesetz', 'b2b', '2025', 'deadline'],
        priority: 10,
        source: 'manual',
        isActive: true,
      },
      {
        question: 'Wie erstelle ich eine E-Rechnung mit Taskilo?',
        answer: 'In Taskilo erstellst du Rechnungen wie gewohnt unter Dashboard > Finanzen > Rechnungen. Das System generiert automatisch E-Rechnungs-konforme Dokumente. Bei Kunden mit Leitweg-ID wird automatisch XRechnung erzeugt, ansonsten ZUGFeRD.',
        category: 'billing',
        keywords: ['erstellen', 'anleitung', 'leitweg-id', 'finanzen'],
        priority: 9,
        source: 'manual',
        isActive: true,
      },
      // Account
      {
        question: 'Wie kann ich meine Kontoeinstellungen ändern?',
        answer: 'Gehe zu Dashboard > Einstellungen. Dort kannst du dein Profil, Benachrichtigungen, Zahlungsmethoden und Sicherheitseinstellungen verwalten.',
        category: 'account',
        keywords: ['konto', 'einstellungen', 'profil', 'ändern'],
        priority: 7,
        source: 'manual',
        isActive: true,
      },
      // Platform
      {
        question: 'Wie finde ich den passenden Dienstleister?',
        answer: 'Erstelle einen Auftrag mit deinen Anforderungen. Dienstleister können sich dann auf deinen Auftrag bewerben und du kannst aus den Angeboten wählen. Achte auf Bewertungen und Qualifikationen.',
        category: 'platform',
        keywords: ['dienstleister', 'finden', 'suchen', 'anbieter'],
        priority: 8,
        source: 'manual',
        isActive: true,
      },
    ];

    for (const entry of defaultEntries) {
      await this.addKnowledge(entry);
    }
  }
}
