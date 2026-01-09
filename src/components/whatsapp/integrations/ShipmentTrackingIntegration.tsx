'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, Settings, Check } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface ShipmentTrackingIntegrationProps {
  uid: string;
  contactPhone: string;
}

const SHIPPING_PROVIDERS = [
  { id: 'dhl', name: 'DHL', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'dpd', name: 'DPD', color: 'bg-red-100 text-red-700' },
  { id: 'ups', name: 'UPS', color: 'bg-amber-100 text-amber-700' },
  { id: 'hermes', name: 'Hermes', color: 'bg-blue-100 text-blue-700' },
  { id: 'gls', name: 'GLS', color: 'bg-green-100 text-green-700' },
];

export default function ShipmentTrackingIntegration({ 
  uid, 
  contactPhone: _contactPhone 
}: ShipmentTrackingIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [notifyOnShipped, setNotifyOnShipped] = useState(true);
  const [notifyOnDelivery, setNotifyOnDelivery] = useState(true);

  // Lade Einstellungen aus Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'shipmentTracking');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setIsEnabled(data.enabled || false);
          setSelectedProviders(data.providers || []);
          setNotifyOnShipped(data.notifyOnShipped ?? true);
          setNotifyOnDelivery(data.notifyOnDelivery ?? true);
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
      const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'shipmentTracking');
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

  const toggleProvider = async (providerId: string) => {
    const newProviders = selectedProviders.includes(providerId)
      ? selectedProviders.filter(p => p !== providerId)
      : [...selectedProviders, providerId];
    
    setSelectedProviders(newProviders);
    await saveSettings({ providers: newProviders });
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
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Sendungsverfolgung</h4>
            <p className="text-xs text-gray-500 mt-0.5">Versandstatus-Updates per WhatsApp</p>
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
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
          {/* Versandanbieter */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Versandanbieter:</label>
            <div className="flex flex-wrap gap-2">
              {SHIPPING_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => toggleProvider(provider.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                    selectedProviders.includes(provider.id)
                      ? `${provider.color} border-transparent`
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {selectedProviders.includes(provider.id) && <Check className="w-3 h-3" />}
                  {provider.name}
                </button>
              ))}
            </div>
          </div>

          {/* Benachrichtigungsoptionen */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 block">Benachrichtigen bei:</label>
            
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnShipped}
                onChange={(e) => {
                  setNotifyOnShipped(e.target.checked);
                  saveSettings({ notifyOnShipped: e.target.checked });
                }}
                className="w-4 h-4 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-gray-700">Versand (Paket unterwegs)</span>
            </label>
            
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnDelivery}
                onChange={(e) => {
                  setNotifyOnDelivery(e.target.checked);
                  saveSettings({ notifyOnDelivery: e.target.checked });
                }}
                className="w-4 h-4 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-gray-700">Zustellung (Paket geliefert)</span>
            </label>
          </div>
          
          <Link
            href={`/dashboard/company/${uid}/whatsapp/settings`}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            API-Verbindungen einrichten
          </Link>
        </div>
      )}
    </div>
  );
}
