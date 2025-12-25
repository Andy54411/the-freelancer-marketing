'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Tag, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailAuth } from '@/hooks/useWebmailAuth';

interface CreateMultipleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactsCreated?: () => void;
}

interface ParsedContact {
  name: string;
  email: string;
}

export function CreateMultipleContactsModal({ 
  isOpen, 
  onClose,
  onContactsCreated 
}: CreateMultipleContactsModalProps) {
  const { email: authEmail, password: authPassword, isAuthenticated } = useWebmailAuth();
  const [inputText, setInputText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const labelDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Labels laden
  useEffect(() => {
    async function loadLabels() {
      if (!isOpen || !isAuthenticated || !authEmail || !authPassword) return;
      
      try {
        const response = await fetch('/api/webmail/contacts/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.labels) {
            setAvailableLabels(data.labels.map((l: { name: string }) => l.name));
          }
        }
      } catch {
        // Silently handle
      }
    }
    
    loadLabels();
  }, [isOpen, isAuthenticated, authEmail, authPassword]);

  // Click-Away Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
        setIsCreatingLabel(false);
        setNewLabelName('');
      }
    }
    
    if (showLabelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showLabelDropdown]);

  // Parse input text to contacts
  function parseContacts(text: string): ParsedContact[] {
    const contacts: ParsedContact[] = [];
    const lines = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    
    for (const line of lines) {
      // Pattern: Name <email@domain.com>
      const bracketMatch = line.match(/^(.+?)\s*<([^>]+@[^>]+)>$/);
      if (bracketMatch) {
        contacts.push({ name: bracketMatch[1].trim(), email: bracketMatch[2].trim() });
        continue;
      }
      
      // Pattern: email@domain.com
      const emailMatch = line.match(/^([^\s@]+@[^\s@]+\.[^\s@]+)$/);
      if (emailMatch) {
        contacts.push({ name: '', email: emailMatch[1] });
        continue;
      }
      
      // Pattern: Name email@domain.com (space separated)
      const spaceMatch = line.match(/^(.+?)\s+([^\s@]+@[^\s@]+\.[^\s@]+)$/);
      if (spaceMatch) {
        contacts.push({ name: spaceMatch[1].trim(), email: spaceMatch[2].trim() });
        continue;
      }
      
      // Just a name (no email)
      if (line.length > 0 && !line.includes('@')) {
        contacts.push({ name: line, email: '' });
      }
    }
    
    return contacts;
  }

  // Create label
  async function handleCreateLabel() {
    if (!newLabelName.trim() || !authEmail || !authPassword) return;
    
    const labelName = newLabelName.trim();
    
    // Add to local list
    if (!availableLabels.includes(labelName)) {
      setAvailableLabels(prev => [...prev, labelName]);
    }
    
    setSelectedLabel(labelName);
    setNewLabelName('');
    setIsCreatingLabel(false);
    setShowLabelDropdown(false);
  }

  // Handle file import
  async function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    
    if (file.name.endsWith('.vcf') || file.name.endsWith('.vcard')) {
      // Parse vCard
      const vcards = text.split('BEGIN:VCARD');
      const contacts: string[] = [];
      
      for (const vcard of vcards) {
        if (!vcard.trim()) continue;
        
        const fnMatch = vcard.match(/FN:(.+)/);
        const emailMatch = vcard.match(/EMAIL[^:]*:(.+)/);
        
        const name = fnMatch?.[1]?.trim() || '';
        const email = emailMatch?.[1]?.trim() || '';
        
        if (name || email) {
          if (name && email) {
            contacts.push(`${name} <${email}>`);
          } else if (email) {
            contacts.push(email);
          } else {
            contacts.push(name);
          }
        }
      }
      
      setInputText(prev => prev ? `${prev}\n${contacts.join('\n')}` : contacts.join('\n'));
    } else if (file.name.endsWith('.csv')) {
      // Parse CSV
      const lines = text.split('\n').filter(l => l.trim());
      const contacts: string[] = [];
      
      // Skip header if it looks like one
      const startIndex = lines[0]?.toLowerCase().includes('email') || 
                         lines[0]?.toLowerCase().includes('name') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        const name = parts[0] || '';
        const email = parts.find(p => p.includes('@')) || '';
        
        if (name || email) {
          if (name && email && name !== email) {
            contacts.push(`${name} <${email}>`);
          } else if (email) {
            contacts.push(email);
          } else {
            contacts.push(name);
          }
        }
      }
      
      setInputText(prev => prev ? `${prev}\n${contacts.join('\n')}` : contacts.join('\n'));
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Create contacts
  async function handleCreate() {
    if (!isAuthenticated || !authEmail || !authPassword) {
      setError('Nicht angemeldet');
      return;
    }
    
    const parsedContacts = parseContacts(inputText);
    if (parsedContacts.length === 0) {
      setError('Keine gültigen Kontakte gefunden');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const contact of parsedContacts) {
      try {
        const nameParts = contact.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const contactData = {
          firstName,
          lastName,
          displayName: contact.name || contact.email.split('@')[0],
          emails: contact.email ? [{ value: contact.email, label: 'Privat' }] : [],
          phones: [],
          labels: selectedLabel ? [selectedLabel] : [],
        };
        
        const response = await fetch('/api/webmail/contacts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: authEmail, 
            password: authPassword, 
            contact: contactData 
          }),
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    
    setIsCreating(false);
    
    if (successCount > 0) {
      onContactsCreated?.();
      onClose();
      // Reset state
      setInputText('');
      setSelectedLabel(null);
    } else {
      setError(`Fehler beim Erstellen der Kontakte (${failCount} fehlgeschlagen)`);
    }
  }

  const parsedContacts = parseContacts(inputText);
  const hasValidContacts = parsedContacts.length > 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-100"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-101 w-full max-w-lg">
        <div className="bg-[#f0f4f9] rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-normal text-gray-900">
                Mehrere Kontakte erstellen
              </h2>
              
              {/* Label Dropdown */}
              <div className="relative" ref={labelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm',
                    'bg-white border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    {selectedLabel || 'Kein Label'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                
                {showLabelDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-110">
                    {/* Kein Label Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLabel(null);
                        setShowLabelDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Kein Label</span>
                      {!selectedLabel && <Check className="h-4 w-4 text-teal-600" />}
                    </button>
                    
                    {availableLabels.length > 0 && (
                      <div className="border-t border-gray-100 my-1" />
                    )}
                    
                    {/* Available Labels */}
                    {availableLabels.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setSelectedLabel(label);
                          setShowLabelDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500" />
                          <span>{label}</span>
                        </div>
                        {selectedLabel === label && <Check className="h-4 w-4 text-teal-600" />}
                      </button>
                    ))}
                    
                    <div className="border-t border-gray-100 my-1" />
                    
                    {/* Label erstellen */}
                    {isCreatingLabel ? (
                      <div className="px-4 py-2">
                        <input
                          type="text"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateLabel();
                            }
                            if (e.key === 'Escape') {
                              setIsCreatingLabel(false);
                              setNewLabelName('');
                            }
                          }}
                          placeholder="Label-Name"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingLabel(false);
                              setNewLabelName('');
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateLabel}
                            disabled={!newLabelName.trim()}
                            className="text-xs text-teal-600 hover:text-teal-700 disabled:opacity-50"
                          >
                            Erstellen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCreatingLabel(true)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Label erstellen</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 pb-4">
            {/* Textarea */}
            <div className="mb-4">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Namen, E-Mail-Adressen oder beides hinzufügen"
                className="w-full h-24 px-4 py-3 bg-white border-0 rounded-lg text-sm text-gray-900 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            
            {/* Example text */}
            <div className="text-sm text-gray-500 mb-4 border-t border-gray-300 pt-4">
              <p>
                Beispiel: Andrea Fisher, weaver.blake98@gmail.com, Elisa Beckett &lt;elisa.beckett@gmail.com&gt;
              </p>
            </div>
            
            {/* Import link */}
            <div className="text-sm text-gray-600">
              <p>
                Haben Sie eine CSV- oder vCard-Datei? Stattdessen{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-teal-600 hover:underline"
                >
                  Kontakte importieren
                </button>
                .
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.vcf,.vcard"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mt-4 text-sm text-red-600">
                {error}
              </div>
            )}
            
            {/* Contact count */}
            {hasValidContacts && (
              <div className="mt-4 text-sm text-gray-500">
                {parsedContacts.length} Kontakt{parsedContacts.length !== 1 ? 'e' : ''} erkannt
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!hasValidContacts || isCreating}
              className={cn(
                'text-sm font-medium',
                hasValidContacts && !isCreating
                  ? 'text-teal-600 hover:text-teal-700'
                  : 'text-gray-400 cursor-not-allowed'
              )}
            >
              {isCreating ? 'Wird erstellt...' : 'Erstellen'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
