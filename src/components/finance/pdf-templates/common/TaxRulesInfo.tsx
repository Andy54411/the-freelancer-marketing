import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';

interface TaxRulesInfoProps {
  data: ProcessedPDFData;
  color: string;
}

export const TaxRulesInfo: React.FC<TaxRulesInfoProps> = ({ data, color }) => {
  if (!data.taxRule) return null;

  const taxRuleLabels = {
    'DE_TAXABLE': 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
    'DE_TAXABLE_REDUCED': 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)',
    'DE_EXEMPT_4_USTG': 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG',
    'DE_REVERSE_13B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
    'EU_REVERSE_18B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)',
    'EU_INTRACOMMUNITY_SUPPLY': 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG',
    'EU_OSS': 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)',
    'NON_EU_EXPORT': 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)',
    'NON_EU_OUT_OF_SCOPE': 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)'
  };

  return (
    <div className="p-3">
      <div className="font-semibold text-sm text-gray-800 mb-1">Steuerliche Behandlung:</div>
      <div className="text-xs text-gray-700">
        {taxRuleLabels[data.taxRule as keyof typeof taxRuleLabels] || data.taxRule}
      </div>
    </div>
  );
};