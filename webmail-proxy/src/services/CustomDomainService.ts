/**
 * CustomDomainService - Verwaltung eigener E-Mail-Domains
 * =========================================================
 * 
 * Ermöglicht Kunden die Nutzung ihrer eigenen Domain für E-Mail.
 * Integriert mit Mailcow und Hetzner DNS API.
 * 
 * Workflow:
 * 1. Kunde fügt Domain hinzu → status: 'pending'
 * 2. Kunde setzt TXT-Verifizierungs-Record → verifyDomain() → status: 'verified'
 * 3. Domain wird aktiviert (Mailcow + DNS) → status: 'active'
 * 4. Kunde kann Mailboxen erstellen
 */

import crypto from 'crypto';
import { z } from 'zod';
import mongoDBService, { CustomDomain, CustomDomainMailbox } from './MongoDBService';

// Mailcow API Config
const MAILCOW_API_URL = process.env.MAILCOW_API_URL || 'https://mail.taskilo.de/api/v1';
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY || '';

// Hetzner DNS API Config
const HETZNER_DNS_API_URL = 'https://dns.hetzner.com/api/v1';
const HETZNER_DNS_API_TOKEN = process.env.HETZNER_DNS_API_TOKEN || '';

// Validation Schemas
export const AddDomainSchema = z.object({
  email: z.string().email(),
  domain: z.string()
    .min(4, 'Domain muss mindestens 4 Zeichen haben')
    .max(253, 'Domain darf maximal 253 Zeichen haben')
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i, 'Ungültiges Domain-Format'),
  dnsProvider: z.enum(['hetzner', 'inwx', 'external']).default('external'),
});

export const CreateMailboxSchema = z.object({
  localPart: z.string()
    .min(1, 'E-Mail-Präfix ist erforderlich')
    .max(64, 'E-Mail-Präfix darf maximal 64 Zeichen haben')
    .regex(/^[a-z0-9._-]+$/, 'E-Mail-Präfix darf nur Kleinbuchstaben, Zahlen, Punkte, Unterstriche und Bindestriche enthalten'),
  name: z.string().min(1, 'Name ist erforderlich').max(100, 'Name darf maximal 100 Zeichen haben'),
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .max(128, 'Passwort darf maximal 128 Zeichen haben'),
  quotaMB: z.number().min(100).max(50000).default(5000),
  active: z.boolean().default(true),
});

// Response Types
interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl?: number;
  description: string;
}

// Helper: Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}_${Date.now()}`;
}

// Helper: Generate verification code
function generateVerificationCode(): string {
  return `taskilo-verify-${crypto.randomBytes(16).toString('hex')}`;
}

// ============================================
// MAILCOW API FUNCTIONS
// ============================================

