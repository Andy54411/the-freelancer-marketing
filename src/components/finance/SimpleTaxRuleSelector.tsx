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
import { TAX_RULES, getCategoryLabel } from '@/config/taxRules';
import { TaxRuleCategory } from '@/types/taxRules';

interface SimpleTaxRuleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SimpleTaxRuleSelector({ value, onChange, className }: SimpleTaxRuleSelectorProps) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Steuerregel auswählen" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(TaxRuleCategory).map(category => (
            <SelectGroup key={category}>
              <SelectLabel>{getCategoryLabel(category)}</SelectLabel>
              {TAX_RULES
                .filter(rule => rule.category === category)
                .map(rule => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}