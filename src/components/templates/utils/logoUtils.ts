import type { CompanySettings, TemplateCustomizations, DocumentData } from '../types';

// Globales Fallback-Logo für alle Templates
export const FALLBACK_LOGO_URL = '/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg';

// Versucht, eine Logo-URL aus verschiedenen Quellen zu ermitteln (Reihenfolge wichtig)
// 1) Customizations.logoUrl
// 2) CompanySettings.logoUrl
// 3) Bekannte DB-Felder innerhalb von DocumentData (companyLogo, profilePictureURL)
// 4) Optional: Statisches Fallback (z. B. Platzhalter)
export function resolveLogoUrl(
  customizations?: TemplateCustomizations,
  companySettings?: CompanySettings,
  data?: Partial<DocumentData> & Record<string, any>
): string | undefined {
  const fromCustom = customizations?.logoUrl;
  const fromCompany = companySettings?.logoUrl;
  const fromDataCompanyLogo = (data as any)?.companyLogo as string | undefined;
  const fromDataProfile = (data as any)?.profilePictureURL as string | undefined;

  return fromCustom || fromCompany || fromDataCompanyLogo || fromDataProfile || FALLBACK_LOGO_URL;
}
