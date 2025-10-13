import { db } from '@/firebase/clients';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromName: string;
    fromEmail: string;
  };
  imap: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  settings: {
    enabled: boolean;
    syncInterval: number;
    autoSync: boolean;
  };
  companyId?: string;
  lastTested?: {
    smtp: boolean;
    imap: boolean;
    timestamp: Date;
  };
}

export const EMAIL_PROVIDERS: Record<
  string,
  {
    name: string;
    smtp: { host: string; port: number; secure: boolean };
    imap: { host: string; port: number; secure: boolean };
  }
> = {
  custom: {
    name: 'Benutzerdefiniert',
    smtp: { host: '', port: 587, secure: false },
    imap: { host: '', port: 993, secure: true },
  },
  gmail: {
    name: 'Gmail',
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
  },
  outlook: {
    name: 'Outlook / Office 365',
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
  },
  zoho: {
    name: 'Zoho Mail',
    smtp: { host: 'smtp.zoho.eu', port: 587, secure: false },
    imap: { host: 'imap.zoho.eu', port: 993, secure: true },
  },
  ionos: {
    name: '1&1 IONOS',
    smtp: { host: 'smtp.ionos.de', port: 587, secure: false },
    imap: { host: 'imap.ionos.de', port: 993, secure: true },
  },
};

export const encryptPassword = (password: string): string => {
  return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
};

export const decryptPassword = (encryptedPassword: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const getEmailConfig = async (companyId: string): Promise<EmailConfig | null> => {
  try {
    const configRef = doc(db, 'companies', companyId, 'settings', 'emailConfig');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      return configSnap.data() as EmailConfig;
    }
    return null;
  } catch (error) {
    console.error('Error getting email config:', error);
    return null;
  }
};

export const saveEmailConfig = async (config: EmailConfig): Promise<boolean> => {
  try {
    if (!config.companyId) {
      throw new Error('Company ID is required');
    }

    const configRef = doc(db, 'companies', config.companyId, 'settings', 'emailConfig');
    await setDoc(configRef, {
      ...config,
      updatedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error saving email config:', error);
    return false;
  }
};

export const markAsTested = async (companyId: string, success: boolean): Promise<void> => {
  try {
    const configRef = doc(db, 'companies', companyId, 'settings', 'emailConfig');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      await setDoc(
        configRef,
        {
          ...configSnap.data(),
          lastTested: {
            smtp: success,
            imap: success,
            timestamp: new Date(),
          },
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error marking as tested:', error);
  }
};