async function mailcowRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<ServiceResponse<T>> {
  if (!MAILCOW_API_KEY) {
    return { success: false, error: 'Mailcow API Key nicht konfiguriert' };
  }

  try {
    const response = await fetch(`${MAILCOW_API_URL}${endpoint}`, {
      method,
      headers: {
        'X-API-Key': MAILCOW_API_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Mailcow API Fehler: ${response.status}`,
        details: JSON.stringify(errorData),
      };
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: 'Mailcow Verbindungsfehler',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function addDomainToMailcow(domain: string): Promise<ServiceResponse<{ success: boolean }>> {
  return mailcowRequest('/add/domain', 'POST', {
    domain,
    description: 'Taskilo Custom Domain',
    aliases: 100,
    mailboxes: 50,
    defquota: 5120,
    maxquota: 10240,
    quota: 51200,
    active: 1,
    restart_sogo: 1,
  });
}

async function getDomainFromMailcow(domain: string): Promise<ServiceResponse<{
  domain_name: string;
  active: number;
  mailboxes: number;
}>> {
  return mailcowRequest(`/get/domain/${domain}`);
}

async function deleteDomainFromMailcow(domain: string): Promise<ServiceResponse<{ success: boolean }>> {
  return mailcowRequest('/delete/domain', 'POST', {
    domain,
  });
}

async function generateDKIM(domain: string, selector: string = 'dkim'): Promise<ServiceResponse<{
  dkim_selector: string;
  dkim_txt: string;
}>> {
  const result = await mailcowRequest<{ msg: string }>('/add/dkim', 'POST', {
    domains: domain,
    dkim_selector: selector,
    key_size: 2048,
  });

  if (!result.success) return result as ServiceResponse<never>;

  // DKIM-Key abrufen
  const dkimResult = await mailcowRequest<{
    dkim_selector: string;
    dkim_txt: string;
    pubkey: string;
  }>(`/get/dkim/${domain}`);

  return dkimResult;
}

async function addMailboxToMailcow(
  email: string,
  name: string,
  password: string,
  quotaMB: number,
  active: boolean
): Promise<ServiceResponse<{ success: boolean }>> {
  const [localPart, domain] = email.split('@');
  
  return mailcowRequest('/add/mailbox', 'POST', {
    local_part: localPart,
    domain,
    name,
    password,
    password2: password,
    quota: quotaMB,
    active: active ? 1 : 0,
    force_pw_update: 0,
    tls_enforce_in: 1,
    tls_enforce_out: 1,
  });
}

// ============================================
// HETZNER DNS API FUNCTIONS
// ============================================

async function hetznerDNSRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<ServiceResponse<T>> {
  if (!HETZNER_DNS_API_TOKEN) {
    return { success: false, error: 'Hetzner DNS API Token nicht konfiguriert' };
  }

  try {
    const response = await fetch(`${HETZNER_DNS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Auth-API-Token': HETZNER_DNS_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Hetzner DNS API Fehler: ${response.status}`,
        details: JSON.stringify(errorData),
      };
    }

    if (response.status === 204 || method === 'DELETE') {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: 'Hetzner DNS Verbindungsfehler',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function createHetznerZone(domain: string): Promise<ServiceResponse<{ zone: { id: string } }>> {
  return hetznerDNSRequest('/zones', 'POST', {
    name: domain.toLowerCase(),
    ttl: 3600,
  });
}

async function getHetznerZone(domain: string): Promise<ServiceResponse<{ zones: Array<{ id: string; name: string }> }>> {
  return hetznerDNSRequest(`/zones?name=${domain.toLowerCase()}`);
}

async function createHetznerRecord(
  zoneId: string,
  type: string,
  name: string,
  value: string,
  ttl: number = 3600
): Promise<ServiceResponse<{ record: { id: string } }>> {
  return hetznerDNSRequest('/records', 'POST', {
    zone_id: zoneId,
    type,
    name,
    value,
    ttl,
  });
}

// ============================================
// DNS VERIFICATION CHECK
// ============================================

// DNS Verification Response Type
interface DNSGoogleResponse {
  Answer?: Array<{ data: string }>;
}

async function checkDNSVerification(domain: string, verificationCode: string): Promise<boolean> {
  // Google DNS API für TXT-Record-Abfrage
  const recordName = `_taskilo-verify.${domain}`;
  
  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(recordName)}&type=TXT`,
      { headers: { Accept: 'application/dns-json' } }
    );

    if (!response.ok) return false;

    const data = await response.json() as DNSGoogleResponse;
    
    if (!data.Answer || !Array.isArray(data.Answer)) return false;

    return data.Answer.some((answer) => {
      const cleanValue = answer.data?.replace(/"/g, '').trim();
      return cleanValue === verificationCode;
    });
  } catch {
    return false;
  }
}
// ============================================
// MAIN SERVICE CLASS
// ============================================

class CustomDomainService {
  /**
   * Prüfen ob eine Domain bereits existiert (für Registrierung)
   */
  async checkDomainExists(domain: string): Promise<ServiceResponse<{ exists: boolean; domain: string }>> {
    try {
      const normalizedDomain = domain.toLowerCase().trim();

      // Domain-Format validieren
      const domainValidation = AddDomainSchema.shape.domain.safeParse(normalizedDomain);
      if (!domainValidation.success) {
        return {
          success: false,
          error: 'Ungültiges Domain-Format',
          details: domainValidation.error.errors.map(e => e.message).join(', '),
        };
      }

      await mongoDBService.ensureConnection();
      const collection = mongoDBService.getCustomDomainsCollection();

      // MongoDB-Abfrage für Domain
      const existing = await collection.findOne({ domain: normalizedDomain });

      return {
        success: true,
        data: {
          exists: existing !== null,
          domain: normalizedDomain,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Fehler bei Domain-Prüfung',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Domain für einen Benutzer hinzufügen
   */
  async addDomain(
    email: string,
    domain: string,
    dnsProvider: 'hetzner' | 'inwx' | 'external' = 'external'
  ): Promise<ServiceResponse<{
    domain: CustomDomain;
    dnsInstructions: DNSRecord[];
  }>> {
    // Validation
    const validation = AddDomainSchema.safeParse({ email, domain, dnsProvider });
    if (!validation.success) {
      return {
        success: false,
        error: 'Validierungsfehler',
        details: validation.error.errors.map(e => e.message).join(', '),
      };
    }

    const normalizedDomain = domain.toLowerCase().trim();

    await mongoDBService.ensureConnection();
    const collection = mongoDBService.getCustomDomainsCollection();

    // Prüfen ob Domain bereits existiert
    const existing = await collection.findOne({ domain: normalizedDomain });
    if (existing) {
      return {
        success: false,
        error: 'Domain bereits registriert',
        details: `Die Domain ${normalizedDomain} ist bereits in Verwendung.`,
      };
    }

    // Domain-Dokument erstellen
    const verificationCode = generateVerificationCode();
    const now = new Date();
    
    const domainDoc: CustomDomain = {
      id: generateId('domain'),
      email,
      domain: normalizedDomain,
      status: 'pending',
      verificationCode,
      verificationMethod: 'txt_record',
      dnsProvider,
      dnsRecordsCreated: false,
      mailcowDomainAdded: false,
      dkimSelector: null,
      dkimPublicKey: null,
      maxMailboxes: 50,
      maxAliases: 100,
      quotaMB: 10240,
      verifiedAt: null,
      activatedAt: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(domainDoc);

    // DNS-Anweisungen erstellen
    const dnsInstructions = this.getDNSInstructions(normalizedDomain, verificationCode);

    return {
      success: true,
      data: {
        domain: domainDoc,
        dnsInstructions,
      },
    };
  }

  /**
   * DNS-Anweisungen für Domain-Setup abrufen
   */
  getDNSInstructions(domain: string, verificationCode: string): DNSRecord[] {
    return [
      {
        type: 'TXT',
        name: '_taskilo-verify',
        value: verificationCode,
        ttl: 3600,
        description: 'Verifizierungs-Record - Bestätigt Ihren Domain-Besitz',
      },
      {
        type: 'MX',
        name: '@',
        value: 'mail.taskilo.de',
        priority: 10,
        ttl: 3600,
        description: 'Mail Exchange Record - Leitet E-Mails an Taskilo-Server',
      },
      {
        type: 'TXT',
        name: '@',
        value: 'v=spf1 include:_spf.taskilo.de ~all',
        ttl: 3600,
        description: 'SPF Record - Verhindert E-Mail-Spoofing',
      },
      {
        type: 'TXT',
        name: '_dmarc',
        value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@taskilo.de',
        ttl: 3600,
        description: 'DMARC Record - E-Mail-Authentifizierung',
      },
      {
        type: 'CNAME',
        name: 'autodiscover',
        value: 'mail.taskilo.de',
        ttl: 3600,
        description: 'Autodiscover - Automatische E-Mail-Client-Konfiguration (Outlook)',
      },
      {
        type: 'CNAME',
        name: 'autoconfig',
        value: 'mail.taskilo.de',
        ttl: 3600,
        description: 'Autoconfig - Automatische E-Mail-Client-Konfiguration (Thunderbird)',
      },
    ];
  }

  /**
   * Domain-Besitz verifizieren
   */
  async verifyDomain(domainId: string): Promise<ServiceResponse<{
    verified: boolean;
    message: string;
  }>> {
    await mongoDBService.ensureConnection();
    const collection = mongoDBService.getCustomDomainsCollection();

    const domain = await collection.findOne({ id: domainId });
    if (!domain) {
      return { success: false, error: 'Domain nicht gefunden' };
    }

    if (domain.status === 'active') {
      return {
        success: true,
        data: { verified: true, message: 'Domain ist bereits aktiv' },
      };
    }

    if (domain.status === 'verified') {
      return {
        success: true,
        data: { verified: true, message: 'Domain ist bereits verifiziert' },
      };
    }

    // DNS-Verifizierung durchführen
    await collection.updateOne(
      { id: domainId },
      { $set: { status: 'verifying', updatedAt: new Date() } }
    );

    const verified = await checkDNSVerification(domain.domain, domain.verificationCode);

    if (verified) {
      await collection.updateOne(
        { id: domainId },
        {
          $set: {
            status: 'verified',
            verifiedAt: new Date(),
            updatedAt: new Date(),
            errorMessage: null,
          },
        }
      );

      return {
        success: true,
        data: {
          verified: true,
          message: 'Domain erfolgreich verifiziert. Sie können die Domain jetzt aktivieren.',
        },
      };
    } else {
      await collection.updateOne(
        { id: domainId },
        {
          $set: {
            status: 'pending',
            updatedAt: new Date(),
            errorMessage: 'TXT-Record nicht gefunden. Bitte prüfen Sie Ihre DNS-Einstellungen.',
          },
        }
      );

      return {
        success: false,
        error: 'Verifizierung fehlgeschlagen',
        details: `TXT-Record _taskilo-verify.${domain.domain} mit Wert "${domain.verificationCode}" nicht gefunden. DNS-Änderungen können bis zu 48 Stunden dauern.`,
      };
    }
  }

  /**
   * Domain aktivieren (Mailcow + DNS einrichten)
   * Optional: Primäre Mailbox mit erstellen
   */
  async activateDomain(
    domainId: string, 
    useHetznerDNS: boolean = false,
    primaryMailbox?: { localPart: string; name: string; password: string }
  ): Promise<ServiceResponse<{
    activated: boolean;
    dkimRecord?: DNSRecord;
    mailbox?: { email: string };
  }>> {
    await mongoDBService.ensureConnection();
    const collection = mongoDBService.getCustomDomainsCollection();

    const domain = await collection.findOne({ id: domainId });
    if (!domain) {
      return { success: false, error: 'Domain nicht gefunden' };
    }

    if (domain.status !== 'verified') {
      return { success: false, error: 'Domain muss erst verifiziert werden' };
    }

    // 1. Domain zu Mailcow hinzufügen
    const mailcowResult = await addDomainToMailcow(domain.domain);
    if (!mailcowResult.success) {
      await collection.updateOne(
        { id: domainId },
        {
          $set: {
            status: 'failed',
            errorMessage: `Mailcow Fehler: ${mailcowResult.error}`,
            updatedAt: new Date(),
          },
        }
      );
      return mailcowResult as ServiceResponse<never>;
    }

    // 2. DKIM generieren
    const dkimResult = await generateDKIM(domain.domain);
    let dkimRecord: DNSRecord | undefined;
    
    if (dkimResult.success && dkimResult.data) {
      dkimRecord = {
        type: 'TXT',
        name: `${dkimResult.data.dkim_selector}._domainkey`,
        value: dkimResult.data.dkim_txt,
        ttl: 3600,
        description: 'DKIM Record - Digitale Signatur für E-Mails',
      };

      await collection.updateOne(
        { id: domainId },
        {
          $set: {
            dkimSelector: dkimResult.data.dkim_selector,
            dkimPublicKey: dkimResult.data.dkim_txt,
          },
        }
      );
    }

    // 3. Optional: Hetzner DNS einrichten
    if (useHetznerDNS && domain.dnsProvider === 'hetzner') {
      await this.setupHetznerDNS(domain.domain, domain.verificationCode, dkimRecord);
      await collection.updateOne(
        { id: domainId },
        { $set: { dnsRecordsCreated: true } }
      );
    }

    // 4. Domain als aktiv markieren
    await collection.updateOne(
      { id: domainId },
      {
        $set: {
          status: 'active',
          mailcowDomainAdded: true,
          activatedAt: new Date(),
          updatedAt: new Date(),
          errorMessage: null,
        },
      }
    );

    // 5. Optional: Primäre Mailbox erstellen
    let createdMailbox: { email: string } | undefined;
    if (primaryMailbox) {
      const mailboxResult = await this.createMailbox(
        domainId,
        primaryMailbox.localPart,
        primaryMailbox.name,
        primaryMailbox.password
      );
      if (mailboxResult.success && mailboxResult.data) {
        createdMailbox = { email: mailboxResult.data.mailbox.email };
      }
    }

    return {
      success: true,
      data: {
        activated: true,
        dkimRecord,
        mailbox: createdMailbox,
      },
    };
  }

  /**
   * Hetzner DNS Records einrichten
   */
  private async setupHetznerDNS(
    domain: string,
    verificationCode: string,
    dkimRecord?: DNSRecord
  ): Promise<ServiceResponse<void>> {
    // Zone erstellen oder finden
    let zoneId: string;
    
    const existingZone = await getHetznerZone(domain);
    if (existingZone.success && existingZone.data?.zones?.length) {
      zoneId = existingZone.data.zones[0].id;
    } else {
      const createResult = await createHetznerZone(domain);
      if (!createResult.success || !createResult.data?.zone?.id) {
        return { success: false, error: 'Hetzner Zone konnte nicht erstellt werden' };
      }
      zoneId = createResult.data.zone.id;
    }

    // Records erstellen
    const records = this.getDNSInstructions(domain, verificationCode);
    if (dkimRecord) records.push(dkimRecord);

    for (const record of records) {
      await createHetznerRecord(zoneId, record.type, record.name, record.value, record.ttl || 3600);
    }

    return { success: true };
  }

  /**
   * Mailbox erstellen
   */
  async createMailbox(
    domainId: string,
    localPart: string,
    name: string,
    password: string,
    quotaMB: number = 5000,
    active: boolean = true
  ): Promise<ServiceResponse<{ mailbox: CustomDomainMailbox }>> {
    // Validation
    const validation = CreateMailboxSchema.safeParse({ localPart, name, password, quotaMB, active });
    if (!validation.success) {
      return {
        success: false,
        error: 'Validierungsfehler',
        details: validation.error.errors.map(e => e.message).join(', '),
      };
    }

    await mongoDBService.ensureConnection();
    const domainsCollection = mongoDBService.getCustomDomainsCollection();
    const mailboxesCollection = mongoDBService.getCustomDomainMailboxesCollection();

    // Domain prüfen
    const domain = await domainsCollection.findOne({ id: domainId });
    if (!domain) {
      return { success: false, error: 'Domain nicht gefunden' };
    }

    if (domain.status !== 'active') {
      return { success: false, error: 'Domain muss erst aktiviert werden' };
    }

    // E-Mail-Adresse zusammensetzen
    const email = `${localPart.toLowerCase()}@${domain.domain}`;

    // Prüfen ob Mailbox bereits existiert
    const existing = await mailboxesCollection.findOne({ email });
    if (existing) {
      return { success: false, error: `Mailbox ${email} existiert bereits` };
    }

    // Mailbox-Limit prüfen
    const mailboxCount = await mailboxesCollection.countDocuments({ domainId });
    if (mailboxCount >= domain.maxMailboxes) {
      return {
        success: false,
        error: `Maximale Anzahl Mailboxen (${domain.maxMailboxes}) erreicht`,
      };
    }

    // Mailbox in Mailcow erstellen
    const mailcowResult = await addMailboxToMailcow(email, name, password, quotaMB, active);
    if (!mailcowResult.success) {
      return mailcowResult as ServiceResponse<never>;
    }

    // Mailbox in MongoDB speichern
    const now = new Date();
    const mailboxDoc: CustomDomainMailbox = {
      id: generateId('mailbox'),
      domainId,
      email,
      localPart: localPart.toLowerCase(),
      name,
      quotaMB,
      active,
      mailcowMailboxId: null, // Mailcow gibt keine ID zurück
      createdAt: now,
      updatedAt: now,
    };

    await mailboxesCollection.insertOne(mailboxDoc);

    return {
      success: true,
      data: { mailbox: mailboxDoc },
    };
  }

  /**
   * Domain abrufen
   */
  async getDomain(domainId: string): Promise<ServiceResponse<CustomDomain>> {
    await mongoDBService.ensureConnection();
    const collection = mongoDBService.getCustomDomainsCollection();
    
    const domain = await collection.findOne({ id: domainId });
    if (!domain) {
      return { success: false, error: 'Domain nicht gefunden' };
    }

    return { success: true, data: domain };
  }

  /**
   * Domains eines Benutzers abrufen
   */
  async getUserDomains(email: string): Promise<ServiceResponse<CustomDomain[]>> {
    await mongoDBService.ensureConnection();
    const collection = mongoDBService.getCustomDomainsCollection();
    
    const domains = await collection.find({ email }).toArray();
    return { success: true, data: domains };
  }

  /**
   * Mailboxen einer Domain abrufen
   */
  async getDomainMailboxes(domainId: string): Promise<ServiceResponse<CustomDomainMailbox[]>> {
    await mongoDBService.ensureConnection();
    const collection = mongoDBService.getCustomDomainMailboxesCollection();
    
    const mailboxes = await collection.find({ domainId }).toArray();
    return { success: true, data: mailboxes };
  }

  /**
   * Domain löschen
   */
  async deleteDomain(domainId: string, email: string): Promise<ServiceResponse<{ deleted: boolean }>> {
    await mongoDBService.ensureConnection();
    const domainsCollection = mongoDBService.getCustomDomainsCollection();
    const mailboxesCollection = mongoDBService.getCustomDomainMailboxesCollection();

    const domain = await domainsCollection.findOne({ id: domainId });
    if (!domain) {
      return { success: false, error: 'Domain nicht gefunden' };
    }

    if (domain.email !== email) {
      return { success: false, error: 'Keine Berechtigung' };
    }

    // Prüfen ob noch Mailboxen existieren
    const mailboxCount = await mailboxesCollection.countDocuments({ domainId });
    if (mailboxCount > 0) {
      return {
        success: false,
        error: `Domain hat noch ${mailboxCount} Mailbox(en). Bitte zuerst alle Mailboxen löschen.`,
      };
    }

    // Domain aus Mailcow entfernen (falls hinzugefügt)
    if (domain.mailcowDomainAdded) {
      const mailcowResult = await deleteDomainFromMailcow(domain.domain);
      if (!mailcowResult.success) {
        // Warnung loggen, aber fortfahren
        console.warn(`[CustomDomain] Mailcow Domain konnte nicht gelöscht werden: ${mailcowResult.error}`);
      }
    }

    // Domain aus MongoDB löschen
    await domainsCollection.deleteOne({ id: domainId });

    return { success: true, data: { deleted: true } };
  }
}

export const customDomainService = new CustomDomainService();
export default customDomainService;
