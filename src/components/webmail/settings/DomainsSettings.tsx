'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Mail,
  Shield,
  Loader2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import type { SettingsTabProps } from './types';

// Types für Custom Domains
interface DNSRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl?: number;
  description: string;
}

interface CustomDomain {
  id: string;
  domain: string;
  status: 'pending' | 'verifying' | 'verified' | 'active' | 'failed' | 'suspended';
  verificationCode: string;
  dnsProvider: 'hetzner' | 'inwx' | 'external';
  dnsRecordsCreated: boolean;
  mailcowDomainAdded: boolean;
  dkimSelector: string | null;
  dkimPublicKey: string | null;
  maxMailboxes: number;
  verifiedAt: string | null;
  activatedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface CustomDomainMailbox {
  id: string;
  email: string;
  localPart: string;
  name: string;
  quotaMB: number;
  active: boolean;
  createdAt: string;
}

// Status-Badge Komponente
function StatusBadge({ status }: { status: CustomDomain['status'] }) {
  const config = {
    pending: { icon: Clock, label: 'Verifizierung ausstehend', className: 'bg-yellow-100 text-yellow-800' },
    verifying: { icon: RefreshCw, label: 'Wird verifiziert...', className: 'bg-blue-100 text-blue-800' },
    verified: { icon: CheckCircle2, label: 'Verifiziert', className: 'bg-green-100 text-green-800' },
    active: { icon: Zap, label: 'Aktiv', className: 'bg-teal-100 text-teal-800' },
    failed: { icon: AlertCircle, label: 'Fehler', className: 'bg-red-100 text-red-800' },
    suspended: { icon: AlertCircle, label: 'Gesperrt', className: 'bg-gray-100 text-gray-800' },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', className)}>
      <Icon className={cn('w-3.5 h-3.5', status === 'verifying' && 'animate-spin')} />
      {label}
    </span>
  );
}

// DNS Record Row
function DNSRecordRow({ record, onCopy }: { record: DNSRecord; onCopy: (text: string) => void }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-2 text-sm border-b border-gray-100 last:border-0">
      <div className="col-span-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded text-center">
        {record.type}
      </div>
      <div className="col-span-2 font-mono text-xs text-gray-600 truncate" title={record.name}>
        {record.name}
      </div>
      <div className="col-span-6 font-mono text-xs text-gray-600 break-all">
        {record.priority !== undefined && <span className="text-gray-400 mr-1">{record.priority}</span>}
        {record.value}
      </div>
      <div className="col-span-2 text-xs text-gray-500">
        {record.description}
      </div>
      <div className="col-span-1 flex justify-end">
        <button
          onClick={() => onCopy(record.value)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Wert kopieren"
        >
          <Copy className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// Domain Card
function DomainCard({
  domain,
  dnsInstructions,
  mailboxes,
  onVerify,
  onActivate,
  onDelete,
  onCreateMailbox,
  isVerifying,
  isActivating,
}: {
  domain: CustomDomain;
  dnsInstructions?: DNSRecord[];
  mailboxes: CustomDomainMailbox[];
  onVerify: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onCreateMailbox: (localPart: string, name: string, password: string) => void;
  isVerifying: boolean;
  isActivating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMailboxForm, setShowMailboxForm] = useState(false);
  const [newMailbox, setNewMailbox] = useState({ localPart: '', name: '', password: '' });
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateMailbox = () => {
    if (newMailbox.localPart && newMailbox.name && newMailbox.password) {
      onCreateMailbox(newMailbox.localPart, newMailbox.name, newMailbox.password);
      setNewMailbox({ localPart: '', name: '', password: '' });
      setShowMailboxForm(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-[#14ad9f]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{domain.domain}</h3>
            <p className="text-xs text-gray-500">
              Hinzugefügt: {new Date(domain.createdAt).toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={domain.status} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Error Message */}
          {domain.errorMessage && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{domain.errorMessage}</span>
            </div>
          )}

          {/* DNS Instructions */}
          {domain.status === 'pending' && dnsInstructions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#14ad9f]" />
                  DNS-Einstellungen
                </h4>
                <a
                  href="https://docs.taskilo.de/webmail/custom-domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#14ad9f] hover:underline flex items-center gap-1"
                >
                  Anleitung <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-sm text-gray-600">
                Fügen Sie die folgenden DNS-Records bei Ihrem Domain-Anbieter hinzu:
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-medium text-gray-500 border-b border-gray-200">
                  <div className="col-span-1">Typ</div>
                  <div className="col-span-2">Name</div>
                  <div className="col-span-6">Wert</div>
                  <div className="col-span-2">Beschreibung</div>
                  <div className="col-span-1"></div>
                </div>
                {dnsInstructions.map((record, idx) => (
                  <DNSRecordRow key={idx} record={record} onCopy={handleCopy} />
                ))}
              </div>
              {copied && (
                <p className="text-xs text-green-600">In Zwischenablage kopiert!</p>
              )}
              <Button
                onClick={onVerify}
                disabled={isVerifying}
                className="bg-[#14ad9f] hover:bg-teal-700"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifizierung...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    DNS prüfen
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Verified - Ready to Activate */}
          {domain.status === 'verified' && (
            <div className="space-y-3">
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Domain erfolgreich verifiziert!</p>
                  <p className="text-green-600 mt-1">
                    Sie können die Domain jetzt aktivieren, um E-Mail-Postfächer zu erstellen.
                  </p>
                </div>
              </div>
              <Button
                onClick={onActivate}
                disabled={isActivating}
                className="bg-[#14ad9f] hover:bg-teal-700"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aktivierung...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Domain aktivieren
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Active - Mailbox Management */}
          {domain.status === 'active' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#14ad9f]" />
                  E-Mail-Postfächer ({mailboxes.length}/{domain.maxMailboxes})
                </h4>
                <Button
                  size="sm"
                  onClick={() => setShowMailboxForm(true)}
                  className="bg-[#14ad9f] hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Neues Postfach
                </Button>
              </div>

              {/* Mailbox List */}
              {mailboxes.length > 0 ? (
                <div className="space-y-2">
                  {mailboxes.map((mailbox) => (
                    <div
                      key={mailbox.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#14ad9f]/10 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-[#14ad9f]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{mailbox.email}</p>
                          <p className="text-xs text-gray-500">{mailbox.name}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        mailbox.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {mailbox.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Noch keine E-Mail-Postfächer erstellt.
                </p>
              )}

              {/* New Mailbox Form */}
              {showMailboxForm && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h5 className="font-medium text-sm">Neues Postfach erstellen</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">E-Mail-Adresse</label>
                      <div className="flex items-center">
                        <Input
                          value={newMailbox.localPart}
                          onChange={(e) => setNewMailbox({ ...newMailbox, localPart: e.target.value.toLowerCase() })}
                          placeholder="info"
                          className="rounded-r-none"
                        />
                        <span className="bg-gray-200 text-gray-600 px-3 py-2 text-sm rounded-r-lg border border-l-0">
                          @{domain.domain}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <Input
                        value={newMailbox.name}
                        onChange={(e) => setNewMailbox({ ...newMailbox, name: e.target.value })}
                        placeholder="Max Mustermann"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Passwort</label>
                    <Input
                      type="password"
                      value={newMailbox.password}
                      onChange={(e) => setNewMailbox({ ...newMailbox, password: e.target.value })}
                      placeholder="Mindestens 8 Zeichen"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateMailbox}
                      className="bg-[#14ad9f] hover:bg-teal-700"
                      disabled={!newMailbox.localPart || !newMailbox.name || newMailbox.password.length < 8}
                    >
                      Erstellen
                    </Button>
                    <Button variant="outline" onClick={() => setShowMailboxForm(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}

              {/* DKIM Info */}
              {domain.dkimPublicKey && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700 font-medium mb-1">DKIM-Record hinzufügen:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded flex-1 break-all">
                      {domain.dkimSelector}._domainkey.{domain.domain}
                    </code>
                    <button onClick={() => handleCopy(domain.dkimPublicKey || '')} className="p-1 hover:bg-blue-100 rounded">
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete Button */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Domain entfernen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Domain Modal
function AddDomainModal({
  isOpen,
  onClose,
  onAdd,
  isAdding,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (domain: string) => void;
  isAdding: boolean;
}) {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  const validateDomain = (value: string) => {
    const regex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;
    return regex.test(value);
  };

  const handleSubmit = () => {
    if (!domain) {
      setError('Bitte geben Sie eine Domain ein');
      return;
    }
    if (!validateDomain(domain)) {
      setError('Ungültiges Domain-Format');
      return;
    }
    setError('');
    onAdd(domain.toLowerCase());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Eigene Domain hinzufügen</h2>
        <p className="text-sm text-gray-600 mb-4">
          Geben Sie Ihre Domain ein, um sie für E-Mails zu nutzen. Sie müssen anschließend DNS-Records setzen.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
            <Input
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setError('');
              }}
              placeholder="meinefirma.de"
              className={cn(error && 'border-red-500')}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isAdding}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Hinzufügen...
                </>
              ) : (
                'Domain hinzufügen'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function DomainsSettings({ settings: _settings, onSettingsChange: _onSettingsChange, isDark, session: _session }: SettingsTabProps) {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [mailboxesByDomain, setMailboxesByDomain] = useState<Record<string, CustomDomainMailbox[]>>({});
  const [dnsInstructions, setDnsInstructions] = useState<Record<string, DNSRecord[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingDomains, setVerifyingDomains] = useState<Set<string>>(new Set());
  const [activatingDomains, setActivatingDomains] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Domains laden
  const loadDomains = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/webmail/domains');
      const result = await response.json();
      
      if (result.success && result.data) {
        setDomains(result.data);
      }
    } catch {
      setError('Fehler beim Laden der Domains');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Domain Details laden
  const loadDomainDetails = useCallback(async (domainId: string) => {
    try {
      const response = await fetch(`/api/webmail/domains/${domainId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        if (result.data.dnsInstructions) {
          setDnsInstructions(prev => ({ ...prev, [domainId]: result.data.dnsInstructions }));
        }
      }
    } catch {
      // Fehler ignorieren
    }
  }, []);

  // Mailboxen laden
  const loadMailboxes = useCallback(async (domainId: string) => {
    try {
      const response = await fetch(`/api/webmail/domains/${domainId}/mailboxes`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setMailboxesByDomain(prev => ({ ...prev, [domainId]: result.data }));
      }
    } catch {
      // Fehler ignorieren
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  // Domain Details für alle pending/active Domains laden
  useEffect(() => {
    domains.forEach(domain => {
      if (domain.status === 'pending') {
        loadDomainDetails(domain.id);
      }
      if (domain.status === 'active') {
        loadMailboxes(domain.id);
      }
    });
  }, [domains, loadDomainDetails, loadMailboxes]);

  // Domain hinzufügen
  const handleAddDomain = async (domainName: string) => {
    try {
      setIsAdding(true);
      const response = await fetch('/api/webmail/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainName }),
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setDomains(prev => [...prev, result.data.domain]);
        if (result.data.dnsInstructions) {
          setDnsInstructions(prev => ({ ...prev, [result.data.domain.id]: result.data.dnsInstructions }));
        }
        setShowAddModal(false);
      } else {
        setError(result.error || 'Fehler beim Hinzufügen');
      }
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setIsAdding(false);
    }
  };

  // Domain verifizieren
  const handleVerify = async (domainId: string) => {
    try {
      setVerifyingDomains(prev => new Set(prev).add(domainId));
      const response = await fetch(`/api/webmail/domains/${domainId}/verify`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        // Domain-Status aktualisieren
        await loadDomains();
      } else {
        setError(result.error || 'Verifizierung fehlgeschlagen');
      }
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setVerifyingDomains(prev => {
        const next = new Set(prev);
        next.delete(domainId);
        return next;
      });
    }
  };

  // Domain aktivieren
  const handleActivate = async (domainId: string) => {
    try {
      setActivatingDomains(prev => new Set(prev).add(domainId));
      const response = await fetch(`/api/webmail/domains/${domainId}/activate`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        await loadDomains();
      } else {
        setError(result.error || 'Aktivierung fehlgeschlagen');
      }
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setActivatingDomains(prev => {
        const next = new Set(prev);
        next.delete(domainId);
        return next;
      });
    }
  };

  // Domain löschen
  const handleDelete = async (domainId: string) => {
    if (!confirm('Möchten Sie diese Domain wirklich entfernen?')) return;

    try {
      const response = await fetch(`/api/webmail/domains/${domainId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        setDomains(prev => prev.filter(d => d.id !== domainId));
      } else {
        setError(result.error || 'Löschen fehlgeschlagen');
      }
    } catch {
      setError('Netzwerkfehler');
    }
  };

  // Mailbox erstellen
  const handleCreateMailbox = async (domainId: string, localPart: string, name: string, password: string) => {
    try {
      const response = await fetch(`/api/webmail/domains/${domainId}/mailboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localPart, name, password }),
      });
      const result = await response.json();
      
      if (result.success) {
        await loadMailboxes(domainId);
      } else {
        setError(result.error || 'Mailbox konnte nicht erstellt werden');
      }
    } catch {
      setError('Netzwerkfehler');
    }
  };

  return (
    <div className={cn('space-y-6', isDark && 'text-gray-100')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Eigene Domains</h2>
          <p className="text-sm text-gray-500">
            Verwenden Sie Ihre eigene Domain für E-Mail-Adressen
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#14ad9f] hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Domain hinzufügen
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            Schließen
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
        </div>
      ) : domains.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">Keine eigenen Domains</h3>
          <p className="text-sm text-gray-500 mb-4">
            Fügen Sie Ihre Domain hinzu, um E-Mail-Adressen wie info@ihrefirma.de zu nutzen.
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#14ad9f] hover:bg-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Erste Domain hinzufügen
          </Button>
        </div>
      ) : (
        /* Domain List */
        <div className="space-y-4">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              dnsInstructions={dnsInstructions[domain.id]}
              mailboxes={mailboxesByDomain[domain.id] || []}
              onVerify={() => handleVerify(domain.id)}
              onActivate={() => handleActivate(domain.id)}
              onDelete={() => handleDelete(domain.id)}
              onCreateMailbox={(lp, n, p) => handleCreateMailbox(domain.id, lp, n, p)}
              isVerifying={verifyingDomains.has(domain.id)}
              isActivating={activatingDomains.has(domain.id)}
            />
          ))}
        </div>
      )}

      {/* Add Domain Modal */}
      <AddDomainModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddDomain}
        isAdding={isAdding}
      />
    </div>
  );
}
