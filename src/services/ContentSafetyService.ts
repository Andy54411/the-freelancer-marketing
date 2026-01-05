/**
 * ContentSafetyService - Erkennt private Daten in Nachrichten
 * Verhindert die Weitergabe von Telefonnummern, E-Mail-Adressen und physischen Adressen
 * Protokolliert Verstöße für Admin-Überwachung
 */

import { db } from '@/firebase/clients';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface ContentViolation {
  type: 'phone' | 'email' | 'address' | 'url' | 'social_media';
  match: string;
  position: number;
}

export interface ContentSafetyResult {
  isSafe: boolean;
  violations: ContentViolation[];
  sanitizedText?: string;
}

export interface ContentViolationLog {
  id?: string;
  companyId: string;
  companyName: string;
  userId: string;
  context: 'proposal' | 'chat' | 'order_message';
  originalText: string;
  violations: ContentViolation[];
  createdAt: Timestamp;
  reviewed: boolean;
  action?: 'warning' | 'suspended' | 'banned' | null;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  notes?: string;
}

/**
 * Regex-Patterns für die Erkennung privater Daten
 */
const PATTERNS = {
  // Deutsche und internationale Telefonnummern
  phone: [
    // Deutsche Formate: 0171-1234567, 0171 1234567, 0171/1234567, +49 171 1234567
    /(?:\+49|0049|0)\s*[1-9][0-9]{1,4}[\s\-\/]?[0-9]{3,}[\s\-\/]?[0-9]{0,}/gi,
    // Internationale Formate: +1 555 123 4567
    /\+[1-9][0-9]{0,3}[\s\-]?[0-9]{2,4}[\s\-]?[0-9]{3,}/gi,
    // Allgemeine Telefonnummern mit mindestens 6 Ziffern
    /\b\d{3,5}[\s\-\/]?\d{3,}[\s\-\/]?\d{2,}\b/g,
  ],

  // E-Mail-Adressen
  email: [
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi,
    // Verschleierte E-Mails: beispiel [at] domain [dot] de
    /[a-zA-Z0-9._%+\-]+\s*[\[\(\{]?\s*(?:at|@|bei)\s*[\]\)\}]?\s*[a-zA-Z0-9.\-]+\s*[\[\(\{]?\s*(?:dot|punkt|\.)\s*[\]\)\}]?\s*[a-zA-Z]{2,}/gi,
  ],

  // Physische Adressen (Straße + Hausnummer)
  address: [
    // Straße mit Hausnummer: Musterstraße 123, Muster-Straße 12a
    /\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|str\.|weg|allee|platz|ring|damm|gasse)\s+\d+[a-zA-Z]?\b/gi,
    // PLZ + Stadt: 12345 Berlin
    /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+\b/gi,
  ],

  // URLs und Websites
  url: [
    /https?:\/\/[^\s]+/gi,
    /www\.[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}[^\s]*/gi,
    // Verschleierte URLs
    /[a-zA-Z0-9\-]+\s*[\[\(\{]?\s*(?:dot|punkt)\s*[\]\)\}]?\s*(?:de|com|net|org|info|eu|at|ch)/gi,
  ],

  // Social Media Handles
  social_media: [
    // Instagram, Twitter: @username
    /@[a-zA-Z0-9_]{3,}/g,
    // WhatsApp-Hinweise
    /whatsapp\s*[:\-]?\s*\+?[0-9\s\-]+/gi,
    /telegram\s*[:\-]?\s*@?[a-zA-Z0-9_]+/gi,
  ],
};

/**
 * Erlaubte Ausnahmen (keine Verstöße)
 */
const ALLOWED_EXCEPTIONS = [
  '@taskilo.de',
  'taskilo.de',
  '@gmail.com', // Generische Beispiele in Platzhaltern
  'beispiel@',
  'muster@',
  'example@',
];

export class ContentSafetyService {
  /**
   * Prüft ob ein Text private Daten enthält
   */
  static checkContent(text: string): ContentSafetyResult {
    const violations: ContentViolation[] = [];

    // Prüfe alle Pattern-Kategorien
    for (const [type, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        // Reset regex state
        pattern.lastIndex = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
          const matchText = match[0];
          const matchLower = matchText.toLowerCase();

          // Prüfe auf erlaubte Ausnahmen
          const isAllowed = ALLOWED_EXCEPTIONS.some(
            exception => matchLower.includes(exception.toLowerCase())
          );

          if (!isAllowed) {
            violations.push({
              type: type as ContentViolation['type'],
              match: matchText,
              position: match.index,
            });
          }
        }
      }
    }

    // Entferne Duplikate basierend auf Position
    const uniqueViolations = violations.filter(
      (v, i, arr) => arr.findIndex(x => x.position === v.position) === i
    );

    return {
      isSafe: uniqueViolations.length === 0,
      violations: uniqueViolations,
    };
  }

  /**
   * Gibt benutzerfreundliche Fehlermeldung zurück
   */
  static getViolationMessage(violations: ContentViolation[]): string {
    const types = [...new Set(violations.map(v => v.type))];
    const typeLabels: Record<string, string> = {
      phone: 'Telefonnummern',
      email: 'E-Mail-Adressen',
      address: 'Adressen',
      url: 'Webseiten-Links',
      social_media: 'Social-Media-Kontakte',
    };

    const detectedTypes = types.map(t => typeLabels[t] || t).join(', ');

    return `Ihre Nachricht enthält private Kontaktdaten (${detectedTypes}). Die Weitergabe von Kontaktdaten außerhalb der Plattform ist nicht gestattet und kann zur Sperrung Ihres Kontos führen.`;
  }

  /**
   * Protokolliert einen Verstoß für Admin-Überwachung
   */
  static async logViolation(
    companyId: string,
    companyName: string,
    userId: string,
    context: 'proposal' | 'chat' | 'order_message',
    originalText: string,
    violations: ContentViolation[]
  ): Promise<void> {
    try {
      const violationLog: Omit<ContentViolationLog, 'id'> = {
        companyId,
        companyName,
        userId,
        context,
        originalText,
        violations,
        createdAt: Timestamp.now(),
        reviewed: false,
        action: null,
      };

      await addDoc(collection(db, 'content_violations'), violationLog);
    } catch {
      // Silent fail - Logging sollte Hauptfunktion nicht blockieren
    }
  }

  /**
   * Erstellt eine sanitisierte Version des Textes (optional)
   */
  static sanitizeText(text: string): string {
    let sanitized = text;

    for (const patterns of Object.values(PATTERNS)) {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        sanitized = sanitized.replace(pattern, '[ENTFERNT]');
      }
    }

    return sanitized;
  }

  /**
   * Prüft ob der Text nur eine Warnung benötigt (leichte Verstöße)
   * oder komplett blockiert werden sollte (schwere Verstöße)
   */
  static getViolationSeverity(
    violations: ContentViolation[]
  ): 'none' | 'warning' | 'block' {
    if (violations.length === 0) return 'none';

    // Telefonnummern und E-Mails sind immer schwere Verstöße
    const severeTypes = ['phone', 'email'];
    const hasSevere = violations.some(v => severeTypes.includes(v.type));

    if (hasSevere) return 'block';

    // URLs und Social Media sind Warnungen (könnten legitim sein)
    return 'warning';
  }
}

export default ContentSafetyService;
