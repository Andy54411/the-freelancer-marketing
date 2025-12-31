/**
 * Taskilo E-Mail Registration Routes
 * 
 * Mehrstufiger Registrierungsprozess für @taskilo.de E-Mail-Adressen
 * Läuft auf dem Hetzner Server (webmail-proxy)
 * 
 * Schritte:
 * 1. Name eingeben (Vor- und Nachname)
 * 2. E-Mail-Adresse wählen (prefix@taskilo.de)
 * 3. Geburtsdatum und Geschlecht (optional)
 * 4. Passwort erstellen
 * 5. Telefonnummer bestätigen (SMS)
 * 6. Nutzungsbedingungen akzeptieren
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import profileService from '../services/ProfileService';

const router = Router();

// Temporärer Speicher für Registrierungssessions (in Production: Redis)
const registrationSessions: Map<string, RegistrationSession> = new Map();

// Verfügbare E-Mail-Adressen Cache (wird regelmäßig aktualisiert)
const usedEmailAddresses: Set<string> = new Set();

interface RegistrationSession {
  sessionId: string;
  step: number;
  createdAt: Date;
  expiresAt: Date;
  data: {
    firstName?: string;
    lastName?: string;
    emailPrefix?: string;
    birthDate?: string;
    gender?: string;
    password?: string;
    phone?: string;
    phoneVerified?: boolean;
    verificationCode?: string;
    termsAccepted?: boolean;
  };
}

// Session-Timeout: 30 Minuten
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Generiere eine neue Session-ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generiere einen 6-stelligen Verifizierungscode
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Prüfe ob eine E-Mail-Adresse verfügbar ist
 */
