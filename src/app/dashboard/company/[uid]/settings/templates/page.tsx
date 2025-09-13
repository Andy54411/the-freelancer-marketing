'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPreferencesService, UserPreferences } from '@/lib/userPreferences';
import TemplatePreview from '@/components/templates/TemplatePreview';
import type { InvoiceTemplate } from '@/components/finance/InvoiceTemplates';

// Temporary type definition until module is properly resolved
type DeliveryNoteTemplate =
  | 'professional-business-delivery'
  | 'executive-premium-delivery'
  | 'creative-modern-delivery'
  | 'minimalist-elegant-delivery'
  | 'corporate-classic-delivery'
  | 'tech-innovation-delivery';
import { FileText, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TemplatePreferences {
  invoiceTemplate: string | null;
  deliveryNoteTemplate: string | null;
  quoteTemplate: string | null;
}

export default function TemplateSettingsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [loading, setLoading] = useState(true);
  const [_saving, setSaving] = useState(false);
  const [currentType, setCurrentType] = useState('Invoice');
  const [preferences, setPreferences] = useState<TemplatePreferences>({
    invoiceTemplate: null,
    deliveryNoteTemplate: null,
    quoteTemplate: null,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!uid) return;

      try {
        setLoading(true);
        const userPrefs = await UserPreferencesService.getUserPreferences(uid);

        setPreferences({
          invoiceTemplate: userPrefs.preferredInvoiceTemplate || null,
          deliveryNoteTemplate: userPrefs.preferredDeliveryTemplate || null,
          quoteTemplate: userPrefs.preferredQuoteTemplate || null,
        });
      } catch (error) {
        console.error('Fehler beim Laden der Template-Einstellungen:', error);
        toast.error('Fehler beim Laden der Template-Einstellungen');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [uid]);

  // Authorization check
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  const updateTemplatePreference = async (
    templateType: keyof TemplatePreferences,
    template: string
  ) => {
    try {
      setSaving(true);

      const updateData: Partial<UserPreferences> = {};

      switch (templateType) {
        case 'invoiceTemplate':
          updateData.preferredInvoiceTemplate = template as InvoiceTemplate;
          break;
        case 'deliveryNoteTemplate':
          updateData.preferredDeliveryTemplate = template;
          break;
        case 'quoteTemplate':
          updateData.preferredQuoteTemplate = template;
          break;
      }

      await UserPreferencesService.updateUserPreferences(uid, updateData);

      setPreferences(prev => ({
        ...prev,
        [templateType]: template,
      }));

      const templateTypeNames = {
        invoiceTemplate: 'Rechnungs',
        deliveryNoteTemplate: 'Lieferschein',
        quoteTemplate: 'Angebots',
      };

      toast.success(`${templateTypeNames[templateType]}-Template erfolgreich gespeichert`);
    } catch (error) {
      console.error('Fehler beim Speichern der Template-Einstellung:', error);
      toast.error('Fehler beim Speichern der Template-Einstellung');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateTypeSelectorChange = (value: string) => {
    setCurrentType(value);
  };

  const renderTemplateContent = () => {
    return (
      <TemplatePreview
        documentType={currentType as any}
        templateId={getCurrentTemplateId()}
        className="w-full"
        onTemplateSelect={templateId => {
          // Template-Auswahl verarbeiten
          const invoiceTypes = ['Invoice', 'Invoicereminder', 'Creditnote'];
          const quoteTypes = ['Order'];
          const deliveryTypes = ['Contractnote', 'Packinglist'];

          if (invoiceTypes.includes(currentType)) {
            updateTemplatePreference('invoiceTemplate', templateId);
          } else if (quoteTypes.includes(currentType)) {
            updateTemplatePreference('quoteTemplate', templateId);
          } else if (deliveryTypes.includes(currentType)) {
            updateTemplatePreference('deliveryNoteTemplate', templateId);
          }
        }}
      />
    );
  };

  const getCurrentTemplateId = () => {
    const invoiceTypes = ['Invoice', 'Invoicereminder', 'Creditnote'];
    const quoteTypes = ['Order'];
    const deliveryTypes = ['Contractnote', 'Packinglist'];

    if (invoiceTypes.includes(currentType)) {
      return preferences.invoiceTemplate || 'professional-business';
    }
    if (quoteTypes.includes(currentType)) {
      return preferences.quoteTemplate || 'professional-business-quote';
    }
    if (deliveryTypes.includes(currentType)) {
      return preferences.deliveryNoteTemplate || 'professional-business-delivery';
    }

    return 'professional-business';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Laden...</h2>
          <p className="text-gray-600">Template-Einstellungen werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link
              href={`/dashboard/company/${uid}/settings`}
              className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Zurück zu Einstellungen
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="h-8 w-8 mr-3 text-[#14ad9f]" />
            Template-Einstellungen
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Wählen Sie Ihre bevorzugten Templates für verschiedene Dokumente aus
          </p>
        </div>
      </div>

      {/* Template-Typ Auswahl */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-6">
          <label className="text-lg font-semibold text-gray-800 whitespace-nowrap">
            Dokumenttyp
          </label>
          <Select value={currentType} onValueChange={handleTemplateTypeSelectorChange}>
            <SelectTrigger className="w-64 h-12 text-lg">
              <SelectValue placeholder="Template-Typ auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Invoice">Rechnung</SelectItem>
              <SelectItem value="Invoicereminder">Mahnung</SelectItem>
              <SelectItem value="Order">Angebot</SelectItem>
              <SelectItem value="Contractnote">Auftragsbestätigung</SelectItem>
              <SelectItem value="Packinglist">Lieferschein</SelectItem>
              <SelectItem value="Letter">Brief</SelectItem>
              <SelectItem value="Creditnote">Gutschrift</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Template Content - VOLLE BREITE */}
      <div className="w-full">{renderTemplateContent()}</div>
    </div>
  );
}
