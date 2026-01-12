'use server';

import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';

/**
 * Generiert ein signiertes Apple .mobileconfig Profil für die E-Mail-Einrichtung auf iPhone/iPad
 * Leitet die Anfrage an den Hetzner-Server weiter, wo das Profil signiert wird.
 * 
 * Query-Parameter:
 * - email: Die E-Mail-Adresse des Benutzers
 * - name: Der Anzeigename (optional)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');
  const name = searchParams.get('name') || email?.split('@')[0] || 'Benutzer';

  if (!email) {
    return NextResponse.json({ error: 'E-Mail-Adresse fehlt' }, { status: 400 });
  }

  // Validiere E-Mail-Format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
  }

  try {
    // Anfrage an Hetzner-Server für signiertes Profil
    const response = await fetch(`${HETZNER_API_URL}/api/mobileconfig`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name }),
    });

    if (!response.ok) {
      throw new Error(`Hetzner API Fehler: ${response.status}`);
    }

    // Profil als ArrayBuffer holen (kann binär sein wenn signiert)
    const profileData = await response.arrayBuffer();

    // Sende das Profil als Download
    return new NextResponse(profileData, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': `attachment; filename="taskilo-mail-${email.split('@')[0]}.mobileconfig"`,
      },
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des signierten Profils:', error);
    
    // Fallback: Unsigniertes Profil generieren
    return generateUnsignedProfile(email, name);
  }
}

/**
 * Fallback: Generiert ein unsigniertes Profil wenn Hetzner nicht erreichbar
 */
function generateUnsignedProfile(email: string, displayName: string) {
  const profileUUID = crypto.randomUUID();
  const payloadUUID = crypto.randomUUID();

  const mobileConfig = `<?xml version="1.0" encoding="UTF-8"?>
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
    <string>Dieses Profil konfiguriert Ihre Taskilo E-Mail-Adresse auf Ihrem Gerät. Nach der Installation müssen Sie nur noch Ihr Passwort eingeben.</string>
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

  return new NextResponse(mobileConfig, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': `attachment; filename="taskilo-mail-${email.split('@')[0]}.mobileconfig"`,
    },
  });
}
