'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Loader2, 
  FileText, 
  RefreshCw, 
  Bell, 
  Save,
  ShoppingCart,
  Receipt,
  Calendar,
  FileCheck,
  Clock,
  Info,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplateGrid } from '@/components/whatsapp/TemplateGrid';
import { TemplateEmptyState } from '@/components/whatsapp/TemplateEmptyState';
import { CreateTemplateDialog } from '@/components/whatsapp/CreateTemplateDialog';
import type { WhatsAppTemplate } from '@/types/whatsapp';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Automatisierungs-Einstellungen
interface AutomationSettings {
  orderConfirmation: {
    enabled: boolean;
    templateId: string;
    delay: number;
  };
  invoiceSent: {
    enabled: boolean;
    templateId: string;
  };
  invoicePaid: {
    enabled: boolean;
    templateId: string;
  };
  invoiceReminder: {
    enabled: boolean;
    templateId: string;
    daysAfterDue: number;
    maxReminders: number;
  };
  appointmentReminder: {
    enabled: boolean;
    templateId: string;
    hoursBefore: number;
  };
  quoteSent: {
    enabled: boolean;
    templateId: string;
  };
  quoteExpiring: {
    enabled: boolean;
    templateId: string;
    daysBefore: number;
  };
}

const defaultSettings: AutomationSettings = {
  orderConfirmation: { enabled: false, templateId: '', delay: 0 },
  invoiceSent: { enabled: false, templateId: '' },
  invoicePaid: { enabled: false, templateId: '' },
  invoiceReminder: { enabled: false, templateId: '', daysAfterDue: 7, maxReminders: 3 },
  appointmentReminder: { enabled: false, templateId: '', hoursBefore: 24 },
  quoteSent: { enabled: false, templateId: '' },
  quoteExpiring: { enabled: false, templateId: '', daysBefore: 3 },
};

type TabType = 'templates' | 'automations';

