/**
 * E-Rechnungs-Übertragungsprotokolle Komponente
 * Zeigt alle Versendungen und deren Status an (UStG §14b Aufbewahrungspflicht)
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Globe,
  Server,
  Download,
  Shield,
  Calendar,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  EInvoiceTransmissionService,
  EInvoiceTransmissionLog,
} from '@/services/eInvoiceTransmissionService';

interface EInvoiceTransmissionLogsProps {
  companyId: string;
}

export function EInvoiceTransmissionLogs({ companyId }: EInvoiceTransmissionLogsProps) {
  const [logs, setLogs] = useState<EInvoiceTransmissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<EInvoiceTransmissionLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadTransmissionLogs();
  }, [companyId]);

  const loadTransmissionLogs = async () => {
    try {
      setLoading(true);
      const transmissionLogs = await EInvoiceTransmissionService.getTransmissionLogs(companyId);
      setLogs(transmissionLogs);
    } catch (error) {
      toast.error('Übertragungsprotokolle konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'sending':
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      queued: { label: 'Warteschlange', variant: 'secondary' as const },
      sending: { label: 'Wird versendet', variant: 'default' as const },
      sent: { label: 'Versendet', variant: 'default' as const },
      delivered: { label: 'Zugestellt', variant: 'default' as const },
      failed: { label: 'Fehlgeschlagen', variant: 'destructive' as const },
      rejected: { label: 'Abgelehnt', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'secondary' as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTransmissionIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'portal':
        return <Globe className="h-4 w-4" />;
      case 'webservice':
      case 'edi':
        return <Server className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getComplianceLevel = (compliance: any) => {
    if (compliance?.isUStGCompliant && compliance?.hasRequiredFields) {
      return <Badge className="bg-green-100 text-green-800">UStG-konform</Badge>;
    }
    return <Badge variant="destructive">Nicht konform</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleViewDetails = (log: EInvoiceTransmissionLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#14ad9f]" />
            Übertragungsprotokolle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Clock className="h-6 w-6 animate-spin text-[#14ad9f]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#14ad9f]" />
            Übertragungsprotokolle
          </CardTitle>
          <CardDescription>
            Nachweis der E-Rechnungs-Versendungen gemäß UStG §14b (8-jährige Aufbewahrungspflicht)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Übertragungsprotokolle
              </h3>
              <p className="text-gray-600">
                Noch keine E-Rechnungen versendet. Protokolle werden hier automatisch gespeichert.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="shrink-0 flex items-center gap-2">
                      {getStatusIcon(log.transmissionStatus)}
                      {getTransmissionIcon(log.transmissionMethod)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">E-Rechnung {log.eInvoiceId}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(log.transmissionStatus)}
                        <Badge variant="outline">{log.transmissionMethod.toUpperCase()}</Badge>
                        {getComplianceLevel(log.legalCompliance)}
                        <span className="text-sm text-gray-500">
                          {formatDate(log.transmissionDate)}
                        </span>
                      </div>
                      {log.recipientEmail && (
                        <p className="text-sm text-gray-500 mt-1">an {log.recipientEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(log)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    {log.transmissionStatus === 'failed' && log.retryCount < log.maxRetries && (
                      <Button
                        size="sm"
                        onClick={() => toast.info('Wiederholung würde gestartet')}
                        className="bg-[#14ad9f] hover:bg-taskilo-hover"
                      >
                        Wiederholen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-blue-900">Rechtliche Aufbewahrung:</strong>
                  <p className="text-blue-800 mt-1">
                    Diese Übertragungsprotokolle dienen als Nachweis der ordnungsgemäßen
                    E-Rechnungs-Übertragung gemäß UStG §14b und werden automatisch 8 Jahre
                    aufbewahrt.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedLog && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#14ad9f]" />
                Übertragungsprotokoll Details
              </DialogTitle>
              <DialogDescription>
                Detaillierte Informationen zur E-Rechnungs-Übertragung
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Übertragung Übersicht */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">E-Rechnung ID</Label>
                  <p className="text-sm">{selectedLog.eInvoiceId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Übertragungsmethode</Label>
                  <div className="flex items-center gap-2">
                    {getTransmissionIcon(selectedLog.transmissionMethod)}
                    <span className="text-sm">{selectedLog.transmissionMethod}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedLog.transmissionStatus)}
                    {getStatusBadge(selectedLog.transmissionStatus)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Übertragungszeit</Label>
                  <p className="text-sm">{formatDate(selectedLog.transmissionDate)}</p>
                </div>
              </div>

              <Separator />

              {/* Compliance-Details */}
              <div>
                <h4 className="font-medium mb-3">UStG §14 Compliance</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {selectedLog.legalCompliance.isUStGCompliant ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>UStG-konform</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedLog.legalCompliance.hasRequiredFields ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Pflichtfelder vollständig</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedLog.legalCompliance.isStructuredFormat ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Strukturiertes Format</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedLog.legalCompliance.enablesElectronicProcessing ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Elektronische Verarbeitung</span>
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-sm font-medium">Format-Standard</Label>
                  <Badge variant="outline" className="ml-2">
                    {selectedLog.legalCompliance.formatStandard}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Empfänger-Details */}
              <div>
                <h4 className="font-medium mb-3">Empfänger-Informationen</h4>
                <div className="space-y-2 text-sm">
                  {selectedLog.recipientEmail && (
                    <div>
                      <Label className="font-medium">E-Mail-Adresse</Label>
                      <p>{selectedLog.recipientEmail}</p>
                    </div>
                  )}
                  {selectedLog.recipientEndpoint && (
                    <div>
                      <Label className="font-medium">Endpoint</Label>
                      <p className="break-all">{selectedLog.recipientEndpoint}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fehler-Details falls vorhanden */}
              {selectedLog.errorMessage && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 text-red-700">Fehler-Details</h4>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">{selectedLog.errorMessage}</p>
                      <div className="mt-2 text-xs text-red-600">
                        Wiederholungen: {selectedLog.retryCount} / {selectedLog.maxRetries}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Aufbewahrung */}
              <Separator />
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Archivierung</span>
                </div>
                <p>Status: {selectedLog.archivalStatus === 'active' ? 'Aktiv' : 'Archiviert'}</p>
                <p>
                  Aufbewahrung bis:{' '}
                  {formatDate(
                    new Date(selectedLog.createdAt.getTime() + 8 * 365 * 24 * 60 * 60 * 1000)
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Schließen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function Label({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <label className={`text-sm font-medium ${className || ''}`} {...props}>
      {children}
    </label>
  );
}
