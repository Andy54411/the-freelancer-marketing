/**
 * ProfileService - Verwaltung von Webmail-Benutzerprofilen
 * 
 * Speichert Profildaten inkl. verifizierter Telefonnummer in SQLite
 * Ermöglicht Synchronisation mit Firebase Company-Daten
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
import * as fs from 'fs';
import * as path from 'path';

// Pfade
const DATA_DIR = process.env.DRIVE_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
const DB_PATH = path.join(DATA_DIR, 'profiles.db');

// Interfaces
export interface WebmailProfile {
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  phoneVerified: boolean;
  birthDate: string | null;
  gender: string | null;
  createdAt: number;
  updatedAt: number;
  // Company-Sync Daten
  companyId: string | null;
  companyName: string | null;
  companyAddress: string | null;
  companyCity: string | null;
  companyPostalCode: string | null;
  companyCountry: string | null;
  companyVatId: string | null;
  companyTaxNumber: string | null;
  companyIban: string | null;
  companyBic: string | null;
  companyBankName: string | null;
  companyIndustry: string | null;
  companyLegalForm: string | null;
  companySyncedAt: number | null;
  // Account Status
  accountStatus: string;
  suspended: boolean;
  blocked: boolean;
}

export interface ProfileSyncData {
  email: string;
  companyId: string;
  companyData: {
    companyName?: string;
    address?: string;
    street?: string;
    houseNumber?: string;
    city?: string;
    postalCode?: string;
    zip?: string;
    country?: string;
    vatId?: string;
    taxNumber?: string;
    iban?: string;
    bic?: string;
    bankName?: string;
    industry?: string;
    legalForm?: string;
    phone?: string;
    website?: string;
    accountHolder?: string;
    // Contact Person
    firstName?: string;
    lastName?: string;
    // Account Status
    accountStatus?: string;
    suspended?: boolean;
    blocked?: boolean;
    // Alle anderen Felder
    [key: string]: unknown;
  };
}

class ProfileService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor() {
    // Verzeichnis erstellen
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Datenbank initialisieren
    this.db = new Database(DB_PATH);
    this.initDatabase();
  }

  private initDatabase(): void {
    // Tabelle erstellen
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS webmail_profiles (
        email TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        phone TEXT NOT NULL,
        phone_verified INTEGER DEFAULT 0,
        birth_date TEXT,
        gender TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        -- Company Sync Data
        company_id TEXT,
        company_name TEXT,
        company_address TEXT,
        company_city TEXT,
        company_postal_code TEXT,
        company_country TEXT,
        company_vat_id TEXT,
        company_tax_number TEXT,
        company_iban TEXT,
        company_bic TEXT,
        company_bank_name TEXT,
        company_industry TEXT,
        company_legal_form TEXT,
        company_synced_at INTEGER,
        -- Account Status
        account_status TEXT DEFAULT 'active',
        suspended INTEGER DEFAULT 0,
        blocked INTEGER DEFAULT 0
      )
    `);

    // Migration: Account Status Felder hinzufügen falls nicht vorhanden
    try {
      this.db.exec(`ALTER TABLE webmail_profiles ADD COLUMN account_status TEXT DEFAULT 'active'`);
    } catch { /* Column exists */ }
    try {
      this.db.exec(`ALTER TABLE webmail_profiles ADD COLUMN suspended INTEGER DEFAULT 0`);
    } catch { /* Column exists */ }
    try {
      this.db.exec(`ALTER TABLE webmail_profiles ADD COLUMN blocked INTEGER DEFAULT 0`);
    } catch { /* Column exists */ }

    // Index für Company-ID
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_profiles_company_id 
      ON webmail_profiles(company_id)
    `);

    console.log('[ProfileService] Database initialized');
  }

  /**
   * Neues Profil bei Registrierung erstellen
   */
  createProfile(data: {
    email: string;
    firstName: string;
    lastName?: string;
    phone: string;
    phoneVerified: boolean;
    birthDate?: string;
    gender?: string;
  }): WebmailProfile {
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO webmail_profiles (
        email, first_name, last_name, phone, phone_verified,
        birth_date, gender, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.email.toLowerCase(),
      data.firstName,
      data.lastName || null,
      data.phone,
      data.phoneVerified ? 1 : 0,
      data.birthDate || null,
      data.gender || null,
      now,
      now
    );

    console.log(`[ProfileService] Profile created for ${data.email}`);

    return this.getProfile(data.email)!;
  }

  /**
   * Profil abrufen
   */
  getProfile(email: string): WebmailProfile | null {
    const stmt = this.db.prepare(`
      SELECT * FROM webmail_profiles WHERE email = ?
    `);

    const row = stmt.get(email.toLowerCase());
    
    if (!row) {
      return null;
    }

    return this.mapRowToProfile(row);
  }

  /**
   * Profil nach Company-ID abrufen
   */
  getProfileByCompanyId(companyId: string): WebmailProfile | null {
    const stmt = this.db.prepare(`
      SELECT * FROM webmail_profiles WHERE company_id = ?
    `);

    const row = stmt.get(companyId);
    
    if (!row) {
      return null;
    }

    return this.mapRowToProfile(row);
  }

  /**
   * Company-Daten synchronisieren und verifizierte Telefonnummer zurückgeben
   */
  syncCompanyData(syncData: ProfileSyncData): { 
    success: boolean; 
    phone?: string; 
    phoneVerified?: boolean;
    error?: string;
  } {
    const profile = this.getProfile(syncData.email);
    
    if (!profile) {
      return { 
        success: false, 
        error: `Profil für ${syncData.email} nicht gefunden` 
      };
    }

    const now = Date.now();
    const { companyData } = syncData;

    // Adresse zusammenbauen aus street + houseNumber falls address nicht vorhanden
    const address = companyData.address || 
      (companyData.street && companyData.houseNumber 
        ? `${companyData.street} ${companyData.houseNumber}` 
        : companyData.street || null);

    // PostalCode kann als zip oder postalCode kommen
    const postalCode = companyData.postalCode || companyData.zip || null;

    // Namen aus companyData oder bestehende Werte behalten
    const firstName = companyData.firstName || profile.firstName;
    const lastName = companyData.lastName || profile.lastName;

    // Account Status
    const accountStatus = companyData.accountStatus || 'active';
    const suspended = companyData.suspended === true ? 1 : 0;
    const blocked = companyData.blocked === true ? 1 : 0;

    const stmt = this.db.prepare(`
      UPDATE webmail_profiles SET
        first_name = ?,
        last_name = ?,
        company_id = ?,
        company_name = ?,
        company_address = ?,
        company_city = ?,
        company_postal_code = ?,
        company_country = ?,
        company_vat_id = ?,
        company_tax_number = ?,
        company_iban = ?,
        company_bic = ?,
        company_bank_name = ?,
        company_industry = ?,
        company_legal_form = ?,
        account_status = ?,
        suspended = ?,
        blocked = ?,
        company_synced_at = ?,
        updated_at = ?
      WHERE email = ?
    `);

    stmt.run(
      firstName,
      lastName,
      syncData.companyId,
      companyData.companyName || null,
      address,
      companyData.city || null,
      postalCode,
      companyData.country || null,
      companyData.vatId || null,
      companyData.taxNumber || null,
      companyData.iban || null,
      companyData.bic || null,
      companyData.bankName || null,
      companyData.industry || null,
      companyData.legalForm || null,
      accountStatus,
      suspended,
      blocked,
      now,
      now,
      syncData.email.toLowerCase()
    );

    console.log(`[ProfileService] Company data synced for ${syncData.email}, companyId: ${syncData.companyId}, name: ${firstName} ${lastName}, status: ${accountStatus}, suspended: ${suspended}, blocked: ${blocked}`);

    // Verifizierte Telefonnummer zurückgeben
    return {
      success: true,
      phone: profile.phone,
      phoneVerified: profile.phoneVerified,
    };
  }

  /**
   * Telefonnummer aktualisieren (z.B. bei erneuter Verifizierung)
   */
  updatePhone(email: string, phone: string, verified: boolean): boolean {
    const stmt = this.db.prepare(`
      UPDATE webmail_profiles SET
        phone = ?,
        phone_verified = ?,
        updated_at = ?
      WHERE email = ?
    `);

    const result = stmt.run(phone, verified ? 1 : 0, Date.now(), email.toLowerCase());
    
    return result.changes > 0;
  }

  /**
   * Prüfen ob eine Telefonnummer bereits verwendet wird
   */
  isPhoneUsed(phone: string, excludeEmail?: string): boolean {
    let stmt;
    if (excludeEmail) {
      stmt = this.db.prepare(`
        SELECT 1 FROM webmail_profiles WHERE phone = ? AND email != ?
      `);
      return !!stmt.get(phone, excludeEmail.toLowerCase());
    } else {
      stmt = this.db.prepare(`
        SELECT 1 FROM webmail_profiles WHERE phone = ?
      `);
      return !!stmt.get(phone);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToProfile(row: any): WebmailProfile {
    return {
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      phoneVerified: row.phone_verified === 1,
      birthDate: row.birth_date,
      gender: row.gender,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      companyId: row.company_id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      companyCity: row.company_city,
      companyPostalCode: row.company_postal_code,
      companyCountry: row.company_country,
      companyVatId: row.company_vat_id,
      companyTaxNumber: row.company_tax_number,
      companyIban: row.company_iban,
      companyBic: row.company_bic,
      companyBankName: row.company_bank_name,
      companyIndustry: row.company_industry,
      companyLegalForm: row.company_legal_form,
      companySyncedAt: row.company_synced_at,
      // Account Status
      accountStatus: row.account_status || 'active',
      suspended: row.suspended === 1,
      blocked: row.blocked === 1,
    };
  }
}

// Singleton Export
export const profileService = new ProfileService();
export default profileService;