export default function WhatsAppTemplatesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  
  // Tab aus URL oder default
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'templates');

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Automatisierungen
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<AutomationSettings | null>(null);
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);

  const approvedTemplates = templates.filter(t => t.status === 'APPROVED');

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch(`/api/whatsapp/templates?companyId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch {
      toast.error('Fehler beim Laden der Vorlagen');
    }
  }, [uid]);

  const loadAutomationSettings = useCallback(async () => {
    try {
      const settingsRef = doc(db, 'companies', uid, 'whatsapp', 'automations');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as AutomationSettings;
        setAutomationSettings({ ...defaultSettings, ...data });
        setOriginalSettings({ ...defaultSettings, ...data });
      } else {
        setOriginalSettings(defaultSettings);
      }
    } catch {
      // Fehler ignorieren
    }
  }, [uid]);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      Promise.all([loadTemplates(), loadAutomationSettings()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [uid, loadTemplates, loadAutomationSettings]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/whatsapp/templates?companyId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        toast.success(`${data.templates?.length || 0} Vorlagen aktualisiert`);
      }
    } catch {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTemplateCreated = () => {
    setShowCreateDialog(false);
    loadTemplates();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // URL aktualisieren ohne Seite neu zu laden
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const updateAutomationSetting = <K extends keyof AutomationSettings>(
    key: K,
    field: keyof AutomationSettings[K],
    value: AutomationSettings[K][keyof AutomationSettings[K]]
  ) => {
    setAutomationSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const hasAutomationChanges = originalSettings && 
    JSON.stringify(automationSettings) !== JSON.stringify(originalSettings);

  const handleSaveAutomations = async () => {
    setIsSavingAutomation(true);
    try {
      const settingsRef = doc(db, 'companies', uid, 'whatsapp', 'automations');
      await setDoc(settingsRef, {
        ...automationSettings,
        updatedAt: new Date().toISOString(),
      });
      setOriginalSettings(automationSettings);
      toast.success('Automatisierungen gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSavingAutomation(false);
    }
  };

  // Hilfsfunktion für Template-Dropdown
  const TemplateSelect = ({ 
    value, 
    onChange, 
    disabled 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    disabled?: boolean;
  }) => (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Vorlage auswählen..." />
      </SelectTrigger>
      <SelectContent>
        {approvedTemplates.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 text-center">
            Keine genehmigten Vorlagen
          </div>
        ) : (
          approvedTemplates.map(template => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex flex-col">
                <span>{template.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-linear-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-[#25D366] mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Vorlagen werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nachrichtenvorlagen</h1>
            <p className="text-sm text-gray-500 mt-1">
              {templates.length} Vorlage{templates.length !== 1 ? 'n' : ''} verfügbar 
              ({approvedTemplates.length} genehmigt)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'templates' && templates.length > 0 && (
              <>
                <Button
                  onClick={handleRefreshAll}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Vorlage erstellen
                </Button>
              </>
            )}
            {activeTab === 'automations' && hasAutomationChanges && (
              <Button
                onClick={handleSaveAutomations}
                disabled={isSavingAutomation}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm"
              >
                {isSavingAutomation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Änderungen speichern
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          <button
            onClick={() => handleTabChange('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-[#25D366]/10 text-[#25D366]'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Meine Vorlagen
          </button>
          <button
            onClick={() => handleTabChange('automations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'automations'
                ? 'bg-[#25D366]/10 text-[#25D366]'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            Automatisierungen
          </button>
        </div>
      </div>

      {/* Tab: Meine Vorlagen */}
      {activeTab === 'templates' && (
        <>
          {/* Info Banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <p className="text-sm text-amber-800">
              Vorlagen müssen nach dem Erstellen von Meta geprüft werden. Die Prüfung dauert für gewöhnlich nicht länger als eine Minute.
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {templates.length === 0 ? (
              <TemplateEmptyState onCreateClick={() => setShowCreateDialog(true)} />
            ) : (
              <TemplateGrid templates={templates} onTemplateUpdate={loadTemplates} companyId={uid} />
            )}
          </div>
        </>
      )}

      {/* Tab: Automatisierungen */}
      {activeTab === 'automations' && (
        <>
          {/* Info Banner */}
          {approvedTemplates.length === 0 ? (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Keine genehmigten Vorlagen</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Erstelle zuerst Vorlagen und warte auf die Meta-Genehmigung, bevor du Automatisierungen aktivieren kannst.
                  </p>
                  <Button
                    onClick={() => handleTabChange('templates')}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Vorlage erstellen
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-b border-green-200 px-6 py-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-800">
                  <strong>{approvedTemplates.length}</strong> genehmigte Vorlage{approvedTemplates.length !== 1 ? 'n' : ''} verfügbar. 
                  Wähle für jede Automatisierung eine passende Vorlage aus.
                </p>
              </div>
            </div>
          )}

          {/* Automatisierungen Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Auftragsbestätigungen */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Auftragsbestätigungen</CardTitle>
                        <CardDescription>Automatische Bestätigung nach Bestellung</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={automationSettings.orderConfirmation.enabled}
                      onCheckedChange={(checked) => updateAutomationSetting('orderConfirmation', 'enabled', checked)}
                      disabled={approvedTemplates.length === 0}
                    />
                  </div>
                </CardHeader>
                {automationSettings.orderConfirmation.enabled && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vorlage</Label>
                        <TemplateSelect
                          value={automationSettings.orderConfirmation.templateId}
                          onChange={(v) => updateAutomationSetting('orderConfirmation', 'templateId', v)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Verzögerung</Label>
                        <Select
                          value={automationSettings.orderConfirmation.delay.toString()}
                          onValueChange={(v) => updateAutomationSetting('orderConfirmation', 'delay', parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Sofort</SelectItem>
                            <SelectItem value="5">Nach 5 Minuten</SelectItem>
                            <SelectItem value="15">Nach 15 Minuten</SelectItem>
                            <SelectItem value="30">Nach 30 Minuten</SelectItem>
                            <SelectItem value="60">Nach 1 Stunde</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Rechnungen */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Rechnungsbenachrichtigungen</CardTitle>
                      <CardDescription>Automatische Nachrichten bei Rechnungsereignissen</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rechnung versendet */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Rechnung versendet</span>
                      </div>
                      <Switch
                        checked={automationSettings.invoiceSent.enabled}
                        onCheckedChange={(checked) => updateAutomationSetting('invoiceSent', 'enabled', checked)}
                        disabled={approvedTemplates.length === 0}
                      />
                    </div>
                    {automationSettings.invoiceSent.enabled && (
                      <div className="space-y-2">
                        <Label>Vorlage</Label>
                        <TemplateSelect
                          value={automationSettings.invoiceSent.templateId}
                          onChange={(v) => updateAutomationSetting('invoiceSent', 'templateId', v)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Zahlung eingegangen */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Zahlung eingegangen</span>
                      </div>
                      <Switch
                        checked={automationSettings.invoicePaid.enabled}
                        onCheckedChange={(checked) => updateAutomationSetting('invoicePaid', 'enabled', checked)}
                        disabled={approvedTemplates.length === 0}
                      />
                    </div>
                    {automationSettings.invoicePaid.enabled && (
                      <div className="space-y-2">
                        <Label>Vorlage</Label>
                        <TemplateSelect
                          value={automationSettings.invoicePaid.templateId}
                          onChange={(v) => updateAutomationSetting('invoicePaid', 'templateId', v)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Zahlungserinnerung */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Zahlungserinnerung</span>
                      </div>
                      <Switch
                        checked={automationSettings.invoiceReminder.enabled}
                        onCheckedChange={(checked) => updateAutomationSetting('invoiceReminder', 'enabled', checked)}
                        disabled={approvedTemplates.length === 0}
                      />
                    </div>
                    {automationSettings.invoiceReminder.enabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Vorlage</Label>
                          <TemplateSelect
                            value={automationSettings.invoiceReminder.templateId}
                            onChange={(v) => updateAutomationSetting('invoiceReminder', 'templateId', v)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tage nach Fälligkeit</Label>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={automationSettings.invoiceReminder.daysAfterDue}
                              onChange={(e) => updateAutomationSetting('invoiceReminder', 'daysAfterDue', parseInt(e.target.value) || 7)}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max. Erinnerungen</Label>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              value={automationSettings.invoiceReminder.maxReminders}
                              onChange={(e) => updateAutomationSetting('invoiceReminder', 'maxReminders', parseInt(e.target.value) || 3)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Termine */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Terminerinnerungen</CardTitle>
                        <CardDescription>Automatische Erinnerung vor Terminen</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={automationSettings.appointmentReminder.enabled}
                      onCheckedChange={(checked) => updateAutomationSetting('appointmentReminder', 'enabled', checked)}
                      disabled={approvedTemplates.length === 0}
                    />
                  </div>
                </CardHeader>
                {automationSettings.appointmentReminder.enabled && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vorlage</Label>
                        <TemplateSelect
                          value={automationSettings.appointmentReminder.templateId}
                          onChange={(v) => updateAutomationSetting('appointmentReminder', 'templateId', v)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stunden vorher</Label>
                        <Select
                          value={automationSettings.appointmentReminder.hoursBefore.toString()}
                          onValueChange={(v) => updateAutomationSetting('appointmentReminder', 'hoursBefore', parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Stunde</SelectItem>
                            <SelectItem value="2">2 Stunden</SelectItem>
                            <SelectItem value="4">4 Stunden</SelectItem>
                            <SelectItem value="12">12 Stunden</SelectItem>
                            <SelectItem value="24">24 Stunden</SelectItem>
                            <SelectItem value="48">48 Stunden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Angebote */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Angebotsbenachrichtigungen</CardTitle>
                      <CardDescription>Automatische Nachrichten zu Angeboten</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Angebot versendet */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Angebot versendet</span>
                      </div>
                      <Switch
                        checked={automationSettings.quoteSent.enabled}
                        onCheckedChange={(checked) => updateAutomationSetting('quoteSent', 'enabled', checked)}
                        disabled={approvedTemplates.length === 0}
                      />
                    </div>
                    {automationSettings.quoteSent.enabled && (
                      <div className="space-y-2">
                        <Label>Vorlage</Label>
                        <TemplateSelect
                          value={automationSettings.quoteSent.templateId}
                          onChange={(v) => updateAutomationSetting('quoteSent', 'templateId', v)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Angebot läuft ab */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Angebot läuft bald ab</span>
                      </div>
                      <Switch
                        checked={automationSettings.quoteExpiring.enabled}
                        onCheckedChange={(checked) => updateAutomationSetting('quoteExpiring', 'enabled', checked)}
                        disabled={approvedTemplates.length === 0}
                      />
                    </div>
                    {automationSettings.quoteExpiring.enabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Vorlage</Label>
                          <TemplateSelect
                            value={automationSettings.quoteExpiring.templateId}
                            onChange={(v) => updateAutomationSetting('quoteExpiring', 'templateId', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tage vor Ablauf</Label>
                          <Input
                            type="number"
                            min={1}
                            max={14}
                            value={automationSettings.quoteExpiring.daysBefore}
                            onChange={(e) => updateAutomationSetting('quoteExpiring', 'daysBefore', parseInt(e.target.value) || 3)}
                            className="w-24"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleTemplateCreated}
        companyId={uid}
      />
    </div>
  );
}
