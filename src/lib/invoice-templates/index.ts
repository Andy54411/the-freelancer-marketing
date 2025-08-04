import { InvoiceData } from '@/types/invoiceTypes';
import { generateMinimalHTML } from './minimal';
import { generateClassicHTML } from './classic';
import { generateModernHTML } from './modern';
import { generateCorporateHTML } from './corporate';
import { generateCreativeHTML } from './creative';
import { generateGermanStandardHTML } from './german-standard';

export type InvoiceTemplate =
  | 'minimal'
  | 'classic'
  | 'modern'
  | 'corporate'
  | 'creative'
  | 'german-standard';

export const TEMPLATE_NAMES: Record<InvoiceTemplate, string> = {
  minimal: 'Minimal',
  classic: 'Klassisch',
  modern: 'Modern',
  corporate: 'Corporate',
  creative: 'Kreativ',
  'german-standard': 'Deutscher Standard',
};

export const TEMPLATE_DESCRIPTIONS: Record<InvoiceTemplate, string> = {
  minimal: 'Sauberes, minimalistisches Design mit Taskilo-Branding',
  classic: 'Traditionelles, seriöses Design im klassischen Stil',
  modern: 'Modernes Design mit Gradienten und modernen Elementen',
  corporate: 'Professionelles Corporate Design für B2B',
  creative: 'Kreatives, farbenfrohes Design für kreative Branchen',
  'german-standard': 'GoBD-konformes deutsches Standard-Layout nach DIN 5008',
};

/**
 * Generiert HTML für eine Rechnung basierend auf dem gewählten Template
 */
export function generateInvoiceHTML(
  invoice: InvoiceData,
  template: InvoiceTemplate = 'minimal'
): string {
  console.log('🎨 Generiere HTML für Template:', template);

  try {
    switch (template) {
      case 'minimal':
        return generateMinimalHTML(invoice);
      case 'classic':
        return generateClassicHTML(invoice);
      case 'modern':
        return generateModernHTML(invoice);
      case 'corporate':
        return generateCorporateHTML(invoice);
      case 'creative':
        return generateCreativeHTML(invoice);
      case 'german-standard':
        return generateGermanStandardHTML(invoice);
      default:
        console.warn('⚠️ Unbekanntes Template:', template, '- verwende minimal als Fallback');
        return generateMinimalHTML(invoice);
    }
  } catch (error) {
    console.error('❌ Fehler bei HTML-Generierung für Template:', template, error);
    console.log('🔄 Fallback auf minimal template');
    return generateMinimalHTML(invoice);
  }
}

/**
 * Alle verfügbaren Templates für UI-Auswahl
 */
export const AVAILABLE_TEMPLATES: Array<{
  id: InvoiceTemplate;
  name: string;
  description: string;
}> = Object.entries(TEMPLATE_NAMES).map(([id, name]) => ({
  id: id as InvoiceTemplate,
  name,
  description: TEMPLATE_DESCRIPTIONS[id as InvoiceTemplate],
}));

// Export individual generators if needed
export {
  generateMinimalHTML,
  generateClassicHTML,
  generateModernHTML,
  generateCorporateHTML,
  generateCreativeHTML,
  generateGermanStandardHTML,
};
