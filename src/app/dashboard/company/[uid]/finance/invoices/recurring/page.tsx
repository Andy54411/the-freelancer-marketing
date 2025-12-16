'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { RecurringInvoiceService, RecurringInvoiceTemplate } from '@/services/recurringInvoiceService';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Calendar, Pause, Play, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RecurringInvoicesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Get initial tab from URL parameters
  const initialTab = searchParams?.get('tab') || 'all';

  const [templates, setTemplates] = useState<RecurringInvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'completed'>(initialTab as any);

  useEffect(() => {
    if (user && user.uid === uid) {
      loadRecurringInvoices();
    }
  }, [user, uid, activeTab]);

  // Update active tab when URL parameters change
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') || 'all';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl as any);
    }
  }, [searchParams, activeTab]);

  const loadRecurringInvoices = async () => {
    try {
      setLoading(true);
      
      const statusFilter = activeTab === 'all' ? undefined : activeTab;
      const loadedTemplates = await RecurringInvoiceService.getRecurringInvoices(uid, statusFilter as any);
      
      setTemplates(loadedTemplates);
      setError(null);
    } catch (err) {
      console.error('[RecurringInvoicesPage] Error loading templates:', err);
      setError('Fehler beim Laden der wiederkehrenden Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  // Autorisierung prüfen
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
            <p className="text-gray-600 text-sm mt-1">
              Verwalten Sie Abo-Rechnungen und wiederkehrende Leistungen
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Abo-Rechnung erstellen
              </Button>
            </Link>
          </div>
        </header>
        
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Wiederkehrende Rechnungen werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
            <p className="text-gray-600 text-sm mt-1">
              Verwalten Sie Abo-Rechnungen und wiederkehrende Leistungen
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Abo-Rechnung erstellen
              </Button>
            </Link>
          </div>
        </header>
        
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadRecurringInvoices} className="bg-[#14ad9f] hover:bg-taskilo-hover">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
          <p className="text-gray-600 text-sm mt-1">
            Verwalten Sie Abo-Rechnungen und wiederkehrende Leistungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadRecurringInvoices}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>
          <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Abo-Rechnung erstellen
            </Button>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-[#14ad9f] border-b-2 border-[#14ad9f]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'active'
              ? 'text-[#14ad9f] border-b-2 border-[#14ad9f]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Aktiv
        </button>
        <button
          onClick={() => setActiveTab('paused')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'paused'
              ? 'text-[#14ad9f] border-b-2 border-[#14ad9f]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pausiert
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'completed'
              ? 'text-[#14ad9f] border-b-2 border-[#14ad9f]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Abgeschlossen
        </button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#14ad9f]/10 flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-[#14ad9f]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {activeTab === 'all' ? 'Noch keine wiederkehrenden Rechnungen' : `Keine ${activeTab === 'active' ? 'aktiven' : activeTab === 'paused' ? 'pausierten' : 'abgeschlossenen'} Vorlagen`}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Erstellen Sie Ihre erste Abo-Rechnung für wiederkehrende Leistungen wie Monatsabos,
            Wartungsverträge oder regelmäßige Dienstleistungen.
          </p>
          <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
              <Plus className="w-4 h-4 mr-2" />
              Abo-Rechnung erstellen
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <RecurringTemplateCard
              key={template.id}
              template={template}
              onRefresh={loadRecurringInvoices}
              companyId={uid}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Karten-Komponente für einzelne wiederkehrende Rechnungsvorlage
 */
function RecurringTemplateCard({
  template,
  onRefresh,
  companyId,
}: {
  template: RecurringInvoiceTemplate;
  onRefresh: () => void;
  companyId: string;
}) {
  const [actionLoading, setActionLoading] = useState(false);

  const handlePauseResume = async () => {
    try {
      setActionLoading(true);
      const newStatus = template.recurringStatus === 'active' ? 'paused' : 'active';
      
      await RecurringInvoiceService.updateRecurringInvoiceStatus(
        companyId,
        template.id,
        newStatus
      );
      
      toast.success(
        newStatus === 'active'
          ? 'Wiederkehrende Rechnung wurde fortgesetzt'
          : 'Wiederkehrende Rechnung wurde pausiert'
      );
      
      onRefresh();
    } catch (error) {
      console.error('[RecurringTemplateCard] Error pausing/resuming:', error);
      toast.error('Fehler beim Ändern des Status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie diese wiederkehrende Rechnung wirklich löschen?')) {
      return;
    }

    try {
      setActionLoading(true);
      await RecurringInvoiceService.deleteRecurringInvoice(companyId, template.id);
      toast.success('Wiederkehrende Rechnung wurde gelöscht');
      onRefresh();
    } catch (error) {
      console.error('[RecurringTemplateCard] Error deleting:', error);
      toast.error('Fehler beim Löschen');
    } finally {
      setActionLoading(false);
    }
  };

  const formatInterval = (interval: string) => {
    const labels: Record<string, string> = {
      weekly: 'Wöchentlich',
      monthly: 'Monatlich',
      quarterly: 'Vierteljährlich',
      yearly: 'Jährlich',
    };
    return labels[interval] || interval;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
      paused: { label: 'Pausiert', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Abgeschlossen', className: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[status as keyof typeof badges] || badges.active;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{template.title}</h3>
            {getStatusBadge(template.recurringStatus)}
          </div>
          <p className="text-sm text-gray-600">
            Kunde: <span className="font-medium">{template.customerName}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          {template.recurringStatus !== 'completed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseResume}
                disabled={actionLoading}
                className="flex items-center gap-1"
              >
                {template.recurringStatus === 'active' ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pausieren
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Fortsetzen
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Intervall</p>
          <p className="font-medium text-gray-900">{formatInterval(template.recurringInterval)}</p>
        </div>
        <div>
          <p className="text-gray-500">Startdatum</p>
          <p className="font-medium text-gray-900">{formatDate(template.recurringStartDate)}</p>
        </div>
        <div>
          <p className="text-gray-500">Nächste Rechnung</p>
          <p className="font-medium text-gray-900">{formatDate(template.recurringNextExecutionDate)}</p>
        </div>
        <div>
          <p className="text-gray-500">Auto-Versand</p>
          <p className="font-medium text-gray-900">
            {template.recurringAutoSendEmail ? 'Aktiviert' : 'Deaktiviert'}
          </p>
        </div>
      </div>

      {template.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">{template.notes}</p>
        </div>
      )}
    </div>
  );
}
