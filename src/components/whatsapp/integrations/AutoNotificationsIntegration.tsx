'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, FileText, Plus, Trash2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface AutoNotificationsIntegrationProps {
  uid: string;
  contactPhone: string;
}

interface NotificationRule {
  id: string;
  trigger: string;
  templateId: string;
  isActive: boolean;
}

const TRIGGER_OPTIONS = [
  { value: 'invoice_created', label: 'Rechnung erstellt' },
  { value: 'invoice_paid', label: 'Rechnung bezahlt' },
  { value: 'invoice_overdue', label: 'Rechnung überfällig' },
  { value: 'quote_sent', label: 'Angebot gesendet' },
  { value: 'quote_accepted', label: 'Angebot angenommen' },
  { value: 'customer_created', label: 'Neuer Kunde angelegt' },
  { value: 'birthday', label: 'Geburtstag des Kunden' },
  { value: 'inactivity_30', label: '30 Tage Inaktivität' },
  { value: 'inactivity_90', label: '90 Tage Inaktivität' },
];

export default function AutoNotificationsIntegration({ 
  uid, 
  contactPhone: _contactPhone 
}: AutoNotificationsIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newTrigger, setNewTrigger] = useState('');
  const [newTemplate, setNewTemplate] = useState('');

  // Lade Einstellungen aus Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'autoNotifications');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setIsEnabled(data.enabled || false);
          setRules(data.rules || []);
        }
      } catch {
        // Fehler ignorieren
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [uid]);

  // Speichere Einstellungen
  const saveSettings = async (updates: Record<string, unknown>) => {
    try {
      const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'autoNotifications');
      await setDoc(settingsRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // Fehler ignorieren
    }
  };

  const handleToggle = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    await saveSettings({ enabled: newValue });
  };

  const addRule = async () => {
    if (!newTrigger || !newTemplate) return;

    const newRule: NotificationRule = {
      id: `rule_${Date.now()}`,
      trigger: newTrigger,
      templateId: newTemplate,
      isActive: true,
    };

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    await saveSettings({ rules: updatedRules });
    
    setNewTrigger('');
    setNewTemplate('');
    setShowAddRule(false);
  };

  const removeRule = async (ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    await saveSettings({ rules: updatedRules });
  };

  const toggleRule = async (ruleId: string) => {
    const updatedRules = rules.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    );
    setRules(updatedRules);
    await saveSettings({ rules: updatedRules });
  };

  const getTriggerLabel = (value: string) => {
    return TRIGGER_OPTIONS.find(t => t.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Automatische Benachrichtigungen</h4>
            <p className="text-xs text-gray-500 mt-0.5">Benutzerdefinierte Auto-Nachrichten</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-[#14ad9f]' : 'bg-gray-300'
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            isEnabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {isEnabled && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* Bestehende Regeln */}
          {rules.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">Aktive Regeln:</label>
              {rules.map((rule) => (
                <div 
                  key={rule.id} 
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    rule.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`w-4 h-4 rounded border ${
                        rule.isActive 
                          ? 'bg-[#14ad9f] border-[#14ad9f]' 
                          : 'bg-white border-gray-300'
                      } flex items-center justify-center`}
                    >
                      {rule.isActive && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <span className="text-xs text-gray-700">{getTriggerLabel(rule.trigger)}</span>
                  </div>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1 hover:bg-red-100 rounded text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Neue Regel hinzufügen */}
          {showAddRule ? (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Auslöser:</label>
                <select 
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                >
                  <option value="">Auslöser wählen...</option>
                  {TRIGGER_OPTIONS.map((trigger) => (
                    <option key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 block mb-1">Vorlage:</label>
                <select 
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                >
                  <option value="">Vorlage wählen...</option>
                  <option value="template_notification">Standard Benachrichtigung</option>
                  <option value="template_reminder">Erinnerung</option>
                  <option value="template_thank_you">Dankesnachricht</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={addRule}
                  disabled={!newTrigger || !newTemplate}
                  className="flex-1 text-xs bg-[#14ad9f] text-white px-3 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hinzufügen
                </button>
                <button
                  onClick={() => {
                    setShowAddRule(false);
                    setNewTrigger('');
                    setNewTemplate('');
                  }}
                  className="text-xs text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRule(true)}
              className="w-full text-xs text-gray-600 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-[#14ad9f] hover:text-[#14ad9f] flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Neue Regel hinzufügen
            </button>
          )}
          
          <Link
            href={`/dashboard/company/${uid}/whatsapp/templates`}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            Vorlagen verwalten
          </Link>
        </div>
      )}
    </div>
  );
}
