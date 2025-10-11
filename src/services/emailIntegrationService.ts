/**
 * Email Integration Service
 * Handles SMTP/IMAP configuration and email operations
 */

import { db } from '@/firebase/clients';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// Encryption key should be in environment variable
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_EMAIL_ENCRYPTION_KEY || 'taskilo-email-key-2025';

export interface EmailConfig {
  companyId: string;

  // SMTP Configuration
  smtp: {
    host: string;
    port: number;
    secure: boolean; // true for 465, false for other ports
    username: string;
    password: string; // encrypted
    fromName: string;
    fromEmail: string;
  };

  // IMAP Configuration
  imap: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string; // encrypted
  };

  // Settings
  settings: {
    enabled: boolean;
    syncInterval: number; // minutes
    lastSync?: Date;
    autoSync: boolean;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  testedAt?: Date;
  testSuccess?: boolean;
}

export interface EmailProvider {
  name: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
}

// Common email providers
export const EMAIL_PROVIDERS: Record<string, EmailProvider> = {
  gmail: {
    name: 'Gmail',
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    },
    imap: {
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
    },
  },
  outlook: {
    name: 'Outlook / Hotmail',
    smtp: {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
    },
    imap: {
      host: 'outlook.office365.com',
      port: 993,
      secure: true,
    },
  },
  yahoo: {
    name: 'Yahoo Mail',
    smtp: {
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
    },
    imap: {
      host: 'imap.mail.yahoo.com',
      port: 993,
      secure: true,
    },
  },
  ionos: {
    name: '1&1 IONOS',
    smtp: {
      host: 'smtp.ionos.de',
      port: 587,
      secure: false,
    },
    imap: {
      host: 'imap.ionos.de',
      port: 993,
      secure: true,
    },
  },
  strato: {
    name: 'Strato',
    smtp: {
      host: 'smtp.strato.de',
      port: 465,
      secure: true,
    },
    imap: {
      host: 'imap.strato.de',
      port: 993,
      secure: true,
    },
  },
  zoho: {
    name: 'Zoho Mail (Empfohlen)',
    smtp: {
      host: 'smtp.zoho.eu',
      port: 587,
      secure: false,
    },
    imap: {
      host: 'imap.zoho.eu',
      port: 993,
      secure: true,
    },
  },
  custom: {
    name: 'Benutzerdefiniert',
    smtp: {
      host: '',
      port: 587,
      secure: false,
    },
    imap: {
      host: '',
      port: 993,
      secure: true,
    },
  },
};

/**
 * Encrypt sensitive data
 */
export function encryptPassword(password: string): string {
  return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt sensitive data
 */
export function decryptPassword(encryptedPassword: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Get email configuration for a company
 */
export async function getEmailConfig(companyId: string): Promise<EmailConfig | null> {
  try {
    console.log('[getEmailConfig] Loading config for company:', companyId);
    const configRef = doc(db, 'companies', companyId, 'settings', 'emailIntegration');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      console.log('[getEmailConfig] No config found - returning null');
      return null;
    }

    const data = configSnap.data();
    console.log('[getEmailConfig] Config found:', data ? 'YES' : 'NO');

    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      testedAt: data.testedAt?.toDate(),
      settings: {
        ...data.settings,
        lastSync: data.settings?.lastSync?.toDate(),
      },
    } as EmailConfig;
  } catch (error) {
    console.error('[getEmailConfig] Error:', error);
    return null;
  }
}

/**
 * Save email configuration
 */
export async function saveEmailConfig(
  config: Omit<EmailConfig, 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  try {
    const configRef = doc(db, 'companies', config.companyId, 'settings', 'emailIntegration');

    // Check if exists
    const existingSnap = await getDoc(configRef);
    const now = new Date();

    const dataToSave = {
      ...config,
      updatedAt: now,
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : now,
    };

    await setDoc(configRef, dataToSave);

    return true;
  } catch (error) {
    console.error('Error saving email config:', error);
    return false;
  }
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(companyId: string): Promise<void> {
  try {
    const configRef = doc(db, 'companies', companyId, 'settings', 'emailIntegration');
    await updateDoc(configRef, {
      'settings.lastSync': new Date(),
    });
  } catch (error) {
    console.error('Error updating last sync:', error);
  }
}

/**
 * Mark email config as tested
 */
export async function markAsTested(companyId: string, success: boolean): Promise<void> {
  try {
    const configRef = doc(db, 'companies', companyId, 'settings', 'emailIntegration');
    await updateDoc(configRef, {
      testedAt: new Date(),
      testSuccess: success,
    });
  } catch (error) {
    console.error('Error marking as tested:', error);
  }
}

/**
 * Delete email configuration
 */
export async function deleteEmailConfig(companyId: string): Promise<boolean> {
  try {
    const configRef = doc(db, 'companies', companyId, 'settings', 'emailIntegration');
    await setDoc(configRef, {
      settings: {
        enabled: false,
      },
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error deleting email config:', error);
    return false;
  }
}
