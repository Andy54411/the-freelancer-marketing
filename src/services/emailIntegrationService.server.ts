/**
 * Email Integration Service (Server-Side)
 * Handles SMTP/IMAP configuration and email operations
 * FOR USE IN API ROUTES ONLY
 */

import { db } from '@/firebase/server';
import CryptoJS from 'crypto-js';

// Encryption key should be in environment variable
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_EMAIL_ENCRYPTION_KEY || 'taskilo-email-key-2025';

export interface EmailConfig {
  companyId: string;

  // SMTP Configuration
  smtp: {
    host: string;
    port: number;
    secure: boolean;
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
    syncInterval: number;
    lastSync?: Date;
    autoSync: boolean;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  testedAt?: Date;
  testSuccess?: boolean;
}

/**
 * Decrypt sensitive data
 */
export function decryptPassword(encryptedPassword: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Get email configuration for a company (Server-side)
 */
export async function getEmailConfig(companyId: string): Promise<EmailConfig | null> {
  try {
    const configRef = db
      .collection('companies')
      .doc(companyId)
      .collection('settings')
      .doc('emailIntegration');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return null;
    }

    const data = configSnap.data();

    if (!data) {
      return null;
    }

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
    console.error('Error getting email config:', error);
    return null;
  }
}

/**
 * Update last sync timestamp (Server-side)
 */
export async function updateLastSync(companyId: string): Promise<void> {
  try {
    const configRef = db
      .collection('companies')
      .doc(companyId)
      .collection('settings')
      .doc('emailIntegration');
    await configRef.update({
      'settings.lastSync': new Date(),
    });
  } catch (error) {
    console.error('Error updating last sync:', error);
  }
}
