'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, FileText } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface OrderConfirmationIntegrationProps {
  uid: string;
  contactPhone: string;
}

export default function OrderConfirmationIntegration({ 
  uid, 
  contactPhone: _contactPhone 
}: OrderConfirmationIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Lade Einstellungen aus Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'orderConfirmation');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setIsEnabled(data.enabled || false);
          setSelectedTemplate(data.templateId || '');
        }
      } catch {
        // Fehler ignorieren - Standardwerte verwenden
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [uid]);

  // Speichere Einstellungen
  const handleToggle = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);

    try {
      const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'orderConfirmation');
      await setDoc(settingsRef, {
        enabled: newValue,
        templateId: selectedTemplate,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // Fehler - Wert zurücksetzen
      setIsEnabled(!newValue);
    }
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
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Auftragsbestätigungen</h4>
            <p className="text-xs text-gray-500 mt-0.5">Automatische Bestätigung nach Bestellung</p>
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
          <div className="text-xs">
            <label className="text-gray-500 block mb-1">Vorlage auswählen:</label>
            <select 
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
            >
              <option value="">Vorlage wählen...</option>
              <option value="order_confirmation_default">Standard Auftragsbestätigung</option>
              <option value="order_confirmation_detailed">Detaillierte Bestätigung</option>
            </select>
          </div>
          
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
