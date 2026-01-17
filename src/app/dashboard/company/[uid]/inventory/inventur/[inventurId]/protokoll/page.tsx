'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Printer,
  HelpCircle,
} from 'lucide-react';
import { InventurService, type Inventur, type InventurItem, type InventurSignature } from '@/services/inventurService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SignaturePad } from '@/components/ui/signature-pad';
import { useAuth } from '@/contexts/AuthContext';

export default function InventurProtokollPage() {
  const params = useParams();
  const { user } = useAuth();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';
  const inventurId = typeof params?.inventurId === 'string' ? params.inventurId : '';

  const [inventur, setInventur] = useState<Inventur | null>(null);
  const [items, setItems] = useState<InventurItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSignature, setSavingSignature] = useState<'performed' | 'approved' | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId || !inventurId) return;
    
    try {
      setLoading(true);
      const [inventurData, itemsData] = await Promise.all([
        InventurService.getInventur(companyId, inventurId),
        InventurService.getInventurItems(companyId, inventurId),
      ]);
      
      setInventur(inventurData);
      setItems(itemsData);
    } catch (err) {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [companyId, inventurId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSignature = async (
    type: 'performed' | 'approved',
    signatureData: string,
    signerName: string,
    authMethod?: 'signature' | 'biometric'
  ) => {
    if (!companyId || !inventurId) return;
    
    try {
      setSavingSignature(type);
      await InventurService.saveInventurSignature(companyId, inventurId, type, {
        signatureData,
        signerName,
        signedBy: user?.uid,
        authMethod,
      });
      
      // Inventur neu laden, um die Unterschrift anzuzeigen
      const updatedInventur = await InventurService.getInventur(companyId, inventurId);
      setInventur(updatedInventur);
    } catch (err) {
      // Silent - Fehlermeldung wird im SignaturePad angezeigt
    } finally {
      setSavingSignature(null);
    }
  };

  const handleClearSignature = async (type: 'performed' | 'approved') => {
    if (!companyId || !inventurId) return;
    
    try {
      setSavingSignature(type);
      await InventurService.removeInventurSignature(companyId, inventurId, type);
      
      // Inventur neu laden
      const updatedInventur = await InventurService.getInventur(companyId, inventurId);
      setInventur(updatedInventur);
    } catch (err) {
      // Silent
    } finally {
      setSavingSignature(null);
    }
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

  // Berechnungen
  const countedItems = items.filter(i => i.countedQuantity !== null);
  const itemsWithDifference = countedItems.filter(i => i.difference !== undefined && i.difference !== 0);
  const itemsWithDeficit = itemsWithDifference.filter(i => (i.difference ?? 0) < 0);
  const itemsWithSurplus = itemsWithDifference.filter(i => (i.difference ?? 0) > 0);
  
  const totalDifferenceValue = countedItems.reduce((sum, i) => sum + (i.differenceValue ?? 0), 0);
  const totalDeficitValue = itemsWithDeficit.reduce((sum, i) => sum + Math.abs(i.differenceValue ?? 0), 0);
  const totalSurplusValue = itemsWithSurplus.reduce((sum, i) => sum + (i.differenceValue ?? 0), 0);
  
  const totalExpectedValue = countedItems.reduce((sum, i) => sum + (i.expectedQuantity * i.unitPrice), 0);
  const totalCountedValue = countedItems.reduce((sum, i) => sum + ((i.countedQuantity ?? 0) * i.unitPrice), 0);

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
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventurprotokoll</h1>
            <p className="text-gray-500 mt-1">
              {inventur.name}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 inline ml-2 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Das Inventurprotokoll dokumentiert die Ergebnisse der Bestandsaufnahme GoBD-konform. Es kann ausgedruckt und unterschrieben werden.</p>
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Printer className="w-5 h-5" />
                Protokoll drucken
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Protokoll für die Buchhaltung und Unterschrift ausdrucken</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Protokoll-Inhalt */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:border-2 print:border-black print:shadow-none print:rounded-none">
        {/* Kopfbereich */}
        <div className="p-6 border-b border-gray-200 print:border-b-2 print:border-black">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Inventurprotokoll</h2>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-semibold">Abgeschlossen</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Bezeichnung</p>
              <p className="font-medium text-gray-900">{inventur.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Inventurart</p>
              <p className="font-medium text-gray-900">
                {inventur.type === 'vollstaendig' ? 'Vollständig' : 
                 inventur.type === 'stichprobe' ? 'Stichprobe' : 'Permanent'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Stichtag</p>
              <p className="font-medium text-gray-900">{formatDate(inventur.countDate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Abgeschlossen am</p>
              <p className="font-medium text-gray-900">{formatDate(inventur.completedAt)}</p>
            </div>
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 print:bg-transparent">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Zusammenfassung</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-sm">Erfasste Artikel</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Anzahl der Artikel, die bei dieser Inventur gezählt wurden</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-gray-900">{countedItems.length}</p>
              <p className="text-sm text-gray-500">von {items.length} gesamt</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Mit Differenz</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Artikel mit Abweichung zwischen Soll- und Ist-Bestand</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-amber-600">{itemsWithDifference.length}</p>
              <p className="text-sm text-gray-500">{Math.round((itemsWithDifference.length / countedItems.length) * 100) || 0}% aller Artikel</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">Fehlbestand</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Wert der fehlenden Artikel (Schwund, Diebstahl, Bruch)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeficitValue)}</p>
              <p className="text-sm text-gray-500">{itemsWithDeficit.length} Artikel</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Mehrbestand</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Wert der zusätzlich gefundenen Artikel (nicht gebuchte Wareneingänge)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSurplusValue)}</p>
              <p className="text-sm text-gray-500">{itemsWithSurplus.length} Artikel</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-500">Soll-Bestandswert</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Erwarteter Gesamtwert laut Lagerverwaltung (Menge x Einkaufspreis)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalExpectedValue)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-500">Ist-Bestandswert</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tatsächlicher Gesamtwert basierend auf der Zählung (gezählte Menge x Einkaufspreis)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCountedValue)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-500">Netto-Differenz</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Differenz zwischen Ist- und Soll-Bestandswert (Gewinn/Verlust)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className={`text-xl font-bold ${totalDifferenceValue < 0 ? 'text-red-600' : totalDifferenceValue > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {totalDifferenceValue > 0 ? '+' : ''}{formatCurrency(totalDifferenceValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Differenzliste */}
        {itemsWithDifference.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Artikel mit Differenzen</h3>
            
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Artikel</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-600">Soll</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-600">Ist</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-600">Differenz</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Wert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itemsWithDifference
                  .sort((a, b) => Math.abs(b.differenceValue ?? 0) - Math.abs(a.differenceValue ?? 0))
                  .map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">{item.itemName}</p>
                        {item.sku && <p className="text-xs text-gray-500">{item.sku}</p>}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-600">{item.expectedQuantity}</td>
                      <td className="px-4 py-2 text-center text-gray-900 font-medium">{item.countedQuantity}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-medium ${(item.difference ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(item.difference ?? 0) > 0 ? '+' : ''}{item.difference ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`font-medium ${(item.differenceValue ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(item.differenceValue ?? 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={4} className="px-4 py-2 font-semibold text-gray-900">Summe Differenzen</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`font-bold ${totalDifferenceValue < 0 ? 'text-red-600' : totalDifferenceValue > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {totalDifferenceValue > 0 ? '+' : ''}{formatCurrency(totalDifferenceValue)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Bemerkungen */}
        {inventur.notes && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bemerkungen</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{inventur.notes}</p>
          </div>
        )}

        {/* Unterschriften */}
        <div className="p-6 bg-gray-50 print:bg-transparent">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Bestätigung</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help print:hidden" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Unterschreiben Sie digital, um die Inventur rechtsverbindlich zu bestätigen. Beide Unterschriften sind für die vollständige Dokumentation erforderlich.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SignaturePad
              label="Durchgeführt von"
              tooltipText="Person, die die Inventur physisch durchgeführt und die Bestände gezählt hat"
              onSave={(data, name, authMethod) => handleSaveSignature('performed', data, name, authMethod)}
              onClear={() => handleClearSignature('performed')}
              disabled={savingSignature !== null}
              initialSignature={inventur?.performedBySignature?.signatureData}
              initialSignerName={inventur?.performedBySignature?.signerName}
              signedAt={inventur?.performedBySignature?.signedAt}
              allowBiometric={true}
              biometricDescription="Verwenden Sie Touch ID für eine schnelle und sichere Authentifizierung"
            />
            <SignaturePad
              label="Geprüft und freigegeben"
              tooltipText="Verantwortliche Person, die die Inventur geprüft und für korrekt befunden hat (z.B. Geschäftsführer)"
              onSave={(data, name, authMethod) => handleSaveSignature('approved', data, name, authMethod)}
              onClear={() => handleClearSignature('approved')}
              disabled={savingSignature !== null}
              initialSignature={inventur?.approvedBySignature?.signatureData}
              initialSignerName={inventur?.approvedBySignature?.signerName}
              signedAt={inventur?.approvedBySignature?.signedAt}
              allowBiometric={true}
              biometricDescription="Verwenden Sie Touch ID für eine schnelle und sichere Authentifizierung"
            />
          </div>
          
          <p className="mt-8 text-xs text-gray-500 text-center print:text-left">
            {inventur?.performedBySignature && inventur?.approvedBySignature
              ? 'Dieses Protokoll wurde vollständig digital unterschrieben und ist rechtsgültig.'
              : 'Dieses Protokoll wurde automatisch erstellt. Bitte unterschreiben Sie digital oder drucken Sie es aus und unterschreiben Sie es handschriftlich.'}
          </p>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
