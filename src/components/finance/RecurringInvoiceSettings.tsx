'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TextTemplateService } from '@/services/TextTemplateService';
import type { TextTemplate } from '@/types/textTemplates';

export interface RecurringInvoiceSettingsProps {
  // Automatische Generierung
  autoGenerate: boolean;
  onAutoGenerateChange: (enabled: boolean) => void;

  // Intervall
  interval: 'monthly' | 'quarterly' | 'yearly';
  onIntervalChange: (interval: 'monthly' | 'quarterly' | 'yearly') => void;

  // Datumsangaben
  startDate: Date;
  onStartDateChange: (date: Date) => void;

  endDate?: Date;
  onEndDateChange: (date: Date | undefined) => void;

  // Automatischer Versand
  autoSendEmail?: boolean;
  onAutoSendEmailChange?: (enabled: boolean) => void;
  
  emailTemplateId?: string;
  onEmailTemplateChange?: (templateId: string) => void;

  // Company ID für Templates
  companyId: string;

  // Optional: Fehlerklasse für Validierung
  getFieldErrorClass?: (fieldName: string) => string;
}

export function RecurringInvoiceSettings({
  autoGenerate,
  onAutoGenerateChange,
  interval,
  onIntervalChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  autoSendEmail = false,
  onAutoSendEmailChange,
  emailTemplateId = 'standard',
  onEmailTemplateChange,
  companyId,
  getFieldErrorClass = () => '',
}: RecurringInvoiceSettingsProps) {
  const [emailTemplates, setEmailTemplates] = useState<TextTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // E-Mail-Vorlagen laden
  useEffect(() => {
    const loadTemplates = async () => {
      if (!companyId) return;
      
      try {
        setLoadingTemplates(true);
        // Lade E-Mail-Vorlagen für Rechnungen (INVOICE) mit Typ BODY
        const templates = await TextTemplateService.getTextTemplatesByType(
          companyId,
          'INVOICE',
          'BODY'
        );
        setEmailTemplates(templates);
      } catch (error) {
        console.error('Fehler beim Laden der E-Mail-Vorlagen:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [companyId]);

  const getIntervalLabel = () => {
    switch (interval) {
      case 'monthly':
        return 'jeden Monat';
      case 'quarterly':
        return 'jedes Quartal';
      case 'yearly':
        return 'jedes Jahr';
    }
  };

  return (
    <Card className="border-2 border-[#14ad9f]/20 bg-gradient-to-br from-white to-[#14ad9f]/5">
      <CardHeader>
        <CardTitle className="flex items-center text-[#14ad9f]">
          <RefreshCw className="h-5 w-5 mr-2" />
          Wiederkehrende Einstellungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Automatische Generierung */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Automatische Generierung
              </h3>
              <p className="text-sm text-gray-600 mb-4 max-w-md">
                Hier kannst du die automatische Generierung der Rechnung aktivieren oder
                deaktivieren. Hast du sie aktiviert, so werden die Rechnungen im angegebenen
                Intervall automatisch für dich erzeugt.
              </p>
            </div>

            <RadioGroup
              value={autoGenerate ? 'enabled' : 'disabled'}
              onValueChange={(value) => onAutoGenerateChange(value === 'enabled')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-[#14ad9f]/50 hover:bg-[#14ad9f]/5 transition-colors">
                <RadioGroupItem value="disabled" id="generation-off" />
                <Label
                  htmlFor="generation-off"
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  Generierung deaktivieren
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-[#14ad9f]/50 hover:bg-[#14ad9f]/5 transition-colors">
                <RadioGroupItem value="enabled" id="generation-on" />
                <Label
                  htmlFor="generation-on"
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  Generierung aktivieren
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            {/* Info-Box wenn Generierung aktiv */}
            {autoGenerate && (
              <div className="bg-[#14ad9f]/10 border border-[#14ad9f]/20 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info className="h-5 w-5 text-[#14ad9f] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">
                      Automatische Erstellung aktiv
                    </p>
                    <p className="text-gray-600">
                      Die nächste Rechnung wird automatisch am{' '}
                      <strong>{format(startDate, 'dd.MM.yyyy', { locale: de })}</strong> erstellt
                      und danach {getIntervalLabel()}
                      {endDate && ` bis zum ${format(endDate, 'dd.MM.yyyy', { locale: de })}`}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Automatischer Versand */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Automatischer Versand
                </h3>
              </div>

              <RadioGroup
                value={autoSendEmail ? 'email' : 'off'}
                onValueChange={(value) => {
                  if (onAutoSendEmailChange) {
                    onAutoSendEmailChange(value === 'email');
                  }
                }}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-[#14ad9f]/50 hover:bg-[#14ad9f]/5 transition-colors">
                  <RadioGroupItem value="off" id="auto-send-off" />
                  <Label
                    htmlFor="auto-send-off"
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    Kein automatischer Versand
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-[#14ad9f]/50 hover:bg-[#14ad9f]/5 transition-colors">
                  <RadioGroupItem value="email" id="auto-send-email" />
                  <Label
                    htmlFor="auto-send-email"
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    E-Mail versenden
                  </Label>
                </div>
              </RadioGroup>

              {/* E-Mail Text Template (conditional) */}
              {autoSendEmail && (
                <div className="space-y-2 mt-3">
                  <Label className="text-sm font-medium text-gray-700">
                    E-Mail Text aus Vorlage
                  </Label>
                  <Select 
                    value={emailTemplateId} 
                    onValueChange={(value) => {
                      if (onEmailTemplateChange) {
                        onEmailTemplateChange(value);
                      }
                    }}
                    disabled={loadingTemplates}
                  >
                    <SelectTrigger className="w-full max-w-[300px]">
                      <SelectValue placeholder={loadingTemplates ? "Lade Vorlagen..." : "Vorlage wählen"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingTemplates ? (
                        <SelectItem value="loading" disabled>
                          Lade Vorlagen...
                        </SelectItem>
                      ) : emailTemplates.length > 0 ? (
                        <>
                          {emailTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                              {template.isDefault && ' (Standard)'}
                            </SelectItem>
                          ))}
                          <SelectItem value="create">+ Neue Textvorlage erstellen</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="none" disabled>
                            Keine Vorlagen gefunden
                          </SelectItem>
                          <SelectItem value="create">+ Neue Textvorlage erstellen</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {emailTemplates.length === 0 && !loadingTemplates && (
                    <p className="text-xs text-gray-500">
                      Erstellen Sie zuerst eine E-Mail-Vorlage unter Einstellungen → Textvorlagen
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Intervall und Datums-Einstellungen (nur wenn aktiviert) */}
        {autoGenerate && (
          <>
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Abrechnungsintervall */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Abrechnungsintervall
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select value={interval} onValueChange={onIntervalChange}>
                    <SelectTrigger className={`w-full ${getFieldErrorClass('interval')}`}>
                      <SelectValue placeholder="Intervall wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monatlich</SelectItem>
                      <SelectItem value="quarterly">Quartalsweise (alle 3 Monate)</SelectItem>
                      <SelectItem value="yearly">Jährlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Startdatum */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Startdatum
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={startDate?.toISOString().split('T')[0]}
                    onChange={(e) => onStartDateChange(new Date(e.target.value))}
                    className={getFieldErrorClass('startDate')}
                    required
                  />
                </div>

                {/* Enddatum (optional) */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Enddatum (optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={endDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) =>
                        onEndDateChange(e.target.value ? new Date(e.target.value) : undefined)
                      }
                      placeholder="Kein Enddatum"
                      className={getFieldErrorClass('endDate')}
                    />
                    {endDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEndDateChange(undefined)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Leer lassen für unbegrenzte Wiederholung
                  </p>
                </div>
              </div>
            </div>

            {/* Weitere Hinweise */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Wichtiger Hinweis</p>
                  <p>
                    Die erste Rechnung wird am Startdatum erstellt. Alle nachfolgenden Rechnungen
                    werden automatisch im gewählten Intervall generiert.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default RecurringInvoiceSettings;
