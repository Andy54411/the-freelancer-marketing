'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ClipboardList, 
  Calendar,
  Tag,
  MapPin,
  Save,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { InventurService, type InventurFilter } from '@/services/inventurService';
import { InventoryService, type InventoryCategory } from '@/services/inventoryService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function NeueInventurPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'vollstaendig' as 'vollstaendig' | 'stichprobe' | 'permanent',
    countDate: new Date().toISOString().split('T')[0],
    notes: '',
    selectedCategories: [] as string[],
    selectedLocations: [] as string[],
  });

  const loadMasterData = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const [categoriesData, locationsData] = await Promise.all([
        InventoryService.getCategories(companyId),
        InventoryService.getUniqueLocations(companyId),
      ]);
      setCategories(categoriesData);
      setLocations(locationsData);
    } catch (err) {
      // Silent fail, optional data
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    try {
      setSaving(true);
      
      const filter: InventurFilter = {};
      
      if (formData.selectedCategories.length > 0) {
        filter.categories = formData.selectedCategories;
      }
      
      if (formData.selectedLocations.length > 0) {
        filter.locations = formData.selectedLocations;
      }

      const inventurId = await InventurService.createInventur(companyId, {
        name: formData.name.trim(),
        type: formData.type,
        countDate: new Date(formData.countDate),
        filter,
        notes: formData.notes.trim(),
      }, 'system'); // TODO: userId aus Auth holen

      router.push(`/dashboard/company/${companyId}/inventory/inventur/${inventurId}`);
    } catch (err) {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(id => id !== categoryId)
        : [...prev.selectedCategories, categoryId],
    }));
  };

  const toggleLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      selectedLocations: prev.selectedLocations.includes(location)
        ? prev.selectedLocations.filter(l => l !== location)
        : [...prev.selectedLocations, location],
    }));
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
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/company/${companyId}/inventory/inventur`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Neue Inventur erstellen</h1>
        <p className="text-gray-500 mt-1">
          Erfassen Sie den aktuellen Warenbestand
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 inline ml-2 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Eine Inventur dient der GoBD-konformen Bestandserfassung. Wählen Sie einen Stichtag und optional Filter, um nur bestimmte Artikel zu erfassen.</p>
            </TooltipContent>
          </Tooltip>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grunddaten */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#14ad9f]" />
              Grunddaten
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Bezeichnung *
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 inline ml-1 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eindeutiger Name für diese Inventur, z.B. &quot;Jahresinventur 2026&quot;</p>
                    </TooltipContent>
                  </Tooltip>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Jahresinventur 2026"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Inventurart
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 inline ml-1 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">Inventurarten:</p>
                        <p className="text-sm mt-1">Vollständig: Alle Artikel werden gezählt</p>
                        <p className="text-sm">Stichprobe: Nur ausgewählte Artikel</p>
                        <p className="text-sm">Permanent: Laufende Bestandserfassung</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as typeof formData.type }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none transition-colors bg-white"
                  >
                    <option value="vollstaendig">Vollständige Inventur</option>
                    <option value="stichprobe">Stichprobeninventur</option>
                    <option value="permanent">Permanente Inventur</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="countDate" className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Stichtag
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 inline ml-1 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Das Datum, zu dem der Bestand erfasst wird. Für die Jahresinventur meist der 31.12.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <input
                    type="date"
                    id="countDate"
                    value={formData.countDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, countDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Bemerkungen
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optionale Hinweise zur Inventur..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Kategorien-Filter */}
          {categories.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#14ad9f]" />
                Nach Kategorien filtern
                <span className="text-sm font-normal text-gray-500">(optional)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Wählen Sie Kategorien aus, um nur bestimmte Artikelgruppen in die Inventur aufzunehmen. Bei einer Stichprobeninventur können Sie so gezielt prüfen.</p>
                  </TooltipContent>
                </Tooltip>
              </h2>
              
              <p className="text-sm text-gray-500 mb-4">
                Wenn keine Kategorie ausgewählt ist, werden alle Artikel erfasst.
              </p>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.selectedCategories.includes(category.id)
                        ? 'bg-[#14ad9f] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lagerort-Filter */}
          {locations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#14ad9f]" />
                Nach Lagerort filtern
                <span className="text-sm font-normal text-gray-500">(optional)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Wählen Sie Lagerorte aus, um nur bestimmte Standorte in die Inventur aufzunehmen. Ideal für große Lager mit mehreren Bereichen.</p>
                  </TooltipContent>
                </Tooltip>
              </h2>
              
              <p className="text-sm text-gray-500 mb-4">
                Wenn kein Lagerort ausgewählt ist, werden alle Standorte erfasst.
              </p>

              <div className="flex flex-wrap gap-2">
                {locations.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => toggleLocation(location)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.selectedLocations.includes(location)
                        ? 'bg-[#14ad9f] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href={`/dashboard/company/${companyId}/inventory/inventur`}
              className="px-6 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#14ad9f] text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Inventur erstellen
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
    </TooltipProvider>
  );
}
