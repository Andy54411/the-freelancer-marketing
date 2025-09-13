'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPreferencesService, UserPreferences } from '@/lib/userPreferences';
import { InvoiceTemplatePicker } from '@/components/finance/InvoiceTemplatePicker';
import { QuoteTemplatePicker } from '@/components/finance/QuoteTemplatePicker';
import { DeliveryNoteTemplatePicker } from '@/components/finance/DeliveryNoteTemplatePicker';
import type { InvoiceTemplate } from '@/components/finance/templates';
import type { DeliveryNoteTemplate } from '@/components/finance/delivery-note-templates';
import { FileText, Eye, Settings, Save, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
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
          deliveryNoteTemplate: userPrefs.preferredDeliveryNoteTemplate || null,
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
          updateData.preferredDeliveryNoteTemplate = template as DeliveryNoteTemplate;
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-[#14ad9f]" />
            Template-Einstellungen
          </h1>
          <p className="text-gray-600 mt-1">
            Wählen Sie Ihre bevorzugten Templates für verschiedene Dokumente aus
          </p>
        </div>
      </div>

      {/* Template Selection Tabs */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Rechnungen
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Angebote
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Lieferscheine
          </TabsTrigger>
        </TabsList>

        {/* Invoice Templates */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Rechnungs-Templates
              </CardTitle>
              <CardDescription>
                Wählen Sie das Standard-Template für Ihre Rechnungen aus. Dieses wird automatisch
                bei der Rechnungserstellung verwendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-[#14ad9f]"></div>
                  <div>
                    <p className="font-medium text-gray-900">Aktuell ausgewählt:</p>
                    <p className="text-sm text-gray-600">
                      {preferences.invoiceTemplate ? (
                        <Badge variant="outline" className="mt-1">
                          {preferences.invoiceTemplate}
                        </Badge>
                      ) : (
                        <span className="text-gray-500 italic">Kein Template ausgewählt</span>
                      )}
                    </p>
                  </div>
                </div>
                {preferences.invoiceTemplate && <CheckCircle className="h-5 w-5 text-green-600" />}
              </div>

              <InvoiceTemplatePicker
                trigger={
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Rechnungs-Template auswählen
                  </Button>
                }
                selectedTemplate={(preferences.invoiceTemplate as any) || 'german-standard'}
                onTemplateSelect={template => updateTemplatePreference('invoiceTemplate', template)}
                userId={uid}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quote Templates */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Angebots-Templates
              </CardTitle>
              <CardDescription>
                Wählen Sie das Standard-Template für Ihre Angebote aus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-[#14ad9f]"></div>
                  <div>
                    <p className="font-medium text-gray-900">Aktuell ausgewählt:</p>
                    <p className="text-sm text-gray-600">
                      {preferences.quoteTemplate ? (
                        <Badge variant="outline" className="mt-1">
                          {preferences.quoteTemplate}
                        </Badge>
                      ) : (
                        <span className="text-gray-500 italic">Kein Template ausgewählt</span>
                      )}
                    </p>
                  </div>
                </div>
                {preferences.quoteTemplate && <CheckCircle className="h-5 w-5 text-green-600" />}
              </div>

              <QuoteTemplatePicker
                trigger={
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Angebots-Template auswählen
                  </Button>
                }
                selectedTemplate={preferences.quoteTemplate || 'german-standard'}
                onTemplateSelect={template => updateTemplatePreference('quoteTemplate', template)}
                userId={uid}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Note Templates */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Lieferschein-Templates
              </CardTitle>
              <CardDescription>
                Wählen Sie das Standard-Template für Ihre Lieferscheine aus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-[#14ad9f]"></div>
                  <div>
                    <p className="font-medium text-gray-900">Aktuell ausgewählt:</p>
                    <p className="text-sm text-gray-600">
                      {preferences.deliveryNoteTemplate ? (
                        <Badge variant="outline" className="mt-1">
                          {preferences.deliveryNoteTemplate}
                        </Badge>
                      ) : (
                        <span className="text-gray-500 italic">Kein Template ausgewählt</span>
                      )}
                    </p>
                  </div>
                </div>
                {preferences.deliveryNoteTemplate && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>

              <DeliveryNoteTemplatePicker
                trigger={
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Lieferschein-Template auswählen
                  </Button>
                }
                selectedTemplate={preferences.deliveryNoteTemplate || 'german-standard'}
                onTemplateSelect={template =>
                  updateTemplatePreference('deliveryNoteTemplate', template)
                }
                userId={uid}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Schnellaktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <Eye className="h-4 w-4 mr-2" />
              Alle Templates vorschau
            </Button>
            <Button variant="outline" className="justify-start">
              <Save className="h-4 w-4 mr-2" />
              Einstellungen exportieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Hinweis zu Templates</h3>
              <p className="text-sm text-blue-700">
                Die hier ausgewählten Templates werden als Standard für die automatische
                Dokumentenerstellung verwendet. Sie können das Template bei jeder Erstellung auch
                manuell überschreiben.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
