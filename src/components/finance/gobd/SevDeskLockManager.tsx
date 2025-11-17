'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Lock,
  ExternalLink,
  Info
} from 'lucide-react';
import { GoBDService } from '@/services/gobdService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SevDeskLockManagerProps {
  companyId: string;
  onLockComplete?: () => void;
}

export function SevDeskLockManager({ companyId, onLockComplete }: SevDeskLockManagerProps) {
  const { user } = useAuth();
  
  // Datumsbereiche
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Dokumenttyp-Optionen (wie in SevDesk)
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [includeVouchers, setIncludeVouchers] = useState(true);
  const [includePayments, setIncludePayments] = useState(true);
  const [includeCreditNotes, setIncludeCreditNotes] = useState(true);
  
  // Loading State
  const [isLocking, setIsLocking] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Benutzer nicht authentifiziert');
      return;
    }

    if (!startDate && !endDate) {
      toast.error('Bitte wählen Sie mindestens ein Datum aus');
      return;
    }

    // Validierung: Wenn nur ein Datum gesetzt, nutze aktueller Monat als Fallback
    const actualStartDate = startDate || format(new Date(), 'yyyy-MM-01');
    const actualEndDate = endDate || format(new Date(), 'yyyy-MM-dd');

    try {
      setIsLocking(true);
      
      // Bestimme zu sperrende Periode basierend auf Datum
      const period = startDate ? startDate.substring(0, 7) : format(new Date(), 'yyyy-MM');
      
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt';
      
      const periodLock = await GoBDService.lockPeriod(
        companyId,
        period,
        user.uid,
        userName
      );

      if (periodLock) {
        toast.success(`Festschreibung für Periode ${period} erfolgreich abgeschlossen`);
        onLockComplete?.();
        
        // Formular zurücksetzen
        setStartDate('');
        setEndDate('');
      } else {
        toast.error('Festschreibung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Lock period error:', error);
      toast.error('Fehler bei der Festschreibung: ' + (error as Error).message);
    } finally {
      setIsLocking(false);
    }
  };

  const isFormValid = includeInvoices || includeVouchers || includePayments || includeCreditNotes;

  return (
    <div className="space-y-6">
      {/* Haupttitel */}
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">Festschreibungseinstellungen</h3>
        
        {/* Info-Box (wie SevDesk) */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Bitte gib an, welche Dokumente festgeschrieben werden sollen. Nach der<br/>
            Festschreibung sind diese Dokumente nicht mehr löschbar oder bearbeitbar.<br/><br/>
            Benötigst du weitere Informationen?<br/>
            <a 
              href="https://docs.taskilo.de/gobd-festschreibung" 
              target="_blank" 
              className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 mt-1"
            >
              Weitere Informationen <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Linke Spalte: Datumsbereiche */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zeitraum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                  Startdatum
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Optional"
                    className="pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                  Enddatum
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Optional"
                    className="pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rechte Spalte: Dokumenttypen & Festschreiben-Button */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dokumenttypen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle-Switches (wie in SevDesk) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="invoices" className="text-sm font-medium text-gray-700">
                  Rechnungen
                </Label>
                <Switch
                  id="invoices"
                  checked={includeInvoices}
                  onCheckedChange={setIncludeInvoices}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="vouchers" className="text-sm font-medium text-gray-700">
                  Belege
                </Label>
                <Switch
                  id="vouchers"
                  checked={includeVouchers}
                  onCheckedChange={setIncludeVouchers}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="payments" className="text-sm font-medium text-gray-700">
                  Zahlungen
                </Label>
                <Switch
                  id="payments"
                  checked={includePayments}
                  onCheckedChange={setIncludePayments}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="creditNotes" className="text-sm font-medium text-gray-700">
                  Gutschriften
                </Label>
                <Switch
                  id="creditNotes"
                  checked={includeCreditNotes}
                  onCheckedChange={setIncludeCreditNotes}
                />
              </div>
            </div>

            {/* Festschreiben-Button */}
            <div className="pt-4 border-t">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isLocking}
                className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white font-medium py-3"
                size="lg"
              >
                {isLocking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Wird festgeschrieben...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Festschreiben
                  </>
                )}
              </Button>
              
              {!isFormValid && (
                <p className="text-xs text-red-600 mt-2">
                  Bitte wählen Sie mindestens einen Dokumenttyp aus.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}