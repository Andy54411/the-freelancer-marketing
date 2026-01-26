/**
 * ProfileService - MongoDB-basierte Benutzerprofile
 * ==================================================
 * 
 * Ersetzt die SQLite-basierte Version.
 * Speichert Profildaten inkl. verifizierter Telefonnummer in MongoDB.
 * Ermöglicht Synchronisation mit Firebase Company-Daten.
 */

import mongoDBService, { WebmailProfile } from './MongoDBService';

// Interfaces für API-Kompatibilität
export interface ProfileResponse {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneVerified: boolean;
  phoneVerifiedAt: number | null;
  avatarUrl: string;
  status: string;
  customStatus: string;
  statusEmoji: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'sms' | 'authenticator' | null;
  loginHistory: LoginEntryResponse[];
  trustedDevices: TrustedDeviceResponse[];
  linkedAccounts?: LinkedAccountResponse[];
  storageUsedBytes?: number;
  createdAt: number;
  updatedAt: number;
  // Company-Sync Daten
  companyId?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyPostalCode?: string | null;
  companyCountry?: string | null;
  companyVatId?: string | null;
  companyTaxNumber?: string | null;
  companyIban?: string | null;
  companyBic?: string | null;
  companyBankName?: string | null;
  companyIndustry?: string | null;
  companyLegalForm?: string | null;
  companySyncedAt?: number | null;
  // Account Status
  accountStatus?: string;
  suspended?: boolean;
  blocked?: boolean;
}

export interface LinkedAccountResponse {
  email: string;
  name: string;
  addedAt: string;
}

export interface LoginEntryResponse {
  timestamp: number;
  ip: string;
  userAgent: string;
  location: string;
  success: boolean;
}

export interface TrustedDeviceResponse {
  id: string;
  name: string;
  lastUsed: number;
  userAgent: string;
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
    firstName?: string;
    lastName?: string;
    accountStatus?: string;
    suspended?: boolean;
    blocked?: boolean;
    [key: string]: unknown;
  };
}

// Erweiterte WebmailProfile für Company-Daten
interface ExtendedProfile extends WebmailProfile {
  companyId?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyPostalCode?: string | null;
  companyCountry?: string | null;
  companyVatId?: string | null;
  companyTaxNumber?: string | null;
  companyIban?: string | null;
  companyBic?: string | null;
  companyBankName?: string | null;
  companyIndustry?: string | null;
  companyLegalForm?: string | null;
  companySyncedAt?: Date | null;
  accountStatus?: string;
  suspended?: boolean;
  blocked?: boolean;
  linkedAccounts?: Array<{ email: string; name: string; addedAt: string }>;
}

class ProfileServiceMongo {
  constructor() {
    console.log('[ProfileService] MongoDB-basiert initialisiert');
  }

  /**
   * Neues Profil bei Registrierung erstellen
   */
  async createProfile(data: {
    email: string;
    firstName: string;
    lastName?: string;
    phone: string;
    phoneVerified: boolean;
    birthDate?: string;
    gender?: string;
  }): Promise<ProfileResponse> {
    const now = new Date();
    const normalizedEmail = data.email.toLowerCase().trim();

    await mongoDBService.connect();

    const newProfile: WebmailProfile = {
      email: normalizedEmail,
      displayName: `${data.firstName}${data.lastName ? ' ' + data.lastName : ''}`,
      firstName: data.firstName,
      lastName: data.lastName || '',
      phone: data.phone,
      phoneVerified: data.phoneVerified,
      phoneVerifiedAt: data.phoneVerified ? now : null,
      avatarUrl: '',
      status: 'active',
      customStatus: '',
      statusEmoji: '',
      twoFactorEnabled: false,
      twoFactorMethod: null,
      loginHistory: [],
      trustedDevices: [],
      createdAt: now,
      updatedAt: now,
    };

    await mongoDBService.profiles.insertOne(newProfile);
    
    console.log(`[ProfileService] Profile created for ${normalizedEmail}`);

    return this.mapToResponse(newProfile as ExtendedProfile);
  }

  /**
   * Profil abrufen
   */
  async getProfile(email: string): Promise<ProfileResponse | null> {
    const normalizedEmail = email.toLowerCase().trim();

    await mongoDBService.connect();
    const profile = await mongoDBService.profiles.findOne({ email: normalizedEmail });

    if (!profile) {
      return null;
    }

    return this.mapToResponse(profile as ExtendedProfile);
  }

  /**
   * Profil nach Company-ID abrufen
   */
  async getProfileByCompanyId(companyId: string): Promise<ProfileResponse | null> {
    await mongoDBService.connect();
    
    // Company-ID ist in erweiterten Feldern gespeichert
    const profile = await mongoDBService.profiles.findOne({ 
      companyId: companyId 
    } as Record<string, unknown>);

    if (!profile) {
      return null;
    }

    return this.mapToResponse(profile as ExtendedProfile);
  }

  /**
   * Profil aktualisieren
   */
  async updateProfile(
    email: string, 
    updates: Partial<ExtendedProfile>
  ): Promise<ProfileResponse | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    // Email und _id nicht überschreiben
    const updateData = { ...updates };
    delete updateData.email;
    delete updateData._id;
    updateData.updatedAt = now;

    const result = await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return null;
    }

    return this.getProfile(email);
  }

  /**
   * Telefonnummer verifizieren
   */
  async verifyPhone(email: string): Promise<boolean> {
    const now = new Date();
    const normalizedEmail = email.toLowerCase().trim();

    await mongoDBService.connect();

    const result = await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { 
        $set: { 
          phoneVerified: true, 
          phoneVerifiedAt: now,
          updatedAt: now,
        } 
      }
    );

    return result.matchedCount > 0;
  }

  /**
   * Telefonnummer aktualisieren
   */
  async updatePhone(email: string, phone: string, verified: boolean = false): Promise<boolean> {
    const now = new Date();
    const normalizedEmail = email.toLowerCase().trim();

    await mongoDBService.connect();

    const updateData: Record<string, unknown> = {
      phone,
      phoneVerified: verified,
      updatedAt: now,
    };

    if (verified) {
      updateData.phoneVerifiedAt = now;
    }

    const result = await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { $set: updateData }
    );

    return result.matchedCount > 0;
  }

  /**
   * Company-Daten synchronisieren
   */
  async syncCompanyData(syncData: ProfileSyncData): Promise<{ 
    success: boolean; 
    phone?: string; 
    phoneVerified?: boolean;
    error?: string;
  }> {
    const normalizedEmail = syncData.email.toLowerCase().trim();
    
    await mongoDBService.connect();
    const profile = await mongoDBService.profiles.findOne({ email: normalizedEmail });

    if (!profile) {
      return { 
        success: false, 
        error: `Profil für ${syncData.email} nicht gefunden` 
      };
    }

    const { companyData } = syncData;
    const now = new Date();

    // Adresse zusammenbauen
    const address = companyData.address || 
      (companyData.street && companyData.houseNumber 
        ? `${companyData.street} ${companyData.houseNumber}` 
        : companyData.street || null);

    // Postleitzahl
    const postalCode = companyData.postalCode || companyData.zip || null;

    const updateData: Record<string, unknown> = {
      companyId: syncData.companyId,
      companyName: companyData.companyName || null,
      companyAddress: address,
      companyCity: companyData.city || null,
      companyPostalCode: postalCode,
      companyCountry: companyData.country || null,
      companyVatId: companyData.vatId || null,
      companyTaxNumber: companyData.taxNumber || null,
      companyIban: companyData.iban || null,
      companyBic: companyData.bic || null,
      companyBankName: companyData.bankName || null,
      companyIndustry: companyData.industry || null,
      companyLegalForm: companyData.legalForm || null,
      companySyncedAt: now,
      updatedAt: now,
    };

    // Account-Status aktualisieren
    if (companyData.accountStatus !== undefined) {
      updateData.accountStatus = companyData.accountStatus;
    }
    if (companyData.suspended !== undefined) {
      updateData.suspended = companyData.suspended;
    }
    if (companyData.blocked !== undefined) {
      updateData.blocked = companyData.blocked;
    }

    // Vor/Nachname aus Company aktualisieren
    if (companyData.firstName) {
      updateData.firstName = companyData.firstName;
    }
    if (companyData.lastName) {
      updateData.lastName = companyData.lastName;
    }

    await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { $set: updateData }
    );

    console.log(`[ProfileService] Company data synced for ${normalizedEmail}`);

    const extendedProfile = profile as ExtendedProfile;
    return {
      success: true,
      phone: extendedProfile.phone,
      phoneVerified: extendedProfile.phoneVerified,
    };
  }

  /**
   * Login-Eintrag hinzufügen
   */
  async addLoginEntry(
    email: string, 
    entry: { ip: string; userAgent: string; location: string; success: boolean }
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { 
        $push: { 
          loginHistory: { 
            $each: [{ ...entry, timestamp: now }],
            $slice: -50  // Nur die letzten 50 Einträge behalten
          } 
        },
        $set: { updatedAt: now }
      }
    );
  }

  /**
   * Vertrauenswürdiges Gerät hinzufügen
   */
  async addTrustedDevice(
    email: string,
    device: { id: string; name: string; userAgent: string }
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { 
        $push: { 
          trustedDevices: { ...device, lastUsed: now }
        },
        $set: { updatedAt: now }
      }
    );
  }

  /**
   * Vertrauenswürdiges Gerät entfernen
   */
  async removeTrustedDevice(email: string, deviceId: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const result = await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { 
        $pull: { trustedDevices: { id: deviceId } },
        $set: { updatedAt: now }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * 2FA aktivieren/deaktivieren
   */
  async setTwoFactor(
    email: string, 
    enabled: boolean, 
    method: 'sms' | 'authenticator' | null
  ): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const result = await mongoDBService.profiles.updateOne(
      { email: normalizedEmail },
      { 
        $set: { 
          twoFactorEnabled: enabled,
          twoFactorMethod: enabled ? method : null,
          updatedAt: now,
        } 
      }
    );

    return result.matchedCount > 0;
  }

  /**
   * Profil löschen
   */
  async deleteProfile(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    await mongoDBService.connect();

    const result = await mongoDBService.profiles.deleteOne({ email: normalizedEmail });
    
    return result.deletedCount > 0;
  }

  /**
   * Alle Profile abrufen (Admin)
   */
  async getAllProfiles(
    limit: number = 50, 
    skip: number = 0
  ): Promise<{ profiles: ProfileResponse[]; total: number }> {
    await mongoDBService.connect();

    const [profiles, total] = await Promise.all([
      mongoDBService.profiles
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      mongoDBService.profiles.countDocuments({})
    ]);

    return {
      profiles: profiles.map((p: WebmailProfile) => this.mapToResponse(p as ExtendedProfile)),
      total,
    };
  }

  /**
   * MongoDB-Dokument zu API-Response mappen
   */
  private mapToResponse(profile: ExtendedProfile): ProfileResponse {
    return {
      email: profile.email,
      displayName: profile.displayName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      phoneVerified: profile.phoneVerified,
      phoneVerifiedAt: profile.phoneVerifiedAt?.getTime() || null,
      avatarUrl: profile.avatarUrl,
      status: profile.status,
      customStatus: profile.customStatus,
      statusEmoji: profile.statusEmoji,
      twoFactorEnabled: profile.twoFactorEnabled,
      twoFactorMethod: profile.twoFactorMethod,
      loginHistory: (profile.loginHistory || []).map(entry => ({
        timestamp: entry.timestamp.getTime(),
        ip: entry.ip,
        userAgent: entry.userAgent,
        location: entry.location,
        success: entry.success,
      })),
      trustedDevices: (profile.trustedDevices || []).map(device => ({
        id: device.id,
        name: device.name,
        lastUsed: device.lastUsed.getTime(),
        userAgent: device.userAgent,
      })),
      createdAt: profile.createdAt.getTime(),
      updatedAt: profile.updatedAt.getTime(),
      // Company-Daten
      companyId: profile.companyId || null,
      companyName: profile.companyName || null,
      companyAddress: profile.companyAddress || null,
      companyCity: profile.companyCity || null,
      companyPostalCode: profile.companyPostalCode || null,
      companyCountry: profile.companyCountry || null,
      companyVatId: profile.companyVatId || null,
      companyTaxNumber: profile.companyTaxNumber || null,
      companyIban: profile.companyIban || null,
      companyBic: profile.companyBic || null,
      companyBankName: profile.companyBankName || null,
      companyIndustry: profile.companyIndustry || null,
      companyLegalForm: profile.companyLegalForm || null,
      companySyncedAt: profile.companySyncedAt?.getTime() || null,
      // Account Status
      accountStatus: profile.accountStatus || 'active',
      suspended: profile.suspended || false,
      blocked: profile.blocked || false,
    };
  }
}

// Singleton-Instanz exportieren
const profileServiceMongo = new ProfileServiceMongo();
export default profileServiceMongo;
