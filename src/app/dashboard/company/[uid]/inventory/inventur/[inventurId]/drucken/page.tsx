'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Printer,
  FileText,
  Tag,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { InventurService, type Inventur, type InventurItem, type ZaehllisteOptions } from '@/services/inventurService';
import { InventoryService, type InventoryCategory } from '@/services/inventoryService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lokaler Typ für Zähllisten-Daten
interface ZaehllisteData {
  inventur: Inventur;
  groups: Array<{
    name: string;
    items: InventurItem[];
  }>;
}

export default function InventurDruckenPage() {
  const params = useParams();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';
  const inventurId = typeof params?.inventurId === 'string' ? params.inventurId : '';

  const [inventur, setInventur] = useState<Inventur | null>(null);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<ZaehllisteData | null>(null);
  
  const [options, setOptions] = useState({
    groupBy: 'alphabetical' as 'category' | 'location' | 'alphabetical',
    includeEmpty: true,
    sortBy: 'name' as 'name' | 'sku' | 'location',
  });
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId || !inventurId) return;
    
    try {
      setLoading(true);
      setError(null);
      const [inventurData, categoriesData, locationsData] = await Promise.all([
        InventurService.getInventur(companyId, inventurId),
        InventoryService.getCategories(companyId),
        InventoryService.getUniqueLocations(companyId),
      ]);
      
      setInventur(inventurData);
      setCategories(categoriesData);
      setLocations(locationsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, inventurId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generatePreview = async () => {
    if (!inventur) return;
    
    try {
      setGenerating(true);
      setError(null);
      const zaehlOptions: ZaehllisteOptions = {
        groupBy: options.groupBy,
        includeBarcode: false,
        includeImage: false,
        pageSize: 'A4',
      };
      const data = await InventurService.generateZaehllistenData(
        companyId,
        inventurId,
        zaehlOptions
      );
      
      // Prüfen ob Items vorhanden sind
      const totalItems = data.groups.reduce((sum, g) => sum + g.items.length, 0);
      if (totalItems === 0) {
        setError('Keine Artikel in dieser Inventur gefunden. Bitte stellen Sie sicher, dass Lagerartikel vorhanden sind.');
        setPreviewData(null);
        return;
      }
      
      setPreviewData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen der Vorschau';
      setError(message);
      setPreviewData(null);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (!inventur) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Inventur nicht gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="max-w-7xl mx-auto px-6 py-8 print:p-0 print:max-w-none">
      {/* Header - versteckt beim Drucken */}
      <div className="mb-8 print:hidden">
        <Link
          href={`/dashboard/company/${companyId}/inventory/inventur/${inventurId}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Inventur
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900">Zähllisten drucken</h1>
        <p className="text-gray-500 mt-1">
          {inventur.name}
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 inline ml-2 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Erstellen Sie druckbare Zähllisten für die manuelle Bestandsaufnahme. Die Listen können nach Kategorie, Lagerort oder alphabetisch gruppiert werden.</p>
            </TooltipContent>
          </Tooltip>
        </p>
      </div>

      {/* Fehleranzeige */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 print:hidden">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Optionen - versteckt beim Drucken */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6 print:hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Optionen</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gruppieren nach
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 inline ml-1 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bestimmt, wie die Artikel auf der Zählliste sortiert und gruppiert werden</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <select
              value={options.groupBy}
              onChange={(e) => setOptions(prev => ({ ...prev, groupBy: e.target.value as typeof options.groupBy }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none bg-white"
            >
              <option value="alphabetical">Alphabetisch</option>
              <option value="category">Nach Kategorie</option>
              <option value="location">Nach Lagerort</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sortieren nach
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 inline ml-1 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reihenfolge der Artikel innerhalb jeder Gruppe</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <select
              value={options.sortBy}
              onChange={(e) => setOptions(prev => ({ ...prev, sortBy: e.target.value as typeof options.sortBy }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none bg-white"
            >
              <option value="name">Artikelname</option>
              <option value="sku">Artikelnummer</option>
              <option value="location">Lagerort</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optionen
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeEmpty}
                onChange={(e) => setOptions(prev => ({ ...prev, includeEmpty: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-sm text-gray-700">Leere Zeilen für Ist-Menge</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zeigt leere Eingabefelder für die manuelle Eintragung der gezählten Menge</p>
                </TooltipContent>
              </Tooltip>
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={generatePreview}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                {generating ? 'Wird erstellt...' : 'Vorschau erstellen'}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Erstellt eine Vorschau der Zähllisten basierend auf den gewählten Optionen</p>
            </TooltipContent>
          </Tooltip>
          
          {previewData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Drucken
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Öffnet den Druckdialog für die Zähllisten</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Vorschau / Druckbereich */}
      {previewData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
          {/* Druckkopf */}
          <div className="p-6 border-b border-gray-200 print:border-b-2 print:border-black">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{inventur.name}</h2>
                <p className="text-gray-600">Zählliste</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Stichtag: {formatDate(inventur.countDate)}</p>
                <p>Erstellt: {formatDate(new Date())}</p>
              </div>
            </div>
          </div>
          
          {/* Gruppierte Listen */}
          {previewData.groups.map((group, groupIndex) => (
            <div key={group.name || 'all'} className={groupIndex > 0 ? 'border-t-2 border-gray-300 print:page-break-before' : ''}>
              {group.name && (
                <div className="px-6 py-3 bg-gray-100 flex items-center gap-2">
                  {options.groupBy === 'category' && <Tag className="w-4 h-4 text-gray-600" />}
                  {options.groupBy === 'location' && <MapPin className="w-4 h-4 text-gray-600" />}
                  <span className="font-semibold text-gray-900">{group.name}</span>
                  <span className="text-sm text-gray-500">({group.items.length} Artikel)</span>
                </div>
              )}
              
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">
                      Art.-Nr.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Artikelbezeichnung
                    </th>
                    {options.groupBy !== 'location' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-32">
                        Lagerort
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">
                      <div className="flex items-center justify-center gap-1">
                        Soll
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Erwarteter Bestand laut System</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">
                      <div className="flex items-center justify-center gap-1">
                        Ist
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Hier die tatsächlich gezählte Menge eintragen</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">
                      <div className="flex items-center justify-center gap-1">
                        Diff.
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Differenz zwischen Ist und Soll berechnen (Ist minus Soll)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.items.map((item) => (
                    <tr key={item.itemId} className="hover:bg-gray-50 print:hover:bg-transparent">
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                        {item.sku || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.itemName}
                      </td>
                      {options.groupBy !== 'location' && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.location || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {item.expectedQuantity}
                      </td>
                      <td className="px-4 py-3">
                        {options.includeEmpty ? (
                          <div className="h-6 border-b border-gray-400 mx-2"></div>
                        ) : (
                          <span className="text-center block text-sm">{item.countedQuantity ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-6 border-b border-gray-400 mx-2"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          
          {/* Fußbereich */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 print:bg-transparent">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600 mb-2">Gezählt von:</p>
                <div className="h-8 border-b border-gray-400"></div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Datum / Unterschrift:</p>
                <div className="h-8 border-b border-gray-400"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keine Vorschau */}
      {!previewData && !generating && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm print:hidden">
          <Printer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Zähllisten erstellen</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Wählen Sie die gewünschten Optionen und klicken Sie auf &quot;Vorschau erstellen&quot;.
          </p>
        </div>
      )}
      
      {/* Ladezustand */}
      {generating && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm print:hidden">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Vorschau wird erstellt...</h3>
          <p className="text-gray-500">Bitte warten Sie einen Moment.</p>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
