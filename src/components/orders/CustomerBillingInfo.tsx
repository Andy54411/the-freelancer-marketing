'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, User, MapPin, FileText, Mail, Phone, Copy, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';

interface CustomerBillingInfoProps {
  customerId: string;
  orderId: string;
  orderStatus: string;
  className?: string;
}

interface BillingData {
  // Basis
  type: 'private' | 'business';
  name: string;
  email?: string;
  phone?: string;
  
  // Adresse
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  
  // Business
  companyName?: string;
  vatId?: string; // USt-IdNr
  taxNumber?: string; // Steuernummer
}

export default function CustomerBillingInfo({
  customerId,
  orderId,
  orderStatus,
  className = '',
}: CustomerBillingInfoProps) {
  const params = useParams();
  const router = useRouter();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Nur bei angenommenen/aktiven/abgeschlossenen Aufträgen anzeigen
  const showableStatuses = ['accepted', 'aktiv', 'active', 'completed', 'abgeschlossen', 'PROVIDER_COMPLETED', 'in_progress'];
  const shouldShow = showableStatuses.some(s => orderStatus.toLowerCase().includes(s.toLowerCase()));

  useEffect(() => {
    const loadBillingData = async () => {
      if (!customerId || !shouldShow) {
        setIsLoading(false);
        return;
      }

      try {
        // Lade Kundendaten - zuerst aus users, dann companies
        let userData: Record<string, unknown> | null = null;

        // Prüfe users collection
        const userDoc = await getDoc(doc(db, 'users', customerId));
        if (userDoc.exists()) {
          userData = userDoc.data();
        }

        // Falls nicht in users, prüfe companies (B2B Kunde)
        if (!userData) {
          const companyDoc = await getDoc(doc(db, 'companies', customerId));
          if (companyDoc.exists()) {
            userData = companyDoc.data();
          }
        }

        // Lade auch Auftragsdaten für kundentyp
        const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
        const orderData = orderDoc.exists() ? orderDoc.data() : null;

        if (userData) {
          const isBusinessCustomer = 
            orderData?.kundentyp === 'business' ||
            userData.user_type === 'firma' ||
            userData.type === 'business' ||
            !!userData.companyName;

          setBillingData({
            type: isBusinessCustomer ? 'business' : 'private',
            name: (userData.displayName as string) || 
                  (userData.name as string) || 
                  `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                  'Unbekannt',
            email: userData.email as string,
            phone: (userData.phone as string) || (userData.phoneNumber as string),
            
            // Adresse
            street: (userData.street as string) || (userData.address as string),
            postalCode: (userData.postalCode as string) || (userData.zip as string) || (userData.plz as string),
            city: (userData.city as string) || (userData.location as string) || (userData.ort as string),
            country: (userData.country as string) || 'Deutschland',
            
            // Business
            companyName: (userData.companyName as string) || (userData.firmenname as string),
            vatId: (userData.vatId as string) || (userData.ustIdNr as string) || (userData.ust_id as string),
            taxNumber: (userData.taxNumber as string) || (userData.steuernummer as string),
          });
        }
      } catch (err) {
        console.error('Fehler beim Laden der Kundendaten:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBillingData();
  }, [customerId, orderId, shouldShow]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // Prüfe ob alle notwendigen Daten vorhanden sind
  const hasRequiredData = billingData && 
    billingData.name && 
    billingData.street && 
    billingData.postalCode && 
    billingData.city;

  const _hasBusinessData = billingData?.type === 'business' && 
    (billingData.vatId || billingData.taxNumber);

  if (!shouldShow) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rechnungsdaten
          </h3>
        </div>
        <div className="p-4 flex justify-center">
          <div className="animate-pulse text-gray-400 text-sm">Lade...</div>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-[#14ad9f] to-[#0d8a7f] px-4 py-2.5">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Rechnungsdaten Kunde
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {/* Kundentyp Badge */}
        <div className="flex items-center gap-2">
          {billingData.type === 'business' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              <Building2 className="h-3 w-3" />
              Geschäftskunde
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              <User className="h-3 w-3" />
              Privatkunde
            </span>
          )}
        </div>

        {/* Warnung bei fehlenden Daten */}
        {!hasRequiredData && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Unvollständige Adressdaten. Bitte kontaktieren Sie den Kunden für die fehlenden Informationen.
              </p>
            </div>
          </div>
        )}

        {/* Name / Firma */}
        <div className="space-y-1">
          {billingData.companyName && (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{billingData.companyName}</span>
              </div>
              <button 
                onClick={() => copyToClipboard(billingData.companyName!, 'company')}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
              >
                {copied === 'company' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-gray-700">{billingData.name}</span>
            </div>
            <button 
              onClick={() => copyToClipboard(billingData.name, 'name')}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
            >
              {copied === 'name' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Adresse */}
        <div className="space-y-1">
          {billingData.street ? (
            <div className="flex items-start justify-between group">
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <div>{billingData.street}</div>
                  <div>{billingData.postalCode} {billingData.city}</div>
                  {billingData.country && billingData.country !== 'Deutschland' && (
                    <div>{billingData.country}</div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => copyToClipboard(`${billingData.street}\n${billingData.postalCode} ${billingData.city}`, 'address')}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
              >
                {copied === 'address' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <MapPin className="h-3.5 w-3.5" />
              <span>Keine Adresse hinterlegt</span>
            </div>
          )}
        </div>

        {/* Kontakt */}
        {(billingData.email || billingData.phone) && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {billingData.email && (
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`mailto:${billingData.email}`} className="text-sm text-[#14ad9f] hover:underline">
                    {billingData.email}
                  </a>
                </div>
                <button 
                  onClick={() => copyToClipboard(billingData.email!, 'email')}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                >
                  {copied === 'email' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                </button>
              </div>
            )}
            {billingData.phone && (
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`tel:${billingData.phone}`} className="text-sm text-gray-700 hover:text-[#14ad9f]">
                    {billingData.phone}
                  </a>
                </div>
                <button 
                  onClick={() => copyToClipboard(billingData.phone!, 'phone')}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                >
                  {copied === 'phone' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Steuerdaten (nur bei Geschäftskunden) */}
        {billingData.type === 'business' && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {billingData.vatId ? (
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">USt-IdNr:</span>
                  <span className="text-sm font-mono text-gray-700">{billingData.vatId}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(billingData.vatId!, 'vat')}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                >
                  {copied === 'vat' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                </button>
              </div>
            ) : billingData.taxNumber ? (
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">St-Nr:</span>
                  <span className="text-sm font-mono text-gray-700">{billingData.taxNumber}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(billingData.taxNumber!, 'tax')}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                >
                  {copied === 'tax' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Keine Steuerdaten hinterlegt</span>
              </div>
            )}
          </div>
        )}

        {/* Alles kopieren Button */}
        {hasRequiredData && (
          <div className="pt-2">
            <button
              onClick={() => {
                const fullAddress = [
                  billingData.companyName,
                  billingData.name,
                  billingData.street,
                  `${billingData.postalCode} ${billingData.city}`,
                  billingData.vatId ? `USt-IdNr: ${billingData.vatId}` : null,
                  billingData.taxNumber ? `Steuernummer: ${billingData.taxNumber}` : null,
                ].filter(Boolean).join('\n');
                copyToClipboard(fullAddress, 'all');
              }}
              className="w-full text-center text-xs text-[#14ad9f] hover:bg-[#14ad9f]/10 py-1.5 rounded transition-colors"
            >
              {copied === 'all' ? 'Kopiert!' : 'Alle Daten kopieren'}
            </button>
          </div>
        )}

        {/* Als Kunde anlegen Button */}
        <div className="pt-2 border-t border-gray-100 mt-2">
          <button
            onClick={() => {
              // Query-Parameter für die Kontakt-Erstellungsseite
              const queryParams = new URLSearchParams();
              queryParams.set('type', billingData.type === 'business' ? 'organisation' : 'person');
              if (billingData.name) queryParams.set('name', billingData.name);
              if (billingData.companyName) queryParams.set('companyName', billingData.companyName);
              if (billingData.email) queryParams.set('email', billingData.email);
              if (billingData.phone) queryParams.set('phone', billingData.phone);
              if (billingData.street) queryParams.set('street', billingData.street);
              if (billingData.postalCode) queryParams.set('postalCode', billingData.postalCode);
              if (billingData.city) queryParams.set('city', billingData.city);
              if (billingData.country) queryParams.set('country', billingData.country);
              if (billingData.vatId) queryParams.set('vatId', billingData.vatId);
              if (billingData.taxNumber) queryParams.set('taxNumber', billingData.taxNumber);
              queryParams.set('orderId', orderId);

              // Navigiere zur Kontakt-Erstellungsseite
              const companyId = params.uid as string;
              router.push(`/dashboard/company/${companyId}/finance/contacts/new?${queryParams.toString()}`);
            }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-[#14ad9f] hover:bg-[#0d8a7f] py-2 px-3 rounded-lg transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Als Kunde anlegen
          </button>
        </div>
      </div>
    </div>
  );
}
