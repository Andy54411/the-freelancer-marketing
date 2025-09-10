'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Mail, Phone, MapPin, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ContactData {
  type: string;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  contactPerson: string;
  uid: string;
}

interface ContactExchangeData {
  status: 'completed';
  completedAt: string;
  contactsExchanged: boolean;
  customerContact?: ContactData;
  providerContact?: ContactData;
  exchangeReason?: string;
}

interface ContactExchangeDisplayProps {
  contactExchange?: ContactExchangeData | null;
  currentUserUid: string;
  customerUid?: string;
  providerUid?: string;
  status?: string;
  provisionPaid?: boolean; // 🎯 NEU: Provisionsstatus prüfen
}

export function ContactExchangeDisplay({
  contactExchange,
  currentUserUid,
  customerUid,
  providerUid,
  status,
  provisionPaid = false, // 🎯 Standard: false
}: ContactExchangeDisplayProps) {
  const { firebaseUser } = useAuth();
  const [contactsFromCompanies, setContactsFromCompanies] = useState<{
    customerContact?: ContactData;
    providerContact?: ContactData;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Hilfsfunktion für hybride UID-Erkennung
  const loadUserOrCompanyData = async (uid: string, _token: string) => {
    try {
      console.log(`🔄 ContactExchangeDisplay: Loading data for UID ${uid}`);

      // Direkte Firebase-Zugriffe verwenden, da API-Endpoints nicht zuverlässig sind
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      // Versuche zuerst Company Collection
      try {
        const companyDocRef = doc(db, 'companies', uid);
        const companyDoc = await getDoc(companyDocRef);

        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          console.log(`✅ Found company data for UID ${uid}`);
          return {
            company: {
              companyName: companyData.companyName || 'Unbekanntes Unternehmen',
              name: companyData.companyName || companyData.name || 'Unbekanntes Unternehmen',
              email: companyData.email || companyData.contactEmail || '',
              phone: companyData.phone || companyData.contactPhone || null,
              address: companyData.address || companyData.companyAddress || '',
              city: companyData.city || companyData.companyCity || '',
              contactPerson:
                companyData.contactPerson || companyData.companyContactPerson || 'Nicht angegeben',
            },
            source: 'company',
          };
        }
      } catch (companyError) {
        console.log(`⚠️ Company lookup failed for ${uid}:`, companyError);
      }

      // Fallback: Versuche Users Collection
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`✅ Found user data for UID ${uid}`);
          return {
            company: {
              companyName:
                userData.displayName ||
                userData.name ||
                userData.firstName + ' ' + userData.lastName ||
                'Privatkunde',
              name:
                userData.displayName ||
                userData.name ||
                userData.firstName + ' ' + userData.lastName ||
                'Privatkunde',
              email: userData.email || '',
              phone: userData.phoneNumber || userData.phone || null,
              address: userData.address || '',
              city: userData.city || '',
              contactPerson:
                userData.displayName ||
                userData.name ||
                userData.firstName + ' ' + userData.lastName ||
                'Nicht angegeben',
            },
            source: 'user',
          };
        }
      } catch (userError) {
        console.log(`⚠️ User lookup failed for ${uid}:`, userError);
      }

      console.log(`❌ No data found for UID ${uid} in either companies or users`);
      return null;
    } catch (error) {
      console.error(`❌ Error loading data for UID ${uid}:`, error);
      return null;
    }
  };

  // Lade Kontaktdaten aus Companies Collection wenn nicht vorhanden
  useEffect(() => {
    async function loadContactsFromCompanies() {
      if (contactExchange?.customerContact && contactExchange?.providerContact) {
        console.log('✅ ContactExchangeDisplay: Kontakte bereits vorhanden');
        return; // Kontakte bereits vorhanden
      }

      if (!customerUid || !providerUid) {
        console.log('❌ ContactExchangeDisplay: Missing UIDs', {
          customerUid,
          providerUid,
          status,
        });
        return; // Benötigte UIDs fehlen
      }

      // Akzeptiere verschiedene Status-Varianten für Kontaktaustausch
      const isContactExchangeStatus =
        status === 'contacts_exchanged' ||
        status === 'paid' ||
        (contactExchange && contactExchange.status === 'completed');

      if (!isContactExchangeStatus) {
        console.log('❌ ContactExchangeDisplay: Status not suitable for contact exchange', {
          status,
          contactExchange,
        });
        return; // Status nicht geeignet
      }

      if (!firebaseUser) {
        console.log('❌ ContactExchangeDisplay: No firebase user');
        return;
      }

      console.log('🔄 ContactExchangeDisplay: Loading company contacts', {
        customerUid,
        providerUid,
        status,
        currentUser: currentUserUid,
      });

      setLoading(true);
      try {
        const token = await firebaseUser.getIdToken();
        console.log('🔑 Token obtained, starting data load...');

        // Intelligente Datenabfrage für hybrides System
        console.log('📞 Loading customer data for UID:', customerUid);
        const customerData = await loadUserOrCompanyData(customerUid, token);
        console.log('📞 Loading provider data for UID:', providerUid);
        const providerData = await loadUserOrCompanyData(providerUid, token);

        console.log('📦 Company data loaded:', {
          customerData: !!customerData?.company,
          customerSource: customerData?.source,
          providerData: !!providerData?.company,
          providerSource: providerData?.source,
        });

        if (customerData?.company && providerData?.company) {
          setContactsFromCompanies({
            customerContact: {
              type: 'company',
              name: customerData.company.companyName || customerData.company.name || 'Kunde',
              email: customerData.company.email || '',
              phone: customerData.company.phone || null,
              address:
                `${customerData.company.address || ''}, ${customerData.company.city || ''}`
                  .trim()
                  .replace(/^,\s*/, '')
                  .replace(/,\s*$/, '') || 'Adresse nicht verfügbar',
              contactPerson: customerData.company.contactPerson || 'Nicht angegeben',
              uid: customerUid,
            },
            providerContact: {
              type: 'company',
              name: providerData.company.companyName || providerData.company.name || 'Anbieter',
              email: providerData.company.email || '',
              phone: providerData.company.phone || null,
              address:
                `${providerData.company.address || ''}, ${providerData.company.city || ''}`
                  .trim()
                  .replace(/^,\s*/, '')
                  .replace(/,\s*$/, '') || 'Adresse nicht verfügbar',
              contactPerson: providerData.company.contactPerson || 'Nicht angegeben',
              uid: providerUid,
            },
          });
          console.log('✅ ContactExchangeDisplay: Company contacts loaded successfully');
        } else {
          console.log('❌ ContactExchangeDisplay: Failed to load company data');
        }
      } catch (error) {
        console.error(
          '❌ ContactExchangeDisplay: Fehler beim Laden der Company-Kontaktdaten:',
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadContactsFromCompanies();
  }, [contactExchange, customerUid, providerUid, status, firebaseUser]);

  // Verwende entweder contactExchange Daten oder geladene Company-Daten
  // Aber nur wenn contactExchange auch wirklich Kontaktdaten hat
  const hasValidContactExchange =
    contactExchange && (contactExchange.customerContact || contactExchange.providerContact);

  const effectiveContacts = hasValidContactExchange ? contactExchange : contactsFromCompanies;

  // Debug: Zeige effectiveContacts
  console.log('🔍 ContactExchangeDisplay: effectiveContacts', effectiveContacts);
  console.log('🔍 ContactExchangeDisplay: hasValidContactExchange', hasValidContactExchange);
  console.log('🔍 ContactExchangeDisplay: contactExchange', contactExchange);
  console.log('🔍 ContactExchangeDisplay: contactsFromCompanies', contactsFromCompanies);

  // Zeige Loading wenn Status geeignet ist aber noch keine Daten da sind
  if (!effectiveContacts && (status === 'contacts_exchanged' || status === 'paid')) {
    if (loading) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 text-green-600 animate-spin" />
            <span className="text-green-700">Lade Kontaktdaten...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Kontaktdaten ausgetauscht</h3>
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            Abgeschlossen
          </Badge>
        </div>
        <p className="text-green-700">
          Die Zahlung war erfolgreich! Die Kontaktdaten werden geladen...
        </p>
      </div>
    );
  }

  if (
    !effectiveContacts ||
    (!effectiveContacts.customerContact && !effectiveContacts.providerContact)
  ) {
    console.log('❌ ContactExchangeDisplay: Returning null because:', {
      hasEffectiveContacts: !!effectiveContacts,
      hasCustomerContact: !!effectiveContacts?.customerContact,
      hasProviderContact: !!effectiveContacts?.providerContact,
      effectiveContacts,
    });
    return null;
  }

  const { customerContact, providerContact } = effectiveContacts;
  const isCustomer = currentUserUid === customerContact?.uid;
  const otherContact = isCustomer ? providerContact : customerContact;
  const myContact = isCustomer ? customerContact : providerContact;

  // Debug: Zeige aktuellen Status
  console.log('🔍 ContactExchangeDisplay: Current status for order notice:', status);

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <h3 className="text-lg font-semibold text-green-800">Kontaktdaten ausgetauscht</h3>
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
          Abgeschlossen
        </Badge>
      </div>

      <p className="text-green-700 mb-6">
        Die Zahlung war erfolgreich! Die Kontaktdaten wurden automatisch zwischen beiden Parteien
        ausgetauscht.
      </p>

      {/* Hinweis zur Auftragserstellung - nur bei akzeptierten/bezahlten Aufträgen */}
      {(status === 'paid' || status === 'accepted' || status === 'contacts_exchanged') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Auftrag wurde erstellt</h4>
              <p className="text-sm text-gray-600">
                Ein neuer Auftrag wurde automatisch erstellt. Die weitere Bearbeitung und
                Kommunikation findet nun im Auftragsbereich statt. Sie finden den Auftrag in Ihrem
                Dashboard unter &quot;Aufträge&quot;.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Andere Partei */}
        {otherContact && (
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              {isCustomer ? 'Anbieter Kontakt' : 'Kunden Kontakt'}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{otherContact.name}</span>
              </div>

              {/* 🎯 EMAIL: Nur anzeigen wenn Provision bezahlt */}
              {otherContact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  {provisionPaid ? (
                    <a
                      href={`mailto:${otherContact.email}`}
                      className="text-[#14ad9f] hover:text-[#129488] hover:underline"
                    >
                      {otherContact.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">
                      ●●●●●@●●●●●.●●● (Erst nach Provisionszahlung verfügbar)
                    </span>
                  )}
                </div>
              )}

              {/* 🎯 TELEFON: Nur anzeigen wenn Provision bezahlt */}
              {otherContact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  {provisionPaid ? (
                    <a
                      href={`tel:${otherContact.phone}`}
                      className="text-[#14ad9f] hover:text-[#129488] hover:underline"
                    >
                      {otherContact.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">
                      +●● ●●● ●●●●●●● (Erst nach Provisionszahlung verfügbar)
                    </span>
                  )}
                </div>
              )}

              {/* 🎯 ADRESSE: Nur anzeigen wenn Provision bezahlt */}
              {otherContact.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  {provisionPaid ? (
                    <span className="text-gray-700">{otherContact.address}</span>
                  ) : (
                    <span className="text-gray-400">
                      Adresse nicht verfügbar (Erst nach Provisionszahlung)
                    </span>
                  )}
                </div>
              )}

              {otherContact.contactPerson && otherContact.contactPerson !== 'Nicht angegeben' && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Ansprechpartner: {provisionPaid ? otherContact.contactPerson : '●●●●●●●●'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meine Kontaktdaten */}
        {myContact && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              Ihre Kontaktdaten
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{myContact.name}</span>
              </div>
              {myContact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{myContact.email}</span>
                </div>
              )}
              {myContact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{myContact.phone}</span>
                </div>
              )}
              {myContact.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{myContact.address}</span>
                </div>
              )}
              {myContact.contactPerson && myContact.contactPerson !== 'Nicht angegeben' && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Ansprechpartner: {myContact.contactPerson}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-green-600">
        {contactExchange?.completedAt
          ? `Kontakte ausgetauscht am: ${new Date(contactExchange.completedAt).toLocaleString('de-DE')}`
          : 'Kontakte wurden automatisch ausgetauscht'}
      </div>
    </div>
  );
}
