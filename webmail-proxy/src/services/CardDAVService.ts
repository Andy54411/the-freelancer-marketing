/**
 * Taskilo Webmail Proxy - CardDAV Service
 * Kontakt-Synchronisation mit Mailcow CardDAV/SOGo
 */

import { z } from 'zod';

// Contact Schemas
export const ContactSchema = z.object({
  uid: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  nickname: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  emails: z.array(z.object({
    value: z.string().email(),
    label: z.string().default('Privat'),
  })).default([]),
  phones: z.array(z.object({
    value: z.string(),
    label: z.string().default('Mobil'),
  })).default([]),
  addresses: z.array(z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    label: z.string().default('Privat'),
  })).default([]),
  websites: z.array(z.object({
    value: z.string(),
    label: z.string().default('Website'),
  })).default([]),
  birthday: z.string().optional(),
  notes: z.string().optional(),
  photo: z.string().optional(), // Base64
  labels: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Contact = z.infer<typeof ContactSchema>;

// Label Schema
export const LabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export type Label = z.infer<typeof LabelSchema>;

interface CardDAVConfig {
  baseUrl: string;
  principalPath: string;
  addressBookPath: string;
}

const DEFAULT_CONFIG: CardDAVConfig = {
  baseUrl: 'https://mail.taskilo.de',
  principalPath: '/SOGo/dav',
  addressBookPath: '/SOGo/dav/{email}/Contacts/personal',
};

class CardDAVService {
  private config: CardDAVConfig;
  private stats = {
    totalRequests: 0,
    contactsCreated: 0,
    contactsUpdated: 0,
    contactsDeleted: 0,
  };

  constructor(config: Partial<CardDAVConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Basic Auth Header generieren
  private getAuthHeader(email: string, password: string): string {
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  // CardDAV Request
  private async carddavRequest(
    email: string,
    password: string,
    method: string,
    path: string,
    body?: string,
    contentType = 'text/vcard; charset=utf-8'
  ): Promise<{ status: number; body: string; headers: Headers }> {
    this.stats.totalRequests++;

    const url = `${this.config.baseUrl}${path.replace('{email}', email)}`;
    
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(email, password),
      'Content-Type': contentType,
    };

    if (body) {
      headers['Content-Length'] = Buffer.byteLength(body).toString();
    }

    // AbortController für Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 Sekunden Timeout

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseBody = await response.text();

      return {
        status: response.status,
        body: responseBody,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CardDAV request timeout after 30 seconds');
      }
      throw error;
    }
  }

  // Contact zu vCard konvertieren
  private contactToVCard(contact: Contact): string {
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `UID:${contact.uid}`,
    ];

    // Name
    const lastName = contact.lastName || '';
    const firstName = contact.firstName || '';
    lines.push(`N:${lastName};${firstName};;;`);
    
    // Display Name
    const displayName = contact.displayName || `${firstName} ${lastName}`.trim();
    if (displayName) {
      lines.push(`FN:${displayName}`);
    }

    // Nickname
    if (contact.nickname) {
      lines.push(`NICKNAME:${contact.nickname}`);
    }

    // Company
    if (contact.company) {
      lines.push(`ORG:${contact.company}`);
    }

    // Job Title
    if (contact.jobTitle) {
      lines.push(`TITLE:${contact.jobTitle}`);
    }

    // Emails
    for (const email of contact.emails) {
      const type = this.labelToVCardType(email.label);
      lines.push(`EMAIL;TYPE=${type}:${email.value}`);
    }

    // Phones
    for (const phone of contact.phones) {
      const type = this.labelToVCardType(phone.label);
      lines.push(`TEL;TYPE=${type}:${phone.value}`);
    }

    // Addresses
    for (const addr of contact.addresses) {
      const type = this.labelToVCardType(addr.label);
      lines.push(`ADR;TYPE=${type}:;;${addr.street || ''};${addr.city || ''};;${addr.postalCode || ''};${addr.country || ''}`);
    }

    // Websites
    for (const website of contact.websites) {
      lines.push(`URL:${website.value}`);
    }

    // Birthday
    if (contact.birthday) {
      lines.push(`BDAY:${contact.birthday}`);
    }