async function isEmailAvailable(emailPrefix: string): Promise<boolean> {
  // Prüfe im lokalen Cache
  if (usedEmailAddresses.has(emailPrefix.toLowerCase())) {
    console.log(`[EMAIL-CHECK] ${emailPrefix} - Cache hit: NOT available`);
    return false;
  }

  // Prüfe in Mailcow via API
  try {
    const mailcowApiUrl = process.env.MAILCOW_API_URL || 'http://localhost:8080';
    const mailcowApiKey = process.env.MAILCOW_API_KEY;
    
    const apiEndpoint = `${mailcowApiUrl}/api/v1/get/mailbox/${emailPrefix}@taskilo.de`;
    console.log(`[EMAIL-CHECK] Checking: ${apiEndpoint}`);

    const response = await fetch(apiEndpoint, {
      headers: {
        'X-API-Key': mailcowApiKey || '',
        'Content-Type': 'application/json',
      },
    });

    console.log(`[EMAIL-CHECK] ${emailPrefix} - Status: ${response.status}`);

    // Wenn 404, dann ist die E-Mail verfügbar
    if (response.status === 404) {
      console.log(`[EMAIL-CHECK] ${emailPrefix} - 404: AVAILABLE`);
      return true;
    }

    const data = await response.json();
    console.log(`[EMAIL-CHECK] ${emailPrefix} - Response:`, JSON.stringify(data));
    
    // Leeres Objekt oder Array = verfügbar
    const isAvailable = !data || (typeof data === 'object' && Object.keys(data).length === 0) || (Array.isArray(data) && data.length === 0);
    console.log(`[EMAIL-CHECK] ${emailPrefix} - Result: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    return isAvailable;
  } catch (error) {
    console.error(`[EMAIL-CHECK] ${emailPrefix} - Error:`, error);
    // Bei Fehler konservativ annehmen, dass E-Mail nicht verfügbar ist
    return false;
  }
}

/**
 * Erstelle Mailbox in Mailcow
 */
async function createMailbox(
  emailPrefix: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const mailcowApiUrl = process.env.MAILCOW_API_URL || 'http://localhost:8080';
    const mailcowApiKey = process.env.MAILCOW_API_KEY;

    console.log(`[MAILBOX] Creating mailbox for ${emailPrefix}@taskilo.de`);
    console.log(`[MAILBOX] API URL: ${mailcowApiUrl}/api/v1/add/mailbox`);

    const response = await fetch(`${mailcowApiUrl}/api/v1/add/mailbox`, {
      method: 'POST',
      headers: {
        'X-API-Key': mailcowApiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        local_part: emailPrefix,
        domain: 'taskilo.de',
        name: `${firstName} ${lastName}`.trim(),
        password: password,
        password2: password,
        quota: 1024, // 1 GB Quota
        active: 1,
        force_pw_update: 0,
        tls_enforce_in: 1,
        tls_enforce_out: 1,
      }),
    });

    const responseData = await response.json() as Array<{ type?: string; msg?: string | string[] }> | { type?: string; msg?: string | string[] };
    console.log(`[MAILBOX] Response status: ${response.status}`);
    console.log(`[MAILBOX] Response data:`, JSON.stringify(responseData));

    // Mailcow gibt manchmal ein Array von Ergebnissen zurück
    // Prüfe ob mindestens ein Eintrag type: "success" hat
    let isSuccess = false;
    let errorMsg = 'Fehler beim Erstellen der Mailbox';
    
    if (Array.isArray(responseData)) {
      // Array von Ergebnissen - prüfe ob mailbox_added dabei ist
      for (const item of responseData) {
        if (item.type === 'success' && item.msg) {
          const msg = Array.isArray(item.msg) ? item.msg[0] : item.msg;
          if (msg === 'mailbox_added') {
            isSuccess = true;
            break;
          }
        }
        if (item.type === 'error' && item.msg) {
          errorMsg = Array.isArray(item.msg) ? item.msg.join(', ') : item.msg;
        }
      }
    } else if (responseData && typeof responseData === 'object') {
      // Einzelnes Objekt
      const data = responseData as { type?: string; msg?: string | string[] };
      isSuccess = data.type === 'success';
      if (data.msg) {
        errorMsg = Array.isArray(data.msg) ? data.msg.join(', ') : data.msg;
      }
    }

    if (response.ok && isSuccess) {
      console.log(`[MAILBOX] Success! Mailbox created for ${emailPrefix}@taskilo.de`);
      // Füge zum Cache hinzu
      usedEmailAddresses.add(emailPrefix.toLowerCase());
      return { success: true };
    }

    console.error(`[MAILBOX] Failed to create mailbox:`, errorMsg);
    return { 
      success: false, 
      error: errorMsg
    };
  } catch (err) {
    console.error(`[MAILBOX] Exception:`, err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unbekannter Fehler' 
    };
  }
}

/**
 * Sende SMS-Verifizierungscode via Twilio Verify
 */
async function sendSmsVerification(phone: string, _code: string): Promise<boolean> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioVerifySid = process.env.TWILIO_VERIFY_SID;

  // Telefonnummer ins internationale Format konvertieren
  let formattedPhone = phone;
  if (phone.startsWith('0')) {
    formattedPhone = '+49' + phone.substring(1);
  } else if (!phone.startsWith('+')) {
    formattedPhone = '+49' + phone;
  }

  console.log(`[SMS] Sende Verifizierungscode an ${formattedPhone}`);

  // Wenn Twilio nicht konfiguriert ist, Code in Logs anzeigen (nur für Dev/Test)
  if (!twilioAccountSid || !twilioAuthToken || !twilioVerifySid) {
    console.log(`[SMS] TWILIO NICHT KONFIGURIERT`);
    console.log(`[SMS] Bitte TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN und TWILIO_VERIFY_SID in .env setzen`);
    return true;
  }

  try {
    // Twilio Verify API aufrufen
    const authString = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
    
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${twilioVerifySid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Channel: 'sms',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as { message?: string; code?: number };
      console.error(`[SMS] Twilio Verify Fehler:`, errorData);
      return false;
    }

    const data = await response.json() as { sid: string; status: string };
    console.log(`[SMS] Verification gestartet, SID: ${data.sid}, Status: ${data.status}`);
    return true;
  } catch (error) {
    console.error(`[SMS] Fehler beim Senden:`, error);
    return false;
  }
}

/**
 * Verifiziere SMS-Code via Twilio Verify
 */
async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioVerifySid = process.env.TWILIO_VERIFY_SID;

  // Telefonnummer ins internationale Format konvertieren
  let formattedPhone = phone;
  if (phone.startsWith('0')) {
    formattedPhone = '+49' + phone.substring(1);
  } else if (!phone.startsWith('+')) {
    formattedPhone = '+49' + phone;
  }

  // Wenn Twilio nicht konfiguriert ist, akzeptiere den gespeicherten Code
  if (!twilioAccountSid || !twilioAuthToken || !twilioVerifySid) {
    console.log(`[SMS] TWILIO NICHT KONFIGURIERT - Fallback auf lokale Verifizierung`);
    return false; // Fallback auf lokale Verifizierung
  }

  try {
    const authString = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
    
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${twilioVerifySid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Code: code,
        }),
      }
    );

    const data = await response.json() as { status: string; valid: boolean };
    console.log(`[SMS] Verification Check - Status: ${data.status}, Valid: ${data.valid}`);
    
    return data.status === 'approved' || data.valid === true;
  } catch (error) {
    console.error(`[SMS] Fehler bei der Verifizierung:`, error);
    return false;
  }
}

// ============================================================================
// ROUTE: Registrierung starten
// ============================================================================

/**
 * POST /registration/start
 * Startet eine neue Registrierungssession
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const sessionId = generateSessionId();
    const now = new Date();

    const session: RegistrationSession = {
      sessionId,
      step: 1,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TIMEOUT_MS),
      data: {},
    };

    registrationSessions.set(sessionId, session);

    res.json({
      success: true,
      sessionId,
      step: 1,
      nextStep: '/registration/step1',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Starten der Registrierung',
    });
  }
});

// ============================================================================
// STEP 1: Name eingeben
// ============================================================================

/**
 * POST /registration/step1
 * Vor- und Nachname eingeben
 */
router.post('/step1', async (req: Request, res: Response) => {
  try {
    const { sessionId, firstName, lastName } = req.body;

    // Session validieren
    const session = registrationSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige oder abgelaufene Session',
      });
    }

    // Session abgelaufen?
    if (new Date() > session.expiresAt) {
      registrationSessions.delete(sessionId);
      return res.status(400).json({
        success: false,
        error: 'Session abgelaufen. Bitte starten Sie die Registrierung erneut.',
      });
    }

    // Validierung
    if (!firstName || firstName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bitte geben Sie einen gültigen Vornamen ein (mindestens 2 Zeichen)',
      });
    }

    // Nachname ist optional bei Google, bei uns auch
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName?.trim() || '';

    // Session aktualisieren
    session.data.firstName = cleanFirstName;
    session.data.lastName = cleanLastName;
    session.step = 2;

    // E-Mail-Vorschlag generieren
    const suggestedEmail = `${cleanFirstName.toLowerCase()}${cleanLastName ? '.' + cleanLastName.toLowerCase() : ''}`
      .replace(/[^a-z0-9.]/g, '')
      .substring(0, 30);

    res.json({
      success: true,
      step: 2,
      nextStep: '/registration/step2',
      suggestedEmail,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Verarbeitung',
    });
  }
});

// ============================================================================
// STEP 2: E-Mail-Adresse wählen
// ============================================================================

/**
 * GET /registration/check-email/:prefix
 * Prüft ob eine E-Mail-Adresse verfügbar ist
 */
router.get('/check-email/:prefix', async (req: Request, res: Response) => {
  try {
    const { prefix } = req.params;

    if (!prefix || prefix.length < 3) {
      return res.status(400).json({
        success: false,
        available: false,
        error: 'E-Mail-Prefix muss mindestens 3 Zeichen haben',
      });
    }

    // Nur erlaubte Zeichen
    const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (cleanPrefix !== prefix.toLowerCase()) {
      return res.status(400).json({
        success: false,
        available: false,
        error: 'Nur Buchstaben, Zahlen und Punkte erlaubt',
      });
    }

    const available = await isEmailAvailable(cleanPrefix);

    res.json({
      success: true,
      available,
      email: `${cleanPrefix}@taskilo.de`,
    });
  } catch {
    res.status(500).json({
      success: false,
      available: false,
      error: 'Fehler bei der Überprüfung',
    });
  }
});

/**
 * POST /registration/step2
 * Geburtsdatum und Geschlecht eingeben (optional)
 */
router.post('/step2', async (req: Request, res: Response) => {
  try {
    const { sessionId, birthDate, gender } = req.body;

    // Session validieren
    const session = registrationSessions.get(sessionId);
    if (!session || session.step < 1) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Session. Bitte starten Sie die Registrierung erneut.',
      });
    }

    // Geburtsdatum validieren (optional aber wenn angegeben, muss es gültig sein)
    if (birthDate) {
      const date = new Date(birthDate);
      const now = new Date();
      const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);

      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Ungültiges Geburtsdatum',
        });
      }

      if (age < 16) {
        return res.status(400).json({
          success: false,
          error: 'Sie müssen mindestens 16 Jahre alt sein',
        });
      }

      session.data.birthDate = birthDate;
    }

    // Geschlecht (optional)
    if (gender && ['male', 'female', 'other', 'prefer_not_to_say'].includes(gender)) {
      session.data.gender = gender;
    }

    session.step = 3;

    res.json({
      success: true,
      step: 3,
      nextStep: '/registration/step3',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Verarbeitung',
    });
  }
});

// ============================================================================
// STEP 3: E-Mail-Adresse wählen
// ============================================================================

/**
 * POST /registration/step3
 * E-Mail-Adresse wählen
 */
router.post('/step3', async (req: Request, res: Response) => {
  try {
    const { sessionId, emailPrefix } = req.body;

    // Session validieren
    const session = registrationSessions.get(sessionId);
    if (!session || session.step < 2) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Session',
      });
    }

    // Validierung
    if (!emailPrefix || emailPrefix.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse muss mindestens 3 Zeichen haben',
      });
    }

    const cleanPrefix = emailPrefix.toLowerCase().replace(/[^a-z0-9.]/g, '');

    // Verfügbarkeit prüfen
    const available = await isEmailAvailable(cleanPrefix);
    if (!available) {
      return res.status(400).json({
        success: false,
        error: 'Diese E-Mail-Adresse ist bereits vergeben. Bitte wählen Sie eine andere.',
      });
    }

    // Session aktualisieren
    session.data.emailPrefix = cleanPrefix;
    session.step = 4;

    res.json({
      success: true,
      step: 4,
      nextStep: '/registration/step4',
      email: `${cleanPrefix}@taskilo.de`,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Verarbeitung',
    });
  }
});

// ============================================================================
// STEP 4: Passwort erstellen
// ============================================================================

/**
 * POST /registration/step4
 * Passwort erstellen
 */
router.post('/step4', async (req: Request, res: Response) => {
  try {
    const { sessionId, password, confirmPassword } = req.body;

    // Session validieren
    const session = registrationSessions.get(sessionId);
    if (!session || session.step < 3) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Session',
      });
    }

    // Passwort validieren
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Das Passwort muss mindestens 8 Zeichen haben',
      });
    }

    // Passwort-Stärke prüfen
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const _hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        success: false,
        error: 'Das Passwort muss Groß- und Kleinbuchstaben sowie Zahlen enthalten',
      });
    }

    // Passwörter müssen übereinstimmen
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Die Passwörter stimmen nicht überein',
      });
    }

    // Passwort speichern (wird später für Mailbox-Erstellung verwendet)
    session.data.password = password;
    session.step = 5;

    res.json({
      success: true,
      step: 5,
      nextStep: '/registration/step5',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Verarbeitung',
    });
  }
});

// ============================================================================
// STEP 5: Telefonnummer bestätigen
// ============================================================================

/**
 * POST /registration/step5/send-code
 * Sende SMS-Verifizierungscode
 */
router.post('/step5/send-code', async (req: Request, res: Response) => {
  try {
    const { sessionId, phone } = req.body;

    // Session validieren
    const session = registrationSessions.get(sessionId);
    if (!session || session.step < 4) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Session',
      });
    }

    // Telefonnummer validieren (deutsches Format)
    const cleanPhone = phone.replace(/\s/g, '').replace(/^\+49/, '0');
    if (!/^0\d{10,11}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Bitte geben Sie eine gültige deutsche Telefonnummer ein',
      });
    }

    // Verifizierungscode generieren
    const code = generateVerificationCode();
    session.data.phone = cleanPhone;
    session.data.verificationCode = code;

    // SMS senden
    const sent = await sendSmsVerification(cleanPhone, code);
    if (!sent) {
      return res.status(500).json({
        success: false,
        error: 'Fehler beim Senden der SMS. Bitte versuchen Sie es erneut.',
      });
    }

    // Prüfe ob Twilio Verify konfiguriert ist
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SID);

    res.json({
      success: true,
      message: twilioConfigured 
        ? 'Verifizierungscode wurde per SMS gesendet' 
        : 'SMS-Dienst nicht konfiguriert. Ihr Code wird unten angezeigt.',
      // Code anzeigen wenn Twilio nicht konfiguriert ist (für Tests)
      ...(!twilioConfigured && { verificationCode: code }),
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Senden der SMS',
    });
  }
});

/**
 * POST /registration/step5/verify
 * Verifizierungscode prüfen
 */
router.post('/step5/verify', async (req: Request, res: Response) => {
  try {
    const { sessionId, code } = req.body;

    // Session validieren
    const session = registrationSessions.get(sessionId);
    if (!session || session.step < 4) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Session',
      });
    }

    // Prüfe ob Twilio Verify konfiguriert ist
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SID);
    
    let isValid = false;
    
    if (twilioConfigured && session.data.phone) {
      // Verifiziere über Twilio Verify API
      isValid = await verifySmsCode(session.data.phone, code);
    } else {
      // Fallback: Lokale Verifizierung mit gespeichertem Code
      isValid = session.data.verificationCode === code;
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiger Verifizierungscode',
      });
    }

    session.data.phoneVerified = true;
    session.step = 6;

    res.json({
      success: true,
      step: 6,
      nextStep: '/registration/step6',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Verifizierung',
    });
  }
});

// ============================================================================
// STEP 6: Nutzungsbedingungen akzeptieren & Account erstellen
// ============================================================================

/**
 * POST /registration/step6
 * Nutzungsbedingungen akzeptieren und Account erstellen
 */
router.post('/step6', async (req: Request, res: Response) => {
  try {
    const { sessionId, termsAccepted, privacyAccepted } = req.body;

    // Session validieren
    const session = registrationSessions.get(sessionId);
    if (!session || session.step < 5) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Session',
      });
    }

    // Nutzungsbedingungen müssen akzeptiert werden
    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        success: false,
        error: 'Bitte akzeptieren Sie die Nutzungsbedingungen und Datenschutzrichtlinien',
      });
    }

    // Alle Daten vorhanden?
    const { firstName, lastName, emailPrefix, password } = session.data;
    if (!firstName || !emailPrefix || !password) {
      return res.status(400).json({
        success: false,
        error: 'Unvollständige Registrierungsdaten. Bitte starten Sie erneut.',
      });
    }

    // E-Mail nochmal auf Verfügbarkeit prüfen (Race Condition vermeiden)
    const available = await isEmailAvailable(emailPrefix);
    if (!available) {
      return res.status(400).json({
        success: false,
        error: 'Die E-Mail-Adresse wurde in der Zwischenzeit vergeben. Bitte wählen Sie eine andere.',
      });
    }

    // Mailbox erstellen
    const result = await createMailbox(emailPrefix, password, firstName, lastName || '');
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Fehler beim Erstellen des Accounts',
      });
    }

    // Profil in SQLite speichern (mit verifizierter Telefonnummer!)
    const email = `${emailPrefix}@taskilo.de`;
    try {
      profileService.createProfile({
        email,
        firstName,
        lastName: lastName || undefined,
        phone: session.data.phone || '',
        phoneVerified: session.data.phoneVerified || false,
        birthDate: session.data.birthDate || undefined,
        gender: session.data.gender || undefined,
      });
      console.log(`[Registration] Profile saved for ${email} with phone ${session.data.phone}`);
    } catch (profileError) {
      // Profil-Fehler loggen aber nicht abbrechen (Mailbox wurde erstellt)
      console.error(`[Registration] Error saving profile for ${email}:`, profileError);
    }

    // Session löschen
    registrationSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Ihr Taskilo E-Mail-Account wurde erfolgreich erstellt!',
      email: email,
      loginUrl: '/webmail',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Accounts',
    });
  }
});

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * GET /registration/session/:sessionId
 * Aktuellen Session-Status abrufen
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = registrationSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session nicht gefunden',
      });
    }

    if (new Date() > session.expiresAt) {
      registrationSessions.delete(sessionId);
      return res.status(400).json({
        success: false,
        error: 'Session abgelaufen',
      });
    }

    res.json({
      success: true,
      step: session.step,
      expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
      data: {
        firstName: session.data.firstName,
        emailPrefix: session.data.emailPrefix,
        // Sensible Daten nicht zurückgeben
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Session',
    });
  }
});

/**
 * DELETE /registration/session/:sessionId
 * Session abbrechen
 */
router.delete('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    registrationSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Session beendet',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Beenden der Session',
    });
  }
});

/**
 * POST /verify
 * Verifiziert bestehende Taskilo E-Mail Zugangsdaten gegen IMAP
 * Wird vom Onboarding verwendet um bestehende Konten zu verbinden
 * Endpoint: /api/registration/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validierung
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail und Passwort sind erforderlich',
      });
    }

    // Prüfe ob es eine @taskilo.de Adresse ist
    if (!email.toLowerCase().endsWith('@taskilo.de')) {
      return res.status(400).json({
        success: false,
        error: 'Nur @taskilo.de E-Mail-Adressen werden akzeptiert',
      });
    }

    // Dynamischer Import von ImapFlow
    const { ImapFlow } = await import('imapflow');

    // Versuche IMAP-Verbindung herzustellen
    const client = new ImapFlow({
      host: 'mail.taskilo.de',
      port: 993,
      secure: true,
      auth: {
        user: email,
        pass: password,
      },
      logger: false,
    });

    try {
      // Verbindung aufbauen - wenn erfolgreich, sind die Zugangsdaten korrekt
      await client.connect();
      await client.logout();

      console.log(`[AUTH-VERIFY] Erfolgreich verifiziert: ${email}`);

      res.json({
        success: true,
        email: email,
        message: 'Zugangsdaten verifiziert',
      });
    } catch (imapError) {
      console.log(`[AUTH-VERIFY] Fehlgeschlagen für ${email}:`, imapError);

      res.status(401).json({
        success: false,
        error: 'Ungültige E-Mail oder Passwort',
      });
    }
  } catch (error) {
    console.error('[AUTH-VERIFY] Server-Fehler:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Verifizierung',
    });
  }
});

export default router;
