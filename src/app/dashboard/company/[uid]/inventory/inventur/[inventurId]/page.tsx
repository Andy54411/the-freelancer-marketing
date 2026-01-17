'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Play,
  CheckCircle2,
  Search,
  Filter,
  Printer,
  Save,
  AlertTriangle,
  Package,
  Hash,
  Minus,
  Plus,
  Loader2,
  X,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InventurService, type Inventur, type InventurItem } from '@/services/inventurService';

export default function InventurDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';
  const inventurId = typeof params?.inventurId === 'string' ? params.inventurId : '';

  const [inventur, setInventur] = useState<Inventur | null>(null);
  const [items, setItems] = useState<InventurItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'alle' | 'offen' | 'gezaehlt' | 'differenz'>('alle');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!companyId || !inventurId) return;
    
    try {
      setLoading(true);
      const [inventurData, itemsData] = await Promise.all([
        InventurService.getInventur(companyId, inventurId),
        InventurService.getInventurItems(companyId, inventurId),
      ]);
      
      if (!inventurData) {
        setError('Inventur nicht gefunden');
        return;
      }
      
      setInventur(inventurData);
      setItems(itemsData);
    } catch (err) {
      setError('Fehler beim Laden der Inventur');
    } finally {
      setLoading(false);
    }
  }, [companyId, inventurId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Suchfilter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = item.itemName.toLowerCase().includes(search);
        const matchesSku = item.sku?.toLowerCase().includes(search);
        if (!matchesName && !matchesSku) return false;
      }
      
      // Statusfilter
      if (filterStatus === 'offen' && item.countedQuantity !== null) return false;
      if (filterStatus === 'gezaehlt' && item.countedQuantity === null) return false;
      if (filterStatus === 'differenz' && (item.countedQuantity === null || item.difference === 0)) return false;
      
      return true;
    });
  }, [items, searchTerm, filterStatus]);

  const handleStartInventur = async () => {
    if (!inventur) return;
    
    try {
      setSaving(true);
      await InventurService.startInventur(companyId, inventurId, 'system');
      setInventur(prev => prev ? { ...prev, status: 'in_bearbeitung' } : null);
    } catch (err) {
      setError('Fehler beim Starten der Inventur');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteInventur = async () => {
    if (!inventur) return;
    
    const uncounted = items.filter(i => i.countedQuantity === null).length;
    if (uncounted > 0) {
      const confirmed = window.confirm(
        `Es sind noch ${uncounted} Artikel nicht gezählt. Trotzdem abschließen?`
      );
      if (!confirmed) return;
    }
    
    try {
      setSaving(true);
      await InventurService.completeInventur(companyId, inventurId, 'system', {
        updateStock: true,
        createSnapshot: true,
      });
      router.push(`/dashboard/company/${companyId}/inventory/inventur/${inventurId}/protokoll`);
    } catch (err) {
      setError('Fehler beim Abschließen der Inventur');
      setSaving(false);
    }
  };

  const startEditing = (item: InventurItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.countedQuantity?.toString() ?? item.expectedQuantity.toString());
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditQuantity('');
  };

  const saveCount = async (itemId: string) => {
    const quantity = parseInt(editQuantity, 10);
    if (isNaN(quantity) || quantity < 0) return;
    
    try {
      await InventurService.recordCount(companyId, inventurId, itemId, quantity, 'system');
      
      // Lokales Update
      setItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        const diff = quantity - item.expectedQuantity;
        return {
          ...item,
          countedQuantity: quantity,
          difference: diff,
          differenceValue: diff * item.unitPrice,
          countedAt: new Date(),
        };
      }));
      
      // Inventur-Stats aktualisieren
      setInventur(prev => {
        if (!prev) return null;
        const newCountedItems = prev.countedItems + (items.find(i => i.id === itemId)?.countedQuantity === null ? 1 : 0);
        return { ...prev, countedItems: newCountedItems };
      });
      
      cancelEditing();
    } catch (err) {
      setError('Fehler beim Speichern der Zählung');
    }
  };

  const adjustQuantity = (delta: number) => {
    const current = parseInt(editQuantity, 10) || 0;
    const newValue = Math.max(0, current + delta);
    setEditQuantity(newValue.toString());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!companyId || !inventurId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Keine Inventur ausgewählt</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (error || !inventur) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Inventur nicht gefunden'}</p>
        </div>
      </div>
    );
  }

  const countedCount = items.filter(i => i.countedQuantity !== null).length;
  const differenceCount = items.filter(i => i.difference !== 0).length;
  const progress = items.length > 0 ? (countedCount / items.length) * 100 : 0;

  return (
    <TooltipProvider>
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/company/${companyId}/inventory/inventur`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{inventur.name}</h1>
            <p className="text-gray-500 mt-1">
              Stichtag: {formatDate(inventur.countDate)} | 
              {inventur.type === 'vollstaendig' ? ' Vollständige Inventur' : 
               inventur.type === 'stichprobe' ? ' Stichprobeninventur' : ' Permanente Inventur'}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 inline ml-2 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Inventurarten:</p>
                  <p className="text-sm mt-1">Vollständig: Alle Artikel werden gezählt</p>
                  <p className="text-sm">Stichprobe: Nur ausgewählte Artikel</p>
                  <p className="text-sm">Permanent: Laufende Bestandserfassung</p>
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {inventur.status === 'geplant' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleStartInventur}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    Inventur starten
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Startet die Zählung und ermöglicht die Eingabe der Ist-Bestände</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {inventur.status === 'in_bearbeitung' && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/dashboard/company/${companyId}/inventory/inventur/${inventurId}/drucken`}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Printer className="w-5 h-5" />
                      Zähllisten
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Druckbare Zähllisten für die manuelle Bestandsaufnahme erstellen</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCompleteInventur}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      Inventur abschließen
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Schließt die Inventur ab und aktualisiert die Lagerbestände. GoBD-konform und unveränderlich.</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fortschrittsanzeige */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Fortschritt</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Zeigt den Anteil der bereits gezählten Artikel an der Gesamtzahl</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-gray-900">{countedCount} / {items.length}</span>
              <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#14ad9f] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Offen</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Artikel, die noch gezählt werden müssen</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{items.length - countedCount}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Mit Differenz</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Artikel, bei denen der gezählte Bestand vom Soll-Bestand abweicht</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{differenceCount}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Gesamtwert Differenz</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Summe aller Bestandsdifferenzen in Euro (basierend auf Einkaufspreisen)</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-2xl font-bold mt-1 ${inventur.totalDifferenceValue < 0 ? 'text-red-600' : inventur.totalDifferenceValue > 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {formatCurrency(items.reduce((sum, i) => sum + (i.differenceValue || 0), 0))}
          </p>
        </div>
      </div>

      {/* Filter-Leiste */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Artikel suchen (Name oder SKU)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {filterStatus === 'alle' ? 'Alle' : 
               filterStatus === 'offen' ? 'Offen' : 
               filterStatus === 'gezaehlt' ? 'Gezählt' : 'Mit Differenz'}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                {(['alle', 'offen', 'gezaehlt', 'differenz'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status); setShowFilterMenu(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === status ? 'text-[#14ad9f] font-medium' : 'text-gray-700'}`}
                  >
                    {status === 'alle' ? 'Alle anzeigen' : 
                     status === 'offen' ? 'Nur offene' : 
                     status === 'gezaehlt' ? 'Nur gezählte' : 'Mit Differenz'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Artikel-Liste */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Artikel gefunden</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Artikel
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    Soll-Bestand
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Der erwartete Bestand laut Lagerverwaltung</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    Ist-Bestand
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Die tatsächlich gezählte Menge vor Ort</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    Differenz
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Abweichung zwischen Ist- und Soll-Bestand (Ist minus Soll)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-1">
                    Wert
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Wert der Differenz basierend auf dem Einkaufspreis</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.itemName}</p>
                      {item.sku && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {item.sku}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-medium text-gray-600">{item.expectedQuantity}</span>
                  </td>
                  <td className="px-6 py-4">
                    {editingItemId === item.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => adjustQuantity(-1)}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-20 text-center px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                          min="0"
                          autoFocus
                        />
                        <button
                          onClick={() => adjustQuantity(1)}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => saveCount(item.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        {item.countedQuantity !== null ? (
                          <button
                            onClick={() => inventur.status === 'in_bearbeitung' && startEditing(item)}
                            disabled={inventur.status !== 'in_bearbeitung'}
                            className="font-medium text-gray-900 hover:text-[#14ad9f] transition-colors disabled:cursor-default disabled:hover:text-gray-900"
                          >
                            {item.countedQuantity}
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditing(item)}
                            disabled={inventur.status !== 'in_bearbeitung'}
                            className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-sm font-medium hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Zählen
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.countedQuantity !== null && item.difference !== undefined && (
                      <span className={`font-medium ${
                        (item.difference ?? 0) < 0 ? 'text-red-600' : 
                        (item.difference ?? 0) > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {(item.difference ?? 0) > 0 ? '+' : ''}{item.difference ?? 0}
                      </span>
                    )}
                    {item.difference !== undefined && item.difference !== 0 && (
                      <AlertTriangle className="w-4 h-4 inline-block ml-1 text-amber-500" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.countedQuantity !== null && item.differenceValue !== undefined && (
                      <span className={`font-medium ${
                        (item.differenceValue ?? 0) < 0 ? 'text-red-600' : 
                        (item.differenceValue ?? 0) > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {formatCurrency(item.differenceValue ?? 0)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