    // Notes
    if (contact.notes) {
      lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);
    }

    // Photo
    if (contact.photo && contact.photo.startsWith('data:')) {
      const base64Data = contact.photo.split(',')[1];
      if (base64Data) {
        lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${base64Data}`);
      }
    }

    // Labels as Categories
    if (contact.labels && contact.labels.length > 0) {
      lines.push(`CATEGORIES:${contact.labels.join(',')}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  // vCard zu Contact parsen
  private vCardToContact(vcard: string, uid?: string): Contact {
    const lines = vcard.split(/\r?\n/);
    const contact: Contact = {
      uid: uid || this.generateUID(),
      emails: [],
      phones: [],
      addresses: [],
      websites: [],
      labels: [],
    };

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).toUpperCase();
      const value = line.substring(colonIndex + 1);

      if (key.startsWith('UID')) {
        contact.uid = value;
      } else if (key.startsWith('N')) {
        const parts = value.split(';');
        contact.lastName = parts[0] || undefined;
        contact.firstName = parts[1] || undefined;
      } else if (key.startsWith('FN')) {
        contact.displayName = value;
      } else if (key.startsWith('NICKNAME')) {
        contact.nickname = value;
      } else if (key.startsWith('ORG')) {
        contact.company = value;
      } else if (key.startsWith('TITLE')) {
        contact.jobTitle = value;
      } else if (key.startsWith('EMAIL')) {
        const label = this.extractVCardType(key) || 'Privat';
        contact.emails.push({ value, label });
      } else if (key.startsWith('TEL')) {
        const label = this.extractVCardType(key) || 'Mobil';
        contact.phones.push({ value, label });
      } else if (key.startsWith('ADR')) {
        const label = this.extractVCardType(key) || 'Privat';
        const parts = value.split(';');
        contact.addresses.push({
          street: parts[2] || undefined,
          city: parts[3] || undefined,
          postalCode: parts[5] || undefined,
          country: parts[6] || undefined,
          label,
        });
      } else if (key.startsWith('URL')) {
        contact.websites.push({ value, label: 'Website' });
      } else if (key.startsWith('BDAY')) {
        contact.birthday = value;
      } else if (key.startsWith('NOTE')) {
        contact.notes = value.replace(/\\n/g, '\n');
      } else if (key.startsWith('CATEGORIES')) {
        contact.labels = value.split(',').map(l => l.trim());
      }
    }

    return contact;
  }

  private labelToVCardType(label: string): string {
    const mapping: Record<string, string> = {
      'Privat': 'HOME',
      'Arbeit': 'WORK',
      'Mobil': 'CELL',
      'Festnetz': 'VOICE',
      'Fax': 'FAX',
      'Sonstige': 'OTHER',
    };
    return mapping[label] || 'OTHER';
  }

  private extractVCardType(key: string): string | null {
    const typeMatch = key.match(/TYPE=([^;:]+)/i);
    if (typeMatch) {
      const type = typeMatch[1].toUpperCase();
      const mapping: Record<string, string> = {
        'HOME': 'Privat',
        'WORK': 'Arbeit',
        'CELL': 'Mobil',
        'VOICE': 'Festnetz',
        'FAX': 'Fax',
        'OTHER': 'Sonstige',
      };
      return mapping[type] || type;
    }
    return null;
  }

  private generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@taskilo.de`;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Alle Kontakte abrufen
   */
  async getContacts(email: string, password: string): Promise<{ contacts: Contact[]; total: number }> {
    const path = this.config.addressBookPath.replace('{email}', email);
    
    // PROPFIND Request für alle vCards
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:getetag/>
    <card:address-data/>
  </d:prop>
</d:propfind>`;

    const response = await this.carddavRequest(
      email,
      password,
      'PROPFIND',
      path,
      propfindBody,
      'application/xml; charset=utf-8'
    );

    if (response.status !== 207) {
      throw new Error(`CardDAV PROPFIND failed: ${response.status}`);
    }

    // Parse XML Response und extrahiere vCards
    // Flexible Regex: verschiedene Namespace-Prefixe (card:, a:, oder kein Prefix)
    const contacts: Contact[] = [];
    const vcardMatches = response.body.matchAll(/<(?:[a-z]+:)?address-data[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?address-data>/gi);
    
    for (const match of vcardMatches) {
      const vcardData = this.decodeXmlEntities(match[1]);
      if (vcardData.includes('BEGIN:VCARD')) {
        const contact = this.vCardToContact(vcardData);
        contacts.push(contact);
      }
    }

    return { contacts, total: contacts.length };
  }

  /**
   * Einzelnen Kontakt abrufen
   */
  async getContact(email: string, password: string, contactUid: string): Promise<Contact | null> {
    const path = `${this.config.addressBookPath.replace('{email}', email)}/${contactUid}.vcf`;
    
    const response = await this.carddavRequest(email, password, 'GET', path);

    if (response.status === 404) {
      return null;
    }

    if (response.status !== 200) {
      throw new Error(`CardDAV GET failed: ${response.status}`);
    }

    return this.vCardToContact(response.body, contactUid);
  }

  /**
   * Kontakt erstellen
   */
  async createContact(email: string, password: string, contact: Omit<Contact, 'uid'>): Promise<Contact> {
    const uid = this.generateUID();
    const fullContact: Contact = { ...contact, uid };
    
    const vcard = this.contactToVCard(fullContact);
    const path = `${this.config.addressBookPath.replace('{email}', email)}/${uid}.vcf`;

    const response = await this.carddavRequest(email, password, 'PUT', path, vcard);

    if (response.status !== 201 && response.status !== 204) {
      throw new Error(`CardDAV PUT failed: ${response.status} - ${response.body}`);
    }

    this.stats.contactsCreated++;
    return fullContact;
  }

  /**
   * Kontakt aktualisieren
   */
  async updateContact(email: string, password: string, contact: Contact): Promise<Contact> {
    const vcard = this.contactToVCard(contact);
    const path = `${this.config.addressBookPath.replace('{email}', email)}/${contact.uid}.vcf`;

    const response = await this.carddavRequest(email, password, 'PUT', path, vcard);

    if (response.status !== 201 && response.status !== 204) {
      throw new Error(`CardDAV PUT failed: ${response.status}`);
    }

    this.stats.contactsUpdated++;
    return contact;
  }

  /**
   * Kontakt löschen
   */
  async deleteContact(email: string, password: string, contactUid: string): Promise<boolean> {
    const path = `${this.config.addressBookPath.replace('{email}', email)}/${contactUid}.vcf`;

    const response = await this.carddavRequest(email, password, 'DELETE', path);

    if (response.status !== 204 && response.status !== 200) {
      throw new Error(`CardDAV DELETE failed: ${response.status}`);
    }

    this.stats.contactsDeleted++;
    return true;
  }

  /**
   * Labels/Gruppen abrufen
   */
  async getLabels(email: string, password: string): Promise<Label[]> {
    // Labels werden aus den Kontakten extrahiert (CATEGORIES)
    const { contacts } = await this.getContacts(email, password);
    
    const labelSet = new Set<string>();
    for (const contact of contacts) {
      for (const label of contact.labels) {
        labelSet.add(label);
      }
    }

    return Array.from(labelSet).map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
    }));
  }

  /**
   * Kontakte nach Label filtern
   */
  async getContactsByLabel(email: string, password: string, label: string): Promise<Contact[]> {
    const { contacts } = await this.getContacts(email, password);
    return contacts.filter(c => c.labels.includes(label));
  }

  /**
   * Kontakte suchen
   */
  async searchContacts(email: string, password: string, query: string): Promise<Contact[]> {
    const { contacts } = await this.getContacts(email, password);
    const queryLower = query.toLowerCase();

    return contacts.filter(c => 
      c.displayName?.toLowerCase().includes(queryLower) ||
      c.firstName?.toLowerCase().includes(queryLower) ||
      c.lastName?.toLowerCase().includes(queryLower) ||
      c.company?.toLowerCase().includes(queryLower) ||
      c.emails.some(e => e.value.toLowerCase().includes(queryLower)) ||
      c.phones.some(p => p.value.includes(query))
    );
  }

  private decodeXmlEntities(str: string): string {
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  // Stats
  getStats() {
    return { ...this.stats };
  }
}

// Singleton Export
export const cardDAVService = new CardDAVService();
export default CardDAVService;
