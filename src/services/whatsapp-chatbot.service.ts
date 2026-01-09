/**
 * WhatsApp Chatbot Service - Nutzt Taskilo KI (Gemini)
 * 
 * Automatisierte Antworten für WhatsApp-Nachrichten:
 * - Geschäftszeiten-basierte Auto-Replies
 * - Keyword-basierte Antworten
 * - KI-gestützte Konversation (Taskilo KI)
 * - Eskalation an Mitarbeiter
 */

import { db } from '@/firebase/server';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerationConfig,
  type SafetySetting,
} from '@google/generative-ai';

// Interfaces
export interface BusinessHours {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface AutoReply {
  id: string;
  name: string;
  type: 'outside_hours' | 'welcome' | 'keyword' | 'absence' | 'ai';
  triggerKeywords?: string[];
  message: string;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  priority: number;
}

export interface ChatbotSettings {
  enabled: boolean;
  useTaskiloAI: boolean;
  businessHours: BusinessHours[];
  autoReplies: AutoReply[];
  welcomeMessageEnabled: boolean;
  welcomeMessage: string;
  outsideHoursMessage: string;
  escalationKeywords: string[];
  maxAIMessagesPerConversation: number;
}

interface ConversationContext {
  companyId: string;
  customerPhone: string;
  customerName?: string;
  customerId?: string;
  messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  isNewConversation: boolean;
  aiMessageCount: number;
}

const DEFAULT_SETTINGS: ChatbotSettings = {
  enabled: false,
  useTaskiloAI: true,
  businessHours: [
    { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { dayOfWeek: 6, isOpen: false, openTime: '10:00', closeTime: '14:00' },
    { dayOfWeek: 0, isOpen: false, openTime: '10:00', closeTime: '14:00' },
  ],
  autoReplies: [],
  welcomeMessageEnabled: true,
  welcomeMessage: 'Hallo! Willkommen bei unserem WhatsApp-Service. Wie können wir Ihnen helfen?',
  outsideHoursMessage: 'Vielen Dank für Ihre Nachricht. Unser Team ist derzeit nicht erreichbar. Wir melden uns zu unseren Geschäftszeiten bei Ihnen.',
  escalationKeywords: ['mitarbeiter', 'mensch', 'support', 'hilfe', 'beschwerde', 'reklamation', 'dringend'],
  maxAIMessagesPerConversation: 10,
};

export class WhatsAppChatbotService {
  private static MODEL_NAME = 'gemini-2.5-flash';

  /**
   * Lädt Chatbot-Einstellungen für ein Unternehmen
   */
  static async getSettings(companyId: string): Promise<ChatbotSettings> {
    if (!db) throw new Error('Firebase nicht verfügbar');

    const settingsDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsapp')
      .doc('chatbotSettings')
      .get();

    if (!settingsDoc.exists) {
      return DEFAULT_SETTINGS;
    }

    return { ...DEFAULT_SETTINGS, ...settingsDoc.data() } as ChatbotSettings;
  }

  /**
   * Speichert Chatbot-Einstellungen
   */
  static async saveSettings(companyId: string, settings: Partial<ChatbotSettings>): Promise<void> {
    if (!db) throw new Error('Firebase nicht verfügbar');

    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsapp')
      .doc('chatbotSettings')
      .set(settings, { merge: true });
  }

  /**
   * Prüft ob aktuell Geschäftszeiten sind
   */
  static isWithinBusinessHours(settings: ChatbotSettings, timezone = 'Europe/Berlin'): boolean {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('de-DE', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const currentTime = formatter.format(now);
    const dayOfWeek = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    const todayHours = settings.businessHours.find(h => h.dayOfWeek === dayOfWeek);

    if (!todayHours || !todayHours.isOpen) {
      return false;
    }

    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [openHour, openMinute] = todayHours.openTime.split(':').map(Number);
    const openMinutes = openHour * 60 + openMinute;

    const [closeHour, closeMinute] = todayHours.closeTime.split(':').map(Number);
    const closeMinutes = closeHour * 60 + closeMinute;

    // Prüfe Mittagspause
    if (todayHours.breakStart && todayHours.breakEnd) {
      const [breakStartHour, breakStartMinute] = todayHours.breakStart.split(':').map(Number);
      const breakStartMinutes = breakStartHour * 60 + breakStartMinute;

      const [breakEndHour, breakEndMinute] = todayHours.breakEnd.split(':').map(Number);
      const breakEndMinutes = breakEndHour * 60 + breakEndMinute;

      if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
        return false;
      }
    }

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  /**
   * Prüft ob eine Abwesenheitsnotiz aktiv ist
   */
  static getActiveAbsence(settings: ChatbotSettings): AutoReply | null {
    const now = new Date();

    return settings.autoReplies.find(reply => {
      if (reply.type !== 'absence' || !reply.isActive) return false;

      if (reply.validFrom && new Date(reply.validFrom) > now) return false;
      if (reply.validUntil && new Date(reply.validUntil) < now) return false;

      return true;
    }) || null;
  }

  /**
   * Findet passende Keyword-Antwort
   */
  static findKeywordMatch(message: string, settings: ChatbotSettings): AutoReply | null {
    const lowerMessage = message.toLowerCase();

    const keywordReplies = settings.autoReplies
      .filter(reply => reply.type === 'keyword' && reply.isActive && reply.triggerKeywords)
      .sort((a, b) => b.priority - a.priority);

    for (const reply of keywordReplies) {
      const hasMatch = reply.triggerKeywords?.some(keyword => 
        lowerMessage.includes(keyword.toLowerCase())
      );

      if (hasMatch) {
        return reply;
      }
    }

    return null;
  }

  /**
   * Prüft ob Eskalation erforderlich ist
   */
  static shouldEscalate(message: string, settings: ChatbotSettings): boolean {
    const lowerMessage = message.toLowerCase();

    return settings.escalationKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  /**
   * Lädt Konversationskontext
   */
  static async getConversationContext(
    companyId: string,
    customerPhone: string
  ): Promise<ConversationContext> {
    if (!db) throw new Error('Firebase nicht verfügbar');

    // Hole letzte Nachrichten (max 10)
    const messagesSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappMessages')
      .where('customerPhone', '==', customerPhone)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const messages = messagesSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          role: data.direction === 'inbound' ? 'user' : 'assistant' as 'user' | 'assistant',
          content: data.body || '',
          timestamp: data.createdAt?.toDate?.() || new Date(),
        };
      })
      .reverse();

    // Zähle KI-Nachrichten
    const aiMessageCount = messagesSnapshot.docs.filter(doc => 
      doc.data().isAIGenerated === true
    ).length;

    // Prüfe ob neue Konversation (keine Nachrichten in den letzten 24h)
    const lastMessage = messages[messages.length - 1];
    const isNewConversation = !lastMessage || 
      (new Date().getTime() - lastMessage.timestamp.getTime()) > 24 * 60 * 60 * 1000;

    // Hole Kundendaten
    let customerName: string | undefined;
    let customerId: string | undefined;

    const cleanPhone = customerPhone.replace(/\D/g, '');
    const customerSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('customers')
      .where('phone', '==', cleanPhone)
      .limit(1)
      .get();

    if (!customerSnapshot.empty) {
      const customerData = customerSnapshot.docs[0].data();
      customerId = customerSnapshot.docs[0].id;
      customerName = customerData.name || customerData.firstName;
    }

    return {
      companyId,
      customerPhone,
      customerName,
      customerId,
      messageHistory: messages,
      isNewConversation,
      aiMessageCount,
    };
  }

  /**
   * Generiert KI-Antwort mit Taskilo KI (Gemini)
   */
  static async generateAIResponse(
    companyId: string,
    message: string,
    context: ConversationContext
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY nicht konfiguriert');
    }

    if (!db) throw new Error('Firebase nicht verfügbar');

    // Lade Unternehmensdaten
    const companyDoc = await db.collection('companies').doc(companyId).get();
    const companyData = companyDoc.data();
    const companyName = companyData?.name || companyData?.companyName || 'Unser Unternehmen';

    // Lade Chatbot-spezifische Knowledge Base
    const knowledgeSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappChatbotKnowledge')
      .where('isActive', '==', true)
      .get();

    const knowledge = knowledgeSnapshot.docs.map(doc => ({
      question: doc.data().question,
      answer: doc.data().answer,
      category: doc.data().category,
    }));

    // System-Instruktion für WhatsApp-Kontext
    const systemInstruction = `Du bist der freundliche WhatsApp-Assistent von ${companyName}.

WICHTIGE REGELN:
1. Antworte kurz und prägnant (WhatsApp-Stil, max 300 Zeichen wenn möglich)
2. Sei freundlich und hilfsbereit
3. Nutze informelles "Sie" oder "du" je nach Kontext
4. Verwende passende Emojis sparsam
5. Bei komplexen Anfragen oder Beschwerden, weise auf den menschlichen Support hin
6. Gib niemals sensible Daten preis (Preise, interne Infos) ohne Verifizierung
7. Wenn du etwas nicht weißt, sage es ehrlich

${context.customerName ? `Der Kunde heißt: ${context.customerName}` : ''}

WISSENSBANK:
${knowledge.map(k => `F: ${k.question}\nA: ${k.answer}`).join('\n\n')}

UNTERNEHMENSDATEN:
- Name: ${companyName}
- Telefon: ${companyData?.phone || 'Nicht verfügbar'}
- E-Mail: ${companyData?.email || 'Nicht verfügbar'}
- Website: ${companyData?.website || 'Nicht verfügbar'}

Bei Fragen die du nicht beantworten kannst, antworte mit:
"Für diese Anfrage verbinde ich Sie gerne mit einem Mitarbeiter. Einen Moment bitte! 🙏"`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.MODEL_NAME,
      systemInstruction,
    });

    const generationConfig: GenerationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 500,
    };

    const safetySettings: SafetySetting[] = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // Bereite Chat-Historie vor
    const history = context.messageHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model' as 'user' | 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history,
    });

    const result = await chat.sendMessage(message);
    const response = result.response;

    return response.text();
  }

  /**
   * Verarbeitet eingehende WhatsApp-Nachricht und generiert automatische Antwort
   */
  static async processIncomingMessage(
    companyId: string,
    customerPhone: string,
    message: string
  ): Promise<{
    shouldReply: boolean;
    replyMessage?: string;
    replyType: 'welcome' | 'outside_hours' | 'absence' | 'keyword' | 'ai' | 'escalation' | 'none';
    shouldEscalate: boolean;
  }> {
    const settings = await this.getSettings(companyId);

    // Chatbot deaktiviert
    if (!settings.enabled) {
      return { shouldReply: false, replyType: 'none', shouldEscalate: false };
    }

    const context = await this.getConversationContext(companyId, customerPhone);

    // 1. Prüfe auf Eskalations-Keywords
    if (this.shouldEscalate(message, settings)) {
      return {
        shouldReply: true,
        replyMessage: 'Ich verbinde Sie mit einem Mitarbeiter. Bitte haben Sie einen Moment Geduld. 🙏',
        replyType: 'escalation',
        shouldEscalate: true,
      };
    }

    // 2. Prüfe auf aktive Abwesenheit
    const absence = this.getActiveAbsence(settings);
    if (absence) {
      return {
        shouldReply: true,
        replyMessage: absence.message,
        replyType: 'absence',
        shouldEscalate: false,
      };
    }

    // 3. Prüfe Geschäftszeiten
    if (!this.isWithinBusinessHours(settings)) {
      return {
        shouldReply: true,
        replyMessage: settings.outsideHoursMessage,
        replyType: 'outside_hours',
        shouldEscalate: false,
      };
    }

    // 4. Begrüßungsnachricht für neue Konversationen
    if (context.isNewConversation && settings.welcomeMessageEnabled) {
      // Bei neuer Konversation: Begrüßung + evtl. KI-Antwort
      let welcomeReply = settings.welcomeMessage;

      if (settings.useTaskiloAI && message.trim().length > 0) {
        try {
          const aiResponse = await this.generateAIResponse(companyId, message, context);
          welcomeReply = `${settings.welcomeMessage}\n\n${aiResponse}`;
        } catch {
          // Fallback auf nur Begrüßung
        }
      }

      return {
        shouldReply: true,
        replyMessage: welcomeReply,
        replyType: 'welcome',
        shouldEscalate: false,
      };
    }

    // 5. Keyword-basierte Antwort
    const keywordMatch = this.findKeywordMatch(message, settings);
    if (keywordMatch) {
      return {
        shouldReply: true,
        replyMessage: keywordMatch.message,
        replyType: 'keyword',
        shouldEscalate: false,
      };
    }

    // 6. Taskilo KI Antwort
    if (settings.useTaskiloAI) {
      // Prüfe ob Max-Limit erreicht
      if (context.aiMessageCount >= settings.maxAIMessagesPerConversation) {
        return {
          shouldReply: true,
          replyMessage: 'Für weitere Unterstützung verbinde ich Sie gerne mit einem Mitarbeiter. 🙏',
          replyType: 'escalation',
          shouldEscalate: true,
        };
      }

      try {
        const aiResponse = await this.generateAIResponse(companyId, message, context);

        return {
          shouldReply: true,
          replyMessage: aiResponse,
          replyType: 'ai',
          shouldEscalate: false,
        };
      } catch {
        // KI-Fehler: Eskaliere an Mitarbeiter
        return {
          shouldReply: true,
          replyMessage: 'Ich verbinde Sie mit einem Mitarbeiter. Bitte haben Sie einen Moment Geduld. 🙏',
          replyType: 'escalation',
          shouldEscalate: true,
        };
      }
    }

    // Kein Auto-Reply
    return { shouldReply: false, replyType: 'none', shouldEscalate: false };
  }
}

export default WhatsAppChatbotService;
