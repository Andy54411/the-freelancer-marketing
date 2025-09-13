import type { CompanySettings, TemplateCustomizations, DocumentData } from '../types';

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

  return fromCustom || fromCompany || fromDataCompanyLogo || fromDataProfile || undefined;
}
