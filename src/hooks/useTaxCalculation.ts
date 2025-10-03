import { useState, useEffect } from 'react';
import { TaxCalculation } from '@/types/taxRules';
import { getTaxRule } from '@/config/taxRules';

interface UseTaxCalculationOptions {
  amount: number;
  taxRuleId: string;
}

export function useTaxCalculation({ amount, taxRuleId }: UseTaxCalculationOptions): TaxCalculation {
  const [calculation, setCalculation] = useState<TaxCalculation>({
    taxRate: 0,
    taxAmount: 0,
    netAmount: amount,
    grossAmount: amount,
    isReverseCharge: false,
    invoiceText: '',
  });

  useEffect(() => {
    const rule = getTaxRule(taxRuleId);
    if (!rule) return;

    const taxRate = rule.taxRate;
    const isReverseCharge = taxRuleId.includes('REVERSE');
    const taxAmount = isReverseCharge ? 0 : (amount * taxRate) / 100;
    const netAmount = amount;
    const grossAmount = netAmount + taxAmount;

    setCalculation({
      taxRate,
      taxAmount,
      netAmount,
      grossAmount,
      isReverseCharge,
      invoiceText: rule.invoiceText,
    });
  }, [amount, taxRuleId]);

  return calculation;
}
