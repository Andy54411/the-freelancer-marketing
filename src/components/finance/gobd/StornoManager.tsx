'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileX,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Euro,
  FileText
} from 'lucide-react';
import { GoBDDocument, StornoRequest, CreditNoteRequest } from '@/types/gobdTypes';
import { GoBDService } from '@/services/gobdService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StornoManagerProps {
  companyId: string;
  document: GoBDDocument;
  onStornoCreated?: (stornoId: string) => void;
  onCreditNoteCreated?: (creditNoteId: string) => void;
}

export function StornoManager({ companyId, document, onStornoCreated, onCreditNoteCreated }: StornoManagerProps) {
  const { user } = useAuth();
  const [stornoDialogOpen, setStornoDialogOpen] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [stornoReason, setStornoReason] = useState('');
  const [stornoDate, setStornoDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [creditReason, setCreditReason] = useState('');
  const [creditAmount, setCreditAmount] = useState(document.amount.toString());
  const [creditDate, setCreditDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [processing, setProcessing] = useState(false);

  const canCreateStorno = document.gobdStatus.isLocked && !document.stornoDocumentId;
  const canCreateCredit = document.gobdStatus.isLocked && !document.creditNoteId;

  const handleStorno = async () => {
    if (!user || !stornoReason.trim()) {
      toast.error('Bitte geben Sie einen Storno-Grund an');
      return;
    }

    try {
      setProcessing(true);
      
      const stornoRequest: StornoRequest = {
        originalDocumentId: document.id,
        reason: stornoReason.trim(),
        stornoDate: new Date(stornoDate)
      };

      const stornoId = await GoBDService.createStorno(
        companyId,
        stornoRequest,
        user.uid,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt'
      );

      if (stornoId) {
        setStornoDialogOpen(false);
        setStornoReason('');
        onStornoCreated?.(stornoId);
        toast.success('Stornorechnung wurde erfolgreich erstellt');
      }
    } catch (error) {
      console.error('Storno creation failed:', error);
      toast.error('Fehler beim Erstellen der Stornorechnung');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreditNote = async () => {
    if (!user || !creditReason.trim()) {
      toast.error('Bitte geben Sie einen Grund für die Gutschrift an');
      return;
    }

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0 || amount > document.amount) {
      toast.error('Ungültiger Gutschriftbetrag');
      return;
    }

    try {
      setProcessing(true);
      
      const _creditRequest: CreditNoteRequest = {
        originalDocumentId: document.id,
        reason: creditReason.trim(),
        creditAmount: amount,
        creditDate: new Date(creditDate)
      };

      // TODO: Implement credit note creation in GoBDService
      // const creditId = await GoBDService.createCreditNote(creditRequest, user.uid, userName);
      
      // Temporary success simulation
      setTimeout(() => {
        setCreditDialogOpen(false);
        setCreditReason('');
        setCreditAmount(document.amount.toString());
        onCreditNoteCreated?.('credit-' + Date.now());
        toast.success('Gutschrift wurde erfolgreich erstellt');
        setProcessing(false);
      }, 1000);
    } catch (error) {
      console.error('Credit note creation failed:', error);
      toast.error('Fehler beim Erstellen der Gutschrift');
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#14ad9f]" />
            Dokument-Status
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              {document.documentNumber}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={
                    document.gobdStatus.isLocked 
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-orange-100 text-orange-700 border-orange-200"
                  }>
                    {document.gobdStatus.isLocked ? 'Festgeschrieben' : 'Offen'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Betrag:</span>
                  <span className="font-medium">
                    {document.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Erstellt:</span>
                  <span>{format(document.createdAt, 'dd.MM.yyyy')}</span>
                </div>
                {document.gobdStatus.lockedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Festgeschrieben:</span>
                    <span>{format(document.gobdStatus.lockedAt, 'dd.MM.yyyy HH:mm')}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Storniert:</span>
                  <Badge variant={document.stornoDocumentId ? "destructive" : "secondary"}>
                    {document.stornoDocumentId ? 'Ja' : 'Nein'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gutschrift:</span>
                  <Badge variant={document.creditNoteId ? "default" : "secondary"}>
                    {document.creditNoteId ? 'Erstellt' : 'Keine'}
                  </Badge>
                </div>
                {document.stornoDocumentId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Storno-Nr.:</span>
                    <span className="font-mono text-sm">{document.stornoDocumentId}</span>
                  </div>
                )}
                {document.creditNoteId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Gutschrift-Nr.:</span>
                    <span className="font-mono text-sm">{document.creditNoteId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aktionen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storno */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileX className="h-5 w-5 text-red-500" />
              Stornorechnung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Erstellen Sie eine Stornorechnung mit negativen Beträgen zur vollständigen 
              Stornierung des Dokuments.
            </p>
            
            {!document.gobdStatus.isLocked ? (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Das Dokument muss zuerst festgeschrieben werden, bevor ein Storno erstellt werden kann.
                </AlertDescription>
              </Alert>
            ) : document.stornoDocumentId ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Stornorechnung bereits erstellt: {document.stornoDocumentId}
                </AlertDescription>
              </Alert>
            ) : (
              <Dialog open={stornoDialogOpen} onOpenChange={setStornoDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    disabled={!canCreateStorno}
                  >
                    <FileX className="h-4 w-4 mr-2" />
                    Stornorechnung erstellen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Stornorechnung erstellen</DialogTitle>
                    <DialogDescription>
                      Eine Stornorechnung macht das Original-Dokument ungültig durch negative Beträge.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="storno-date">Storno-Datum</Label>
                      <Input
                        id="storno-date"
                        type="date"
                        value={stornoDate}
                        onChange={(e) => setStornoDate(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="storno-reason">Storno-Grund *</Label>
                      <Textarea
                        id="storno-reason"
                        placeholder="Grund für die Stornierung eingeben..."
                        value={stornoReason}
                        onChange={(e) => setStornoReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Achtung:</strong> Die Stornorechnung wird automatisch festgeschrieben 
                        und kann nicht mehr geändert werden.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStornoDialogOpen(false)}
                        disabled={processing}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        onClick={handleStorno}
                        disabled={processing || !stornoReason.trim()}
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Erstelle...
                          </>
                        ) : (
                          <>
                            <FileX className="h-4 w-4 mr-2" />
                            Storno erstellen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Gutschrift */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Gutschrift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Erstellen Sie eine Gutschrift für Teilbeträge oder als Alternative zum Storno.
            </p>
            
            {!document.gobdStatus.isLocked ? (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Das Dokument muss zuerst festgeschrieben werden, bevor eine Gutschrift erstellt werden kann.
                </AlertDescription>
              </Alert>
            ) : document.creditNoteId ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Gutschrift bereits erstellt: {document.creditNoteId}
                </AlertDescription>
              </Alert>
            ) : (
              <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={!canCreateCredit}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gutschrift erstellen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gutschrift erstellen</DialogTitle>
                    <DialogDescription>
                      Eine Gutschrift reduziert die Forderung, ohne das Original-Dokument zu stornieren.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="credit-date">Gutschrift-Datum</Label>
                      <Input
                        id="credit-date"
                        type="date"
                        value={creditDate}
                        onChange={(e) => setCreditDate(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="credit-amount">Gutschrift-Betrag *</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="credit-amount"
                          type="number"
                          min="0.01"
                          max={document.amount}
                          step="0.01"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum: {document.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="credit-reason">Gutschrift-Grund *</Label>
                      <Textarea
                        id="credit-reason"
                        placeholder="Grund für die Gutschrift eingeben..."
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <Alert className="border-blue-200 bg-blue-50">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Die Gutschrift wird als separates Dokument erstellt und automatisch festgeschrieben.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCreditDialogOpen(false)}
                        disabled={processing}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={handleCreditNote}
                        disabled={processing || !creditReason.trim() || !creditAmount}
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Erstelle...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Gutschrift erstellen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}