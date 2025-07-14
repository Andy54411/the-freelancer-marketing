import type { CompanyData } from '@/lib/company-data';

export type ProcessedCompanyData = {
  displayName: string;
  status: 'active' | 'locked' | 'unknown';
  email: string | null;
  documents: { key: string; label: string; value: string }[];
  otherData: Record<string, unknown>;
};

const documentKeyMap: { [key: string]: string } = {
  profilePictureURL: 'Profilbild',
  profilePictureFirebaseUrl: 'Profilbild',
  'step3.businessLicenseURL': 'Gewerbeschein',
  'step3.identityFrontUrl': 'Ausweis Vorderseite',
  'step3.identityBackUrl': 'Ausweis Rückseite',
  'step3.masterCraftsmanCertificateURL': 'Meisterbrief',
};

const getNestedValue = (obj: unknown, path: string): unknown => {
  if (typeof obj !== 'object' || obj === null) return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc === 'object' && acc !== null && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

export function processCompanyData(companyData: CompanyData): ProcessedCompanyData {
  const displayName =
    (companyData.companyName as string) ||
    (companyData.firmenname as string) ||
    `${companyData.firstName || ''} ${companyData.lastName || ''}`.trim() ||
    'Unbenanntes Unternehmen';
  const status =
    companyData.status === 'active' || companyData.status === 'locked'
      ? companyData.status
      : 'unknown';
  const email = (companyData.email as string) || null;

  const documents: { key: string; label: string; value: string }[] = [];
  const foundDocumentKeys = new Set<string>();

  for (const keyPath in documentKeyMap) {
    const value = getNestedValue(companyData, keyPath);
    if (value && typeof value === 'string' && !documents.some(doc => doc.value === value)) {
      documents.push({ key: keyPath, label: documentKeyMap[keyPath], value });
      foundDocumentKeys.add(keyPath.split('.')[0]);
    }
  }

  const displayedFields = new Set([
    'id',
    'companyName',
    'firmenname',
    'firstName',
    'lastName',
    'email',
    'status',
    ...foundDocumentKeys,
  ]);
  const otherData = Object.fromEntries(
    Object.entries(companyData).filter(([key]) => !displayedFields.has(key))
  );

  return { displayName, status, email, documents, otherData };
}
