/**
 * WhatsApp Contacts Page
 * 
 * Verwaltung von WhatsApp-Kontakten mit Integration in Kundendatenbank
 */
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Users, Search, Plus, Download, Upload, X, Phone, Mail, User } from 'lucide-react';
import { ContactList, type Contact } from '@/components/whatsapp/contacts/ContactList';
import { ContactCard } from '@/components/whatsapp/contacts/ContactCard';
import { toast } from 'sonner';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export default function ContactsPage() {
  const params = useParams();
  const companyId = params.uid as string;

  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'whatsapp' | 'customers'>('all');
  
  // Neuer Kontakt Modal
  const [showNewContactModal, setShowNewContactModal] = React.useState(false);
  const [newContactData, setNewContactData] = React.useState({ name: '', phone: '', email: '' });
  const [isSavingContact, setIsSavingContact] = React.useState(false);

  // Kontakte laden (aus WhatsApp-Nachrichten und Kundendatenbank)
  const loadContacts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // WhatsApp-Nachrichten für Kontakte laden
      const messagesRef = collection(db, 'companies', companyId, 'whatsappMessages');
      const messagesSnap = await getDocs(messagesRef);
      
      // Einzigartige Kontakte aus Nachrichten extrahieren
      const contactMap = new Map<string, Contact>();
      
      messagesSnap.docs.forEach(doc => {
        const data = doc.data();
        const phone = data.customerPhone?.replace(/\D/g, '');
        if (phone && !contactMap.has(phone)) {
          contactMap.set(phone, {
            id: phone,
            name: data.customerName,
            phone: data.customerPhone,
            avatar: data.profilePictureUrl,
            tags: [],
            lastMessage: data.createdAt?.toDate?.() 
              ? data.createdAt.toDate().toISOString() 
              : new Date().toISOString(),
            isBlocked: false,
          });
        }
      });

      // Auch Kunden mit WhatsApp-Nummer laden
      try {
        const customersRef = collection(db, 'companies', companyId, 'customers');
        const customersSnap = await getDocs(customersRef);
        
        customersSnap.docs.forEach(doc => {
          const data = doc.data();
          const phone = data.phone?.replace(/\D/g, '') || data.mobile?.replace(/\D/g, '');
          if (phone && !contactMap.has(phone)) {
            contactMap.set(phone, {
              id: doc.id,
              name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              phone: data.phone || data.mobile,
              email: data.email,
              company: data.company,
              tags: ['Kunde'],
              isBlocked: false,
            });
          } else if (phone && contactMap.has(phone)) {
            // Kontakt mit Kundendaten anreichern
            const existing = contactMap.get(phone)!;
            contactMap.set(phone, {
              ...existing,
              name: data.name || existing.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              email: data.email || existing.email,
              company: data.company || existing.company,
              tags: [...(existing.tags || []), 'Kunde'].filter((v, i, a) => a.indexOf(v) === i),
            });
          }
        });
      } catch {
        // Kunden-Collection existiert möglicherweise nicht
      }

      const contactArray = Array.from(contactMap.values());
      
      // Nach Name sortieren
      contactArray.sort((a, b) => {
        const nameA = a.name || a.phone || '';
        const nameB = b.name || b.phone || '';
        return nameA.localeCompare(nameB, 'de');
      });

      setContacts(contactArray);
    } catch {
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Gefilterte Kontakte
  const filteredContacts = React.useMemo(() => {
    let result = contacts;

    // Suche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }

    // Filter
    if (filterType === 'whatsapp') {
      result = result.filter(c => c.lastMessage);
    } else if (filterType === 'customers') {
      result = result.filter(c => c.tags?.includes('Kunde'));
    }

    return result;
  }, [contacts, searchQuery, filterType]);

  // WhatsApp-Chat öffnen
  const handleStartChat = (contact: Contact) => {
    window.location.href = `/dashboard/company/${companyId}/whatsapp?phone=${encodeURIComponent(contact.phone || '')}`;
  };

  // Anruf starten (nur auf Mobilgeräten)
  const handleCall = (contact: Contact) => {
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
    }
  };

  // Kontakt bearbeiten
  const handleEdit = (_contact: Contact) => {
    toast.info('Kontakt bearbeiten wird implementiert');
  };

  // Neuen Kontakt erstellen
  const handleCreateContact = async () => {
    if (!newContactData.phone) {
      toast.error('Telefonnummer ist erforderlich');
      return;
    }

    setIsSavingContact(true);
    try {
      const response = await fetch('/api/whatsapp/chat/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          phone: newContactData.phone,
          name: newContactData.name,
          email: newContactData.email,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Kontakt erstellt');
        setShowNewContactModal(false);
        setNewContactData({ name: '', phone: '', email: '' });
        loadContacts();
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error('Fehler beim Erstellen des Kontakts');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Kontakt blockieren/entblockieren
  const handleBlock = async (contact: Contact) => {
    try {
      const action = contact.isBlocked ? 'unblock' : 'block';
      const response = await fetch('/api/whatsapp/contact/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, phone: contact.phone, action }),
      });
      
      if (response.ok) {
        toast.success(contact.isBlocked ? 'Kontakt entsperrt' : 'Kontakt blockiert');
        setContacts(contacts.map(c => 
          c.id === contact.id ? { ...c, isBlocked: !c.isBlocked } : c
        ));
        if (selectedContact?.id === contact.id) {
          setSelectedContact({ ...selectedContact, isBlocked: !selectedContact.isBlocked });
        }
      }
    } catch {
      toast.error('Fehler beim Blockieren');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-[#25D366] mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Kontakte werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Linke Seite: Kontaktliste */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Kontakte</h1>
            <button 
              onClick={() => setShowNewContactModal(true)}
              className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg"
              title="Neuer Kontakt"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kontakte durchsuchen..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filterType === 'all' 
                  ? 'bg-[#25D366] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Alle ({contacts.length})
            </button>
            <button
              onClick={() => setFilterType('whatsapp')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filterType === 'whatsapp' 
                  ? 'bg-[#25D366] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setFilterType('customers')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filterType === 'customers' 
                  ? 'bg-[#25D366] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Kunden
            </button>
          </div>
        </div>

        {/* Kontaktliste */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Keine Kontakte gefunden</p>
            </div>
          ) : (
            <ContactList
              contacts={filteredContacts}
              selectedId={selectedContact?.id}
              onSelect={setSelectedContact}
              variant="compact"
            />
          )}
        </div>

        {/* Footer mit Aktionen */}
        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Rechte Seite: Kontakt-Details */}
      <div className="flex-1 flex items-center justify-center">
        {selectedContact ? (
          <div className="max-w-md w-full p-6">
            <ContactCard
              contact={selectedContact}
              onMessage={handleStartChat}
              onCall={handleCall}
              onEdit={handleEdit}
              onBlock={handleBlock}
              variant="full"
            />
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Kontakt auswählen</h2>
            <p className="text-gray-500 max-w-xs mx-auto">
              Wähle einen Kontakt aus der Liste um Details anzuzeigen und Aktionen auszuführen.
            </p>
          </div>
        )}
      </div>

      {/* Neuer Kontakt Modal */}
      {showNewContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Neuer Kontakt</h2>
              <button
                onClick={() => {
                  setShowNewContactModal(false);
                  setNewContactData({ name: '', phone: '', email: '' });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newContactData.name}
                    onChange={(e) => setNewContactData({ ...newContactData, name: e.target.value })}
                    placeholder="Max Mustermann"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366]"
                  />
                </div>
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefonnummer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={newContactData.phone}
                    onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                    placeholder="+49 123 456789"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366]"
                    required
                  />
                </div>
              </div>

              {/* E-Mail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={newContactData.email}
                    onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                    placeholder="max@beispiel.de"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366]"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNewContactModal(false);
                  setNewContactData({ name: '', phone: '', email: '' });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateContact}
                disabled={isSavingContact || !newContactData.phone}
                className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingContact && <Loader2 className="w-4 h-4 animate-spin" />}
                Kontakt erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
