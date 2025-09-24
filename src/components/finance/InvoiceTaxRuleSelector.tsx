import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Info } from 'lucide-react';
import { TAX_RULES, getCategoryLabel } from '@/config/taxRules';
import { TaxRuleCategory, TaxRuleType } from '@/types/taxRules';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InvoiceTaxRuleSelectorProps {
  value: TaxRuleType;
  onChange: (value: TaxRuleType) => void;
  className?: string;
}

export function InvoiceTaxRuleSelector({ value, onChange, className }: InvoiceTaxRuleSelectorProps) {
  const categories = Object.values(TaxRuleCategory);
  const selectedRule = TAX_RULES.find(rule => rule.id === value);

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Steuerregel</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Steuerregel auswählen">
                {selectedRule?.name || "Steuerregel auswählen"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => {
                const rulesInCategory = TAX_RULES.filter(rule => rule.category === category);
                if (rulesInCategory.length === 0) return null;

                return (
                  <SelectGroup key={category}>
                    <SelectLabel>{getCategoryLabel(category)}</SelectLabel>
                    {rulesInCategory.map(rule => (
                      <SelectItem key={rule.id} value={rule.id}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-gray-500">
                              {rule.description}
                            </div>
                            {rule.taxRate > 0 && (
                              <div className="text-sm text-gray-500">
                                Steuersatz: {rule.taxRate}%
                              </div>
                            )}
                          </div>
                          {rule.requirements && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-sm">
                                <div className="text-sm">
                                  <div className="font-medium mb-1">Voraussetzungen:</div>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {rule.requirements.map((req, idx) => (
                                      <li key={idx}>{req}</li>
                                    ))}
                                  </ul>
                                  <div className="mt-2 text-xs text-gray-500">
                                    Rechtsgrundlage: {rule.legalBasis}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedRule && selectedRule.invoiceText && (
          <div className="space-y-2">
            <Label>Hinweistext auf der Rechnung</Label>
            <div className="text-sm p-3 bg-gray-50 rounded border">
              {selectedRule.invoiceText.split('\n').map((line, idx) => (
                <p key={idx} className="mb-1 last:mb-0">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}