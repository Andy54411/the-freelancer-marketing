'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ClipboardList, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Trash2,
  Play,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { InventurService, type Inventur, type InventurStats } from '@/services/inventurService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function InventurPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';

  const [inventuren, setInventuren] = useState<Inventur[]>([]);
  const [stats, setStats] = useState<InventurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const [inventurenData, statsData] = await Promise.all([
        InventurService.getInventuren(companyId),
        InventurService.getInventurStats(companyId),
      ]);
      setInventuren(inventurenData);
      setStats(statsData);
    } catch (err) {
      setError('Fehler beim Laden der Inventuren');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: Inventur['status']) => {
    switch (status) {
      case 'geplant':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3" />
            Geplant
          </span>
        );
      case 'in_bearbeitung':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Play className="w-3 h-3" />
            In Bearbeitung
          </span>
        );
      case 'abgeschlossen':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Abgeschlossen
          </span>
        );
      case 'storniert':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <Trash2 className="w-3 h-3" />
            Storniert
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Keine Firma ausgewählt</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventur</h1>
          <p className="text-gray-500 mt-1">
            Bestandsaufnahme und Inventurverwaltung
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 inline ml-2 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Hier verwalten Sie Ihre Inventuren zur GoBD-konformen Bestandserfassung. Eine Inventur dokumentiert den tatsächlichen Warenbestand zu einem bestimmten Stichtag.</p>
              </TooltipContent>
            </Tooltip>
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/dashboard/company/${companyId}/inventory/inventur/neu`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Neue Inventur
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Erstellen Sie eine neue Inventur für die Bestandsaufnahme</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-[#14ad9f]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500">Gesamt</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gesamtzahl aller erstellten Inventuren</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInventories}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500">Abgeschlossen</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vollständig durchgeführte und abgeschlossene Inventuren</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.completedInventories}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500">Offen</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Geplante oder laufende Inventuren, die noch abgeschlossen werden müssen</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.openInventories}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500">Differenzen</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Summe aller Bestandsdifferenzen (Fehlbestände/Überbestände)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalDifferenceValue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
        </div>
      )}

      {/* Inventur-Liste */}
      {!loading && inventuren.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Inventuren vorhanden</h3>
          <p className="text-gray-500 mb-6">
            Erstellen Sie Ihre erste Inventur, um den Bestand zu erfassen.
          </p>
          <Link
            href={`/dashboard/company/${companyId}/inventory/inventur/neu`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Inventur erstellen
          </Link>
        </div>
      )}

      {!loading && inventuren.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Inventur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Stichtag
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Datum, zu dem der Bestand erfasst wird</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Fortschritt
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Anteil der bereits gezählten Artikel</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Differenz
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Gesamtwert der Bestandsabweichungen</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventuren.map((inventur) => (
                <tr 
                  key={inventur.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/company/${companyId}/inventory/inventur/${inventur.id}`)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{inventur.name}</p>
                      <p className="text-sm text-gray-500">
                        {inventur.type === 'vollstaendig' ? 'Vollständig' : 
                         inventur.type === 'stichprobe' ? 'Stichprobe' : 'Permanent'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatDate(inventur.countDate)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(inventur.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#14ad9f] transition-all"
                          style={{ width: `${inventur.totalItems > 0 ? (inventur.countedItems / inventur.totalItems) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        {inventur.countedItems} / {inventur.totalItems}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${inventur.totalDifferenceValue < 0 ? 'text-red-600' : inventur.totalDifferenceValue > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {formatCurrency(inventur.totalDifferenceValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/dashboard/company/${companyId}/inventory/inventur/${inventur.id}`}
                        className="p-2 text-gray-500 hover:text-[#14ad9f] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Öffnen"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                      {inventur.status === 'abgeschlossen' && (
                        <Link
                          href={`/dashboard/company/${companyId}/inventory/inventur/${inventur.id}/protokoll`}
                          className="p-2 text-gray-500 hover:text-[#14ad9f] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Protokoll"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
