'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, ChevronDown, RefreshCw, Users, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface PartnerSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userPassword: string;
  onInviteSent: (partner: Contact, startDate: string | null) => void;
}

type ModalStep = 'settings' | 'partner' | 'confirm';

export function PartnerSharingModal({
  isOpen,
  onClose,
  userEmail,
  userPassword,
  onInviteSent,
}: PartnerSharingModalProps) {
  const { isDark } = useWebmailTheme();
  const [step, setStep] = useState<ModalStep>('settings');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [includeAllPhotos, setIncludeAllPhotos] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<Contact | null>(null);
  const [sending, setSending] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Formatiere Datum für Anzeige
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' (GMT+1)';
  };

  // Kontakte laden
  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      if (!userEmail || !userPassword) {
        return;
      }

      const response = await fetch('/api/webmail/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail,
          password: userPassword,
          limit: 100,
          source: 'all',
        }),
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.contacts) {
          const mappedContacts = data.contacts.map((c: { id?: string; uid?: string; name?: string; displayName?: string; emails?: Array<{ value: string }>; email?: string; avatar?: string }) => ({
            id: c.id || c.uid || Math.random().toString(),
            name: c.name || c.displayName || c.emails?.[0]?.value?.split('@')[0] || 'Unbekannt',
            email: c.emails?.[0]?.value || c.email || '',
            avatar: c.avatar,
          })).filter((c: Contact) => c.email);
          
          setContacts(mappedContacts);
        }
      }
    } catch {
      // Fehler ignorieren
    } finally {
      setLoadingContacts(false);
    }
  }, [userEmail, userPassword]);

  useEffect(() => {
    if (isOpen && step === 'partner' && contacts.length === 0) {
      loadContacts();
    }
  }, [isOpen, step, contacts.length, loadContacts]);

  // Reset bei Schließen
  useEffect(() => {
    if (!isOpen) {
      setStep('settings');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setIncludeAllPhotos(true);
      setSearchQuery('');
      setSelectedPartner(null);
      setDateDropdownOpen(false);
    }
  }, [isOpen]);

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (name: string, email: string) => {
    return (name?.charAt(0) || email?.charAt(0) || 'U').toUpperCase();
  };

  const getAvatarColor = (str: string) => {
    const colors = [
      'bg-teal-600',
      'bg-blue-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-orange-600',
      'bg-green-600',
      'bg-indigo-600',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const [sendError, setSendError] = useState<string | null>(null);

  const handleSendInvite = async () => {
    if (!selectedPartner) return;
    
    setSending(true);
    setSendError(null);
    
    try {
      const response = await fetch('/api/photos/partner-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: userEmail,
          senderName: userEmail.split('@')[0],
          partnerEmail: selectedPartner.email,
          partnerName: selectedPartner.name,
          startDate: selectedDate,
          includeAllPhotos,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSendError(data.error || 'Einladung konnte nicht gesendet werden');
        return;
      }
      
      onInviteSent(selectedPartner, selectedDate);
      onClose();
    } catch {
      setSendError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl flex flex-col",
          isDark ? "bg-[#2d2e30]" : "bg-white"
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-full transition-colors z-10",
            isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
          )}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content - Scrollable */}
        <div className="px-8 py-8 overflow-y-auto">
          {/* Settings Step - Hauptseite wie im Screenshot */}
          {step === 'settings' && (
            <div className="text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-teal-50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
              
              {/* Mit Partner teilen Label */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <RefreshCw className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-600")} />
                <span className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                  Mit Partner teilen
                </span>
              </div>
              
              {/* Titel */}
              <h2 className={cn("text-2xl font-normal mb-3", isDark ? "text-white" : "text-gray-900")}>
                Fotos mit deinem Lieblingsmenschen teilen
              </h2>
              
              {/* Beschreibung */}
              <p className={cn("text-sm mb-8 max-w-md mx-auto", isDark ? "text-gray-400" : "text-gray-600")}>
                Du kannst einrichten, dass deine Fotos automatisch mit jemand anderem geteilt werden. 
                Dabei kannst du wählen, ob du nur Bilder von bestimmten Personen oder alle deine Fotos teilen möchtest.{' '}
                <a href="#" className="text-teal-600 hover:underline">Weitere Informationen</a>
              </p>
              
              {/* Startdatum auswählen */}
              <div className="text-left mb-6">
                <h3 className={cn("text-sm font-bold mb-1", isDark ? "text-gray-200" : "text-gray-900")}>
                  Startdatum auswählen
                </h3>
                <p className={cn("text-sm mb-3", isDark ? "text-gray-400" : "text-gray-500")}>
                  Nur Fotos ab diesem Tag anzeigen
                </p>
                
                {/* Date Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg border-b-2 text-left transition-colors",
                      isDark 
                        ? "bg-[#3c4043] border-gray-500 text-gray-200 hover:bg-[#45474a]" 
                        : "bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200"
                    )}
                  >
                    <span>{formatDateDisplay(selectedDate)}</span>
                    <ChevronDown className={cn("w-5 h-5 transition-transform", dateDropdownOpen && "rotate-180")} />
                  </button>
                  
                  {dateDropdownOpen && (
                    <div className={cn(
                      "absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-10 p-2",
                      isDark ? "bg-[#3c4043] border-gray-600" : "bg-white border-gray-200"
                    )}>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setDateDropdownOpen(false);
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        className={cn(
                          "w-full px-3 py-2 rounded border-0 focus:outline-none focus:ring-2 focus:ring-teal-500",
                          isDark 
                            ? "bg-[#2d2e30] text-gray-200" 
                            : "bg-gray-50 text-gray-900"
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Einzuschließende Fotos auswählen */}
              <div className="text-left mb-8">
                <h3 className={cn("text-sm font-bold mb-3", isDark ? "text-gray-200" : "text-gray-900")}>
                  Einzuschließende Fotos auswählen
                </h3>
                
                {/* Alle Fotos Checkbox */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                    Alle Fotos
                  </span>
                  <button
                    onClick={() => setIncludeAllPhotos(!includeAllPhotos)}
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center transition-colors",
                      includeAllPhotos
                        ? "bg-teal-600 text-white"
                        : (isDark ? "border-2 border-gray-500" : "border-2 border-gray-300")
                    )}
                  >
                    {includeAllPhotos && <Check className="w-4 h-4" />}
                  </button>
                </label>
              </div>
              
              {/* Weiter Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setStep('partner')}
                  className="px-8 py-2.5 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}

          {/* Partner Selection Step */}
          {step === 'partner' && (
            <div>
              {/* Header */}
              <div className="mb-4">
                <h2 className={cn("text-xl font-medium", isDark ? "text-white" : "text-gray-900")}>
                  Partner auswählen
                </h2>
                <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
                  Dein Partner kann auch Fotos mit dir teilen
                </p>
              </div>

              {/* Selected Partner Chip */}
              {selectedPartner && (
                <div className="mb-4">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border",
                    isDark ? "bg-[#3c4043] border-gray-600" : "bg-gray-100 border-gray-300"
                  )}>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
                      getAvatarColor(selectedPartner.email)
                    )}>
                      {getInitial(selectedPartner.name, selectedPartner.email)}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-gray-200" : "text-gray-900")}>
                      {selectedPartner.email}
                    </span>
                    <button
                      onClick={() => setSelectedPartner(null)}
                      className={cn(
                        "p-0.5 rounded-full transition-colors",
                        isDark ? "hover:bg-white/20 text-gray-400" : "hover:bg-gray-200 text-gray-500"
                      )}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Nach Name oder E-Mail-Adresse suchen"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full px-0 py-3 border-0 border-b",
                    isDark 
                      ? "bg-transparent border-gray-600 text-gray-200 placeholder-gray-500 focus:border-teal-500" 
                      : "bg-transparent border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500",
                    "focus:outline-none"
                  )}
                />
              </div>

              {/* Vorschläge Label mit Info Icon */}
              <div className="flex items-center gap-1 mb-2">
                <p className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-500")}>
                  Vorschläge
                </p>
                <Info className={cn("w-3.5 h-3.5", isDark ? "text-gray-500" : "text-gray-400")} />
              </div>

              {/* Kontaktliste */}
              <div className="max-h-64 overflow-y-auto -mx-2 px-2">
                {loadingContacts ? (
                  <div className="py-8 text-center">
                    <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className={cn("py-8 text-center text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                    Keine Kontakte gefunden
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedPartner?.id === contact.id;
                    return (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedPartner(contact)}
                      className={cn(
                        "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors",
                        isSelected
                          ? (isDark ? "bg-gray-700/50" : "bg-teal-50")
                          : (isDark ? "hover:bg-white/5" : "hover:bg-gray-50")
                      )}
                    >
                      {/* Avatar oder Checkmark wenn ausgewählt */}
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                        isSelected 
                          ? "bg-teal-600 text-white" 
                          : cn("text-white", getAvatarColor(contact.email))
                      )}>
                        {isSelected ? (
                          <Check className="w-5 h-5" />
                        ) : contact.avatar ? (
                          <img src={contact.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getInitial(contact.name, contact.email)
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={cn("text-sm font-medium truncate", isDark ? "text-gray-200" : "text-gray-900")}>
                          {contact.name !== contact.email ? contact.name : contact.email.split('@')[0]}
                        </p>
                        <p className={cn("text-xs truncate", isDark ? "text-gray-500" : "text-gray-500")}>
                          {contact.email}
                        </p>
                      </div>
                    </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setStep('settings')}
                  className={cn(
                    "px-6 py-2.5 rounded-full font-medium transition-colors",
                    isDark ? "text-teal-400 hover:bg-teal-900/30" : "text-teal-600 hover:bg-teal-50"
                  )}
                >
                  Zurück
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!selectedPartner}
                  className={cn(
                    "px-8 py-2.5 rounded-full font-medium transition-colors",
                    selectedPartner
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : (isDark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400")
                  )}
                >
                  Weiter
                </button>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && selectedPartner && (
            <div>
              {/* Header */}
              <div className="mb-6">
                <h2 className={cn("text-xl font-medium", isDark ? "text-white" : "text-gray-900")}>
                  Bestätigen
                </h2>
                <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
                  Teilen als {userEmail}
                </p>
              </div>

              {/* Partner Info */}
              <p className={cn("text-sm mb-3", isDark ? "text-gray-400" : "text-gray-500")}>
                Teilen mit
              </p>
              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                  getAvatarColor(selectedPartner.email)
                )}>
                  {selectedPartner.avatar ? (
                    <img src={selectedPartner.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitial(selectedPartner.name, selectedPartner.email)
                  )}
                </div>
                <div>
                  <p className={cn("font-medium", isDark ? "text-gray-200" : "text-gray-900")}>
                    Taskilo-Nutzer
                  </p>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                    {selectedPartner.email}
                  </p>
                </div>
              </div>

              {/* Zugriff Info */}
              <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-gray-500")}>
                {selectedPartner.email} hat dann Zugriff auf
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-teal-600" />
                  <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                    {includeAllPhotos ? 'Alle Fotos' : 'Ausgewählte Fotos'} seit {formatDateDisplay(selectedDate)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-teal-600" />
                  <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                    Der Aufnahmeort der geteilten Fotos.{' '}
                    <a href="#" className="text-teal-600 hover:underline">Weitere Informationen</a>
                  </span>
                </div>
              </div>

              {/* Fehlermeldung */}
              {sendError && (
                <div className={cn(
                  "p-3 rounded-lg mb-4 text-sm",
                  isDark ? "bg-red-900/30 text-red-400" : "bg-red-50 text-red-600"
                )}>
                  {sendError}
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('partner')}
                  className={cn(
                    "px-6 py-2.5 rounded-full font-medium transition-colors",
                    isDark ? "text-teal-400 hover:bg-teal-900/30" : "text-teal-600 hover:bg-teal-50"
                  )}
                >
                  Zurück
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={sending}
                  className="px-8 py-2.5 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {sending ? 'Wird gesendet...' : 'Einladung senden'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
