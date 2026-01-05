/**
 * Utility zur Validierung und Blockierung sensibler Daten in Chat-Eingaben
 * Verhindert die Eingabe von Telefonnummern, E-Mails und Adressen
 * Protokolliert Verstöße für Admin-Überwachung
 */

import { ContentSafetyService } from '@/services/ContentSafetyService';

// Regex-Patterns für sensible Daten (ähnlich wie im Lambda)
const SENSITIVE_DATA_PATTERNS = {
  // Deutsche Telefonnummern (spezifische Patterns)
  phone: [
    /(?:\+49|0049)\s*[1-9]\d{1,4}\s*\d{6,11}/g, // Internationale deutsche Nummern
    /\b0[1-9]\d{1,4}[\s\-\/]*\d{6,8}\b/g, // Deutsche Festnetz (mind. 6 Ziffern nach Vorwahl)
    /\b01[5-7]\d[\s\-]*\d{7,8}\b/g, // Mobile spezifisch (015x, 016x, 017x)
    /\b\+49[\s\-]*1[5-7]\d[\s\-]*\d{7,8}\b/g, // Internationale Mobile
    /\b\+49[\s\-]*[2-9]\d{1,4}[\s\-]*\d{6,8}\b/g, // Internationale Festnetz
  ],

  // E-Mail-Adressen
  email: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}/g, // Mit Leerzeichen
  ],

  // Deutsche Adressen (erweiterte Patterns)
  address: [
    /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*\b/gi, // PLZ + Ort (case insensitive)
    /[A-ZÄÖÜ][a-zäöüß]+(?:str\.|straße|strasse|weg|platz|allee|gasse|ring|damm|bach)\s*\d+[a-z]?/gi, // Straße + Hausnummer
    /\d+[a-z]?\s+[A-ZÄÖÜ][a-zäöüß]+(?:str\.|straße|strasse|weg|platz|allee|gasse|ring|damm|bach)/gi, // Hausnummer + Straße
    /[a-zäöüß]+\s+[a-zäöüß]+\s+\d+\s+\d{5}\s+[a-zäöüß]+/gi, // Vollständige Adresse wie "am bach 6 59796 münchen"
  ],
};

export interface SensitiveDataResult {
  isValid: boolean;
  blockedType?: 'phone' | 'email' | 'address';
  detectedData?: string;
  suggestion: string;
}

/**
 * Validiert Text auf sensible Daten
 * @param text - Der zu validierende Text
 * @returns Validierungsergebnis mit Details
 */
export function validateSensitiveData(text: string): SensitiveDataResult {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return { isValid: true, suggestion: '' };
  }

  // Prüfe auf Telefonnummern
  for (const pattern of SENSITIVE_DATA_PATTERNS.phone) {
    const matches = trimmedText.match(pattern);
    if (matches && matches.length > 0) {
      return {
        isValid: false,
        blockedType: 'phone',
        detectedData: matches[0],
        suggestion:
          'Bitte teilen Sie Telefonnummern nicht im Chat. Nutzen Sie das Taskilo-Messaging-System für sichere Kommunikation.',
      };
    }
  }

  // Prüfe auf E-Mail-Adressen
  for (const pattern of SENSITIVE_DATA_PATTERNS.email) {
    const matches = trimmedText.match(pattern);
    if (matches && matches.length > 0) {
      return {
        isValid: false,
        blockedType: 'email',
        detectedData: matches[0],
        suggestion:
          'Bitte teilen Sie E-Mail-Adressen nicht im Chat. Nutzen Sie das Taskilo-Messaging-System für sichere Kommunikation.',
      };
    }
  }

  // Prüfe auf Adressen
  for (const pattern of SENSITIVE_DATA_PATTERNS.address) {
    const matches = trimmedText.match(pattern);
    if (matches && matches.length > 0) {
      return {
        isValid: false,
        blockedType: 'address',
        detectedData: matches[0],
        suggestion:
          'Bitte teilen Sie Adressen nicht im Chat. Nutzen Sie die Projektdetails oder das sichere Messaging-System.',
      };
    }
  }

  return { isValid: true, suggestion: '' };
}

/**
 * Sanitisiert Text durch Entfernung/Maskierung sensibler Daten
 * @param text - Der zu bereinigende Text
 * @returns Bereinigter Text
 */
export function sanitizeSensitiveData(text: string): string {
  let sanitized = text;

  // Ersetze Telefonnummern
  for (const pattern of SENSITIVE_DATA_PATTERNS.phone) {
    sanitized = sanitized.replace(pattern, '[TELEFONNUMMER ENTFERNT]');
  }

  // Ersetze E-Mails
  for (const pattern of SENSITIVE_DATA_PATTERNS.email) {
    sanitized = sanitized.replace(pattern, '[E-MAIL ENTFERNT]');
  }

  // Ersetze Adressen
  for (const pattern of SENSITIVE_DATA_PATTERNS.address) {
    sanitized = sanitized.replace(pattern, '[ADRESSE ENTFERNT]');
  }

  return sanitized;
}

/**
 * Prüft ob Text sensible Daten enthält (einfache Boolean-Check)
 * @param text - Der zu prüfende Text
 * @returns true wenn sensible Daten gefunden wurden
 */
export function containsSensitiveData(text: string): boolean {
  return !validateSensitiveData(text).isValid;
}

/**
 * Erstellt eine benutzerfreundliche Warnung basierend auf dem Datentyp
 * @param blockedType - Der Typ der blockierten Daten
 * @returns Warnnachricht
 */
export function getSensitiveDataWarning(blockedType: 'phone' | 'email' | 'address'): string {
  switch (blockedType) {
    case 'phone':
      return 'Das Teilen von Telefonnummern im Chat ist nicht erlaubt. Für direkten Kontakt nutzen Sie bitte die kostenpflichtigen Taskilo-Services.';
    case 'email':
      return 'Das Teilen von E-Mail-Adressen im Chat ist nicht erlaubt. Für direkten Kontakt nutzen Sie bitte die kostenpflichtigen Taskilo-Services.';
    case 'address':
      return 'Das Teilen von Adressen im Chat ist nicht erlaubt. Für direkten Kontakt nutzen Sie bitte die kostenpflichtigen Taskilo-Services.';
    default:
      return 'Das Teilen von Kontaktdaten im Chat ist nicht erlaubt. Für direkten Kontakt nutzen Sie bitte die kostenpflichtigen Taskilo-Services.';
  }
}

/**
 * Validiert und protokolliert sensible Daten für Admin-Überwachung
 * @param text - Der zu validierende Text
 * @param context - Kontext der Validierung (chat, proposal, order_message)
 * @param companyId - ID des Unternehmens
 * @param companyName - Name des Unternehmens
 * @param userId - ID des Benutzers
 * @returns Validierungsergebnis
 */
export async function validateAndLogSensitiveData(
  text: string,
  context: 'proposal' | 'chat' | 'order_message',
  companyId: string,
  companyName: string,
  userId: string
): Promise<SensitiveDataResult> {
  const result = validateSensitiveData(text);
  
  if (!result.isValid && result.blockedType && result.detectedData) {
    // Protokolliere Verstoß für Admin-Überwachung
    try {
      await ContentSafetyService.logViolation(
        companyId,
        companyName,
        userId,
        context,
        text,
        [{
          type: result.blockedType,
          match: result.detectedData,
          position: text.indexOf(result.detectedData),
        }]
      );
    } catch {
      // Silent fail - Logging sollte Hauptfunktion nicht blockieren
    }
  }
  
  return result;
}
