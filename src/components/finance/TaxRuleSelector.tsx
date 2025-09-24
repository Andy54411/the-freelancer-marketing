import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TaxRuleType } from '@/types/taxRules';

interface TaxRuleSelectorProps {
  value: TaxRuleType;
  onChange: (value: TaxRuleType) => void;
  className?: string;
}

export function TaxRuleSelector({ value, onChange, className }: TaxRuleSelectorProps) {
  const [taxDEOpen, setTaxDEOpen] = useState(true);
  const [taxEUOpen, setTaxEUOpen] = useState(false);
  const [taxNonEUOpen, setTaxNonEUOpen] = useState(false);

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* In Deutschland */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between bg-muted/30 px-3 py-2 hover:bg-muted/50 transition"
            onClick={() => setTaxDEOpen(v => !v)}
          >
            <span className="text-sm font-medium">In Deutschland</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${taxDEOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {taxDEOpen && (
            <div className="p-3 space-y-2">
              {[
                {
                  key: TaxRuleType.DE_TAXABLE,
                  label: 'Umsatzsteuerpflichtige Umsätze',
                  hint: 'Regelsteuersatz, i. d. R. 19% (oder 7% für bestimmte Leistungen).',
                },
                {
                  key: TaxRuleType.DE_EXEMPT_4_USTG,
                  label: 'Steuerfreie Umsätze §4 UStG',
                  hint: 'Umsätze, die nach §4 UStG von der Steuer befreit sind (z. B. bestimmte Versicherungen).',
                },
                {
                  key: TaxRuleType.DE_REVERSE_13B,
                  label: 'Reverse Charge gem. §13b UStG',
                  hint: 'Steuerschuld geht auf den Leistungsempfänger über (B2B, bestimmte Leistungen).',
                },
              ].map(opt => (
                <label
                  key={opt.key}
                  className={`flex items-center justify-between gap-3 rounded border p-2 ${
                    value === opt.key ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="taxRule"
                      className="accent-[#14ad9f]"
                      checked={value === opt.key}
                      onChange={() => onChange(opt.key)}
                    />
                    <span>{opt.label}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>{opt.hint}</TooltipContent>
                  </Tooltip>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* EU */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between bg-muted/30 px-3 py-2 hover:bg-muted/50 transition"
            onClick={() => setTaxEUOpen(v => !v)}
          >
            <span className="text-sm font-medium">EU</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${taxEUOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {taxEUOpen && (
            <div className="p-3 space-y-2">
              {[
                {
                  key: TaxRuleType.EU_REVERSE_18B,
                  label: 'Reverse Charge gem. §18b UStG',
                  hint: 'B2B-Leistungen innerhalb der EU – Steuerschuld beim Leistungsempfänger.',
                },
                {
                  key: TaxRuleType.EU_INTRACOMMUNITY_SUPPLY,
                  label: 'Innergemeinschaftliche Lieferungen',
                  hint: 'Lieferung von Waren in anderes EU-Land an Unternehmer mit USt-IdNr., i. d. R. steuerfrei.',
                },
                {
                  key: TaxRuleType.EU_OSS,
                  label: 'OSS – One-Stop-Shop',
                  hint: 'Fernverkauf an Privatkunden in EU; Besteuerung im Bestimmungsland über OSS.',
                },
              ].map(opt => (
                <label
                  key={opt.key}
                  className={`flex items-center justify-between gap-3 rounded border p-2 ${
                    value === opt.key ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="taxRule"
                      className="accent-[#14ad9f]"
                      checked={value === opt.key}
                      onChange={() => onChange(opt.key)}
                    />
                    <span>{opt.label}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>{opt.hint}</TooltipContent>
                  </Tooltip>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Außerhalb der EU */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between bg-muted/30 px-3 py-2 hover:bg-muted/50 transition"
            onClick={() => setTaxNonEUOpen(v => !v)}
          >
            <span className="text-sm font-medium">Außerhalb der EU</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${taxNonEUOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {taxNonEUOpen && (
            <div className="p-3 space-y-2">
              {[
                {
                  key: TaxRuleType.NON_EU_EXPORT,
                  label: 'Ausfuhren',
                  hint: 'Warenlieferungen in Drittländer (außerhalb EU) sind i. d. R. steuerfrei (Nachweis erforderlich).',
                },
                {
                  key: TaxRuleType.NON_EU_OUT_OF_SCOPE,
                  label: 'Nicht im Inland steuerbare Leistung (außerhalb EU, z.B. Schweiz)',
                  hint: 'Leistung gilt nicht im Inland als ausgeführt – keine deutsche USt.',
                },
              ].map(opt => (
                <label
                  key={opt.key}
                  className={`flex items-center justify-between gap-3 rounded border p-2 ${
                    value === opt.key ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="taxRule"
                      className="accent-[#14ad9f]"
                      checked={value === opt.key}
                      onChange={() => onChange(opt.key)}
                    />
                    <span>{opt.label}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>{opt.hint}</TooltipContent>
                  </Tooltip>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Hinweis: Je nach Regelung setzen wir den USt.-Satz automatisch (DE steuerpflichtig
          → 19%, andere Regeln → 0%).
        </div>
      </div>
    </div>
  );
}