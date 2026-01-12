import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';

const router = Router();

// Pfade zu den SSL-Zertifikaten (Let's Encrypt auf Hetzner)
const CERT_PATH = '/etc/letsencrypt/live/mail.taskilo.de/cert.pem';
const KEY_PATH = '/etc/letsencrypt/live/mail.taskilo.de/privkey.pem';
const CHAIN_PATH = '/etc/letsencrypt/live/mail.taskilo.de/chain.pem';

/**
 * Generiert und signiert ein Apple .mobileconfig Profil
 * POST /mobileconfig
 * Body: { email: string, name?: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'E-Mail-Adresse fehlt' });
    }

    // Validiere E-Mail-Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }

    const displayName = name || email.split('@')[0];
    const profileUUID = randomUUID();
    const payloadUUID = randomUUID();

    // Unsigniertes Profil erstellen
    const unsignedConfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>EmailAccountDescription</key>
            <string>Taskilo Mail</string>
            <key>EmailAccountName</key>
            <string>${displayName}</string>
            <key>EmailAccountType</key>
            <string>EmailTypeIMAP</string>
            <key>EmailAddress</key>
            <string>${email}</string>
            <key>IncomingMailServerAuthentication</key>
            <string>EmailAuthPassword</string>
            <key>IncomingMailServerHostName</key>
            <string>mail.taskilo.de</string>
            <key>IncomingMailServerPortNumber</key>
            <integer>993</integer>
            <key>IncomingMailServerUseSSL</key>
            <true/>
            <key>IncomingMailServerUsername</key>
            <string>${email}</string>
            <key>OutgoingMailServerAuthentication</key>
            <string>EmailAuthPassword</string>
            <key>OutgoingMailServerHostName</key>
            <string>mail.taskilo.de</string>
            <key>OutgoingMailServerPortNumber</key>
            <integer>465</integer>
            <key>OutgoingMailServerUseSSL</key>
            <true/>
            <key>OutgoingMailServerUsername</key>
            <string>${email}</string>
            <key>OutgoingPasswordSameAsIncomingPassword</key>
            <true/>
            <key>PayloadDescription</key>
            <string>Konfiguriert E-Mail-Account für Taskilo</string>
            <key>PayloadDisplayName</key>
            <string>Taskilo E-Mail</string>
            <key>PayloadIdentifier</key>
            <string>de.taskilo.mail.account.${payloadUUID}</string>
            <key>PayloadType</key>
            <string>com.apple.mail.managed</string>
            <key>PayloadUUID</key>
            <string>${payloadUUID}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PreventAppSheet</key>
            <false/>
            <key>PreventMove</key>
            <false/>
            <key>SMIMEEnabled</key>
            <false/>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Dieses Profil konfiguriert Ihre Taskilo E-Mail-Adresse auf Ihrem Gerät.</string>
    <key>PayloadDisplayName</key>
    <string>Taskilo E-Mail Konfiguration</string>
    <key>PayloadIdentifier</key>
    <string>de.taskilo.mail.profile.${profileUUID}</string>
    <key>PayloadOrganization</key>
    <string>Taskilo GmbH</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${profileUUID}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    // Prüfe ob Zertifikate existieren
    if (!existsSync(CERT_PATH) || !existsSync(KEY_PATH) || !existsSync(CHAIN_PATH)) {
      console.warn('SSL-Zertifikate nicht gefunden, sende unsigniertes Profil');
      res.setHeader('Content-Type', 'application/x-apple-aspen-config');
      res.setHeader('Content-Disposition', `attachment; filename="taskilo-mail-${email.split('@')[0]}.mobileconfig"`);
      return res.send(unsignedConfig);
    }

    // Temporäre Dateien erstellen
    const tempDir = '/tmp';
    const unsignedPath = path.join(tempDir, `unsigned-${profileUUID}.mobileconfig`);
    const signedPath = path.join(tempDir, `signed-${profileUUID}.mobileconfig`);

    try {
      // Unsigniertes Profil speichern
      writeFileSync(unsignedPath, unsignedConfig);

      // Mit OpenSSL signieren (PKCS#7)
      execSync(`openssl smime -sign -signer ${CERT_PATH} -inkey ${KEY_PATH} -certfile ${CHAIN_PATH} -nodetach -outform der -in ${unsignedPath} -out ${signedPath}`, {
        timeout: 10000,
      });

      // Signiertes Profil lesen
      const signedConfig = readFileSync(signedPath);

      // Aufräumen
      unlinkSync(unsignedPath);
      unlinkSync(signedPath);

      // Signiertes Profil senden
      res.setHeader('Content-Type', 'application/x-apple-aspen-config');
      res.setHeader('Content-Disposition', `attachment; filename="taskilo-mail-${email.split('@')[0]}.mobileconfig"`);
      return res.send(signedConfig);
    } catch (signError) {
      console.error('Fehler beim Signieren:', signError);
      
      // Aufräumen bei Fehler
      try {
        if (existsSync(unsignedPath)) unlinkSync(unsignedPath);
        if (existsSync(signedPath)) unlinkSync(signedPath);
      } catch {
        // Ignorieren
      }

      // Fallback: Unsigniertes Profil senden
      res.setHeader('Content-Type', 'application/x-apple-aspen-config');
      res.setHeader('Content-Disposition', `attachment; filename="taskilo-mail-${email.split('@')[0]}.mobileconfig"`);
      return res.send(unsignedConfig);
    }
  } catch (error) {
    console.error('Fehler beim Erstellen des Mobileconfig:', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export const mobileconfigRouter = router;
