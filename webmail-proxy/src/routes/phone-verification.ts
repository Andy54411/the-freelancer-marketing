/**
 * Phone Verification Routes für Webmailer
 * 
 * Ermöglicht es existierenden Webmail-Nutzern ihre Telefonnummer nachträglich zu verifizieren.
 * Für Accounts die vor der ProfileService-Implementierung erstellt wurden.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import profileService from '../services/ProfileService';
import { ImapFlow } from 'imapflow';

const router = Router();

// Temporärer Speicher für Verifizierungs-Sessions (in Production: Redis)
interface VerificationSession {
  sessionId: string;
  email: string;
  phone: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
}

const verificationSessions: Map<string, VerificationSession> = new Map();

// Session-Timeout: 10 Minuten
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * Generiere eine neue Session-ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Formatiere Telefonnummer ins internationale Format
 */
function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\s/g, '');
  if (formatted.startsWith('0')) {
    formatted = '+49' + formatted.substring(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+49' + formatted;
  }
  return formatted;
}

/**
 * Validiere IMAP-Anmeldedaten um E-Mail-Besitz zu bestätigen
 */
async function validateImapCredentials(email: string, password: string): Promise<boolean> {
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
    await client.connect();
    console.log(`[PHONE-VERIFY] IMAP auth success for ${email}`);
    await client.logout();
    return true;
  } catch (error) {
    console.log(`[PHONE-VERIFY] IMAP auth failed for ${email}:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Sende SMS-Verifizierungscode via Twilio Verify
 */
async function sendSmsVerification(phone: string): Promise<boolean> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioVerifySid = process.env.TWILIO_VERIFY_SID;

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`[PHONE-VERIFY] Sende Verifizierungscode an ${formattedPhone}`);

  if (!twilioAccountSid || !twilioAuthToken || !twilioVerifySid) {
    console.log(`[PHONE-VERIFY] TWILIO NICHT KONFIGURIERT`);
    return false;
  }

  try {
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
      console.error(`[PHONE-VERIFY] Twilio Verify Fehler:`, errorData);
      return false;
    }

    const data = await response.json() as { sid: string; status: string };
    console.log(`[PHONE-VERIFY] Verification gestartet, SID: ${data.sid}, Status: ${data.status}`);
    return true;
  } catch (error) {
    console.error(`[PHONE-VERIFY] Fehler beim Senden:`, error);
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

  const formattedPhone = formatPhoneNumber(phone);

  if (!twilioAccountSid || !twilioAuthToken || !twilioVerifySid) {
    console.log(`[PHONE-VERIFY] TWILIO NICHT KONFIGURIERT`);
    return false;
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
    console.log(`[PHONE-VERIFY] Verification Check - Status: ${data.status}, Valid: ${data.valid}`);
    
    return data.status === 'approved' && data.valid === true;
  } catch (error) {
    console.error(`[PHONE-VERIFY] Fehler bei Verifizierung:`, error);
    return false;
  }
}

/**
 * Cleanup abgelaufener Sessions
 */
function cleanupSessions(): void {
  const now = new Date();
  for (const [sessionId, session] of verificationSessions.entries()) {
    if (session.expiresAt < now) {
      verificationSessions.delete(sessionId);
    }
  }
}

// Cleanup alle 5 Minuten
setInterval(cleanupSessions, 5 * 60 * 1000);

/**
 * GET /phone-verification/status
 * Prüfe ob Benutzer bereits eine verifizierte Telefonnummer hat
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse ist erforderlich',
      });
    }

    const profile = profileService.getProfile(email);

    res.json({
      success: true,
      hasProfile: !!profile,
      phone: profile?.phone || null,
      phoneVerified: profile?.phoneVerified || false,
    });
  } catch (error) {
    console.error('[PHONE-VERIFY] Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Prüfen des Status',
    });
  }
});

/**
 * POST /phone-verification/send-code
 * Starte Telefon-Verifizierung - sendet SMS-Code
 */
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { email, password, phone } = req.body;

    // Validierung
    if (!email || !password || !phone) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail, Passwort und Telefonnummer sind erforderlich',
      });
    }

    // Prüfe ob E-Mail-Adresse @taskilo.de ist
    if (!email.endsWith('@taskilo.de')) {
      return res.status(400).json({
        success: false,
        error: 'Nur @taskilo.de E-Mail-Adressen werden unterstützt',
      });
    }

    // Validiere IMAP-Anmeldedaten
    console.log(`[PHONE-VERIFY] Validating IMAP for ${email}`);
    const isValidCredentials = await validateImapCredentials(email, password);
    
    if (!isValidCredentials) {
      return res.status(401).json({
        success: false,
        error: 'E-Mail oder Passwort ungültig',
      });
    }

    // Telefonnummer validieren
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone.match(/^\+49[1-9][0-9]{8,13}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige deutsche Telefonnummer',
      });
    }

    // SMS senden
    const smsSent = await sendSmsVerification(phone);
    if (!smsSent) {
      return res.status(500).json({
        success: false,
        error: 'Fehler beim Senden der SMS',
      });
    }

    // Session erstellen
    const sessionId = generateSessionId();
    const now = new Date();
    
    verificationSessions.set(sessionId, {
      sessionId,
      email,
      phone: formattedPhone,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TIMEOUT_MS),
      attempts: 0,
    });

    console.log(`[PHONE-VERIFY] Session created for ${email}, phone: ${formattedPhone}`);

    res.json({
      success: true,
      message: 'SMS-Code wurde gesendet',
      sessionId,
    });
  } catch (error) {
    console.error('[PHONE-VERIFY] Error sending code:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Senden des Codes',
    });
  }
});

/**
 * POST /phone-verification/verify
 * Verifiziere SMS-Code und speichere Telefonnummer
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { sessionId, code } = req.body;

    if (!sessionId || !code) {
      return res.status(400).json({
        success: false,
        error: 'Session-ID und Code sind erforderlich',
      });
    }

    // Session prüfen
    const session = verificationSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige oder abgelaufene Session',
      });
    }

    // Ablaufzeit prüfen
    if (session.expiresAt < new Date()) {
      verificationSessions.delete(sessionId);
      return res.status(400).json({
        success: false,
        error: 'Session ist abgelaufen',
      });
    }

    // Versuche prüfen
    if (session.attempts >= MAX_ATTEMPTS) {
      verificationSessions.delete(sessionId);
      return res.status(400).json({
        success: false,
        error: 'Zu viele Fehlversuche',
      });
    }

    session.attempts++;

    // Code verifizieren
    const isValid = await verifySmsCode(session.phone, code);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiger Code',
        attemptsRemaining: MAX_ATTEMPTS - session.attempts,
      });
    }

    // Profil erstellen oder aktualisieren
    const existingProfile = profileService.getProfile(session.email);
    
    if (existingProfile) {
      // Bestehendes Profil aktualisieren - nur Telefonnummer
      profileService.updatePhone(session.email, session.phone, true);
      console.log(`[PHONE-VERIFY] Updated existing profile for ${session.email}`);
    } else {
      // Neues Profil erstellen
      profileService.createProfile({
        email: session.email,
        firstName: session.email.split('@')[0], // Fallback: E-Mail-Prefix als Name
        phone: session.phone,
        phoneVerified: true,
      });
      console.log(`[PHONE-VERIFY] Created new profile for ${session.email}`);
    }

    // Session löschen
    verificationSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Telefonnummer erfolgreich verifiziert',
      phone: session.phone,
    });
  } catch (error) {
    console.error('[PHONE-VERIFY] Error verifying code:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Verifizierung',
    });
  }
});

/**
 * POST /phone-verification/resend
 * SMS-Code erneut senden
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session-ID ist erforderlich',
      });
    }

    const session = verificationSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige oder abgelaufene Session',
      });
    }

    if (session.expiresAt < new Date()) {
      verificationSessions.delete(sessionId);
      return res.status(400).json({
        success: false,
        error: 'Session ist abgelaufen',
      });
    }

    // SMS erneut senden
    const smsSent = await sendSmsVerification(session.phone);
    if (!smsSent) {
      return res.status(500).json({
        success: false,
        error: 'Fehler beim erneuten Senden der SMS',
      });
    }

    // Session-Timer zurücksetzen
    session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);
    session.attempts = 0;

    console.log(`[PHONE-VERIFY] Resent SMS for ${session.email}`);

    res.json({
      success: true,
      message: 'SMS-Code wurde erneut gesendet',
    });
  } catch (error) {
    console.error('[PHONE-VERIFY] Error resending code:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim erneuten Senden',
    });
  }
});

export default router;
