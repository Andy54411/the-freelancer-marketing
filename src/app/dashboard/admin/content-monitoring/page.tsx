/**
 * Admin Content-Überwachung - Monitoring aller Content-Verstöße
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Shield,
  Eye,
  Ban,
  Clock,
  CheckCircle,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Link,
  MessageCircle,
} from 'lucide-react';

interface ContentViolation {
  type: 'phone' | 'email' | 'address' | 'url' | 'social_media';
  match: string;
  position: number;
}

interface ViolationLog {
  id: string;
  companyId: string;
  companyName: string;
  userId: string;
  context: 'proposal' | 'chat' | 'order_message';
  originalText: string;
  violations: ContentViolation[];
  createdAt: { _seconds: number; _nanoseconds: number } | null;
  reviewed: boolean;
  action?: 'warning' | 'suspended' | 'banned' | null;
  reviewedBy?: string;
  reviewedAt?: { _seconds: number; _nanoseconds: number } | null;
  notes?: string;
}

const violationTypeIcons: Record<string, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  address: <MapPin className="h-4 w-4" />,
  url: <Link className="h-4 w-4" />,
  social_media: <MessageCircle className="h-4 w-4" />,
};

const violationTypeLabels: Record<string, string> = {
  phone: 'Telefon',
  email: 'E-Mail',
  address: 'Adresse',
  url: 'URL',
  social_media: 'Social Media',
};

const contextLabels: Record<string, string> = {
  proposal: 'Angebot',
  chat: 'Chat',
  order_message: 'Auftragsnachricht',
};

export default function ContentMonitoringPage() {
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<ViolationLog | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [filterUnreviewed, setFilterUnreviewed] = useState(true);

  const loadViolations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterUnreviewed) {
        params.set('unreviewed', 'true');
      }
      params.set('limit', '100');

      const response = await fetch(`/api/admin/content-violations?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden');
      }

      // Sortiere nach createdAt (absteigend)
      const violations = (data.violations || []) as ViolationLog[];
      violations.sort((a, b) => {
        const aTime = a.createdAt?._seconds || 0;
        const bTime = b.createdAt?._seconds || 0;
        return bTime - aTime;
      });

      setViolations(violations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(`Fehler beim Laden: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [filterUnreviewed]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  const handleAction = async (action: 'warning' | 'suspended' | 'banned' | 'dismiss') => {
    if (!selectedViolation) return;

    setProcessingAction(true);
    try {
      const response = await fetch('/api/admin/content-violations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          violationId: selectedViolation.id,
          action: action === 'dismiss' ? null : action,
          notes: actionNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Aktion');
      }

      if (action === 'suspended') {
        toast.success('Unternehmen vorübergehend gesperrt');
      } else if (action === 'banned') {
        toast.success('Unternehmen dauerhaft gesperrt');
      } else if (action === 'warning') {
        toast.success('Verwarnung erteilt');
      } else {
        toast.success('Verstoß abgewiesen');
      }

      setSelectedViolation(null);
      setActionNotes('');
      loadViolations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(errorMessage);
    } finally {
      setProcessingAction(false);
    }
  };

  const unreviewedCount = violations.filter(v => !v.reviewed).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-[#14ad9f]" />
          <div>
            <h1 className="text-2xl font-bold">Content-Überwachung</h1>
            <p className="text-sm text-gray-500">
              Monitoring von Nachrichten mit erkannten Kontaktdaten
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={filterUnreviewed ? 'default' : 'outline'}
            onClick={() => setFilterUnreviewed(!filterUnreviewed)}
            className={filterUnreviewed ? 'bg-[#14ad9f] hover:bg-teal-600' : ''}
          >
            {filterUnreviewed ? 'Nur Offene' : 'Alle anzeigen'}
          </Button>
          <Button variant="outline" onClick={loadViolations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Offene Verstöße</p>
                <p className="text-2xl font-bold">{unreviewedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Telefon-Verstöße</p>
                <p className="text-2xl font-bold">
                  {violations.filter(v => v.violations.some(vv => vv.type === 'phone')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">E-Mail-Verstöße</p>
                <p className="text-2xl font-bold">
                  {violations.filter(v => v.violations.some(vv => vv.type === 'email')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Gesperrt</p>
                <p className="text-2xl font-bold">
                  {violations.filter(v => v.action === 'banned' || v.action === 'suspended').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Violations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verstöße</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : violations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Keine offenen Verstöße</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Unternehmen</TableHead>
                  <TableHead>Kontext</TableHead>
                  <TableHead>Verstöße</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map(violation => (
                  <TableRow key={violation.id}>
                    <TableCell className="whitespace-nowrap">
                      {violation.createdAt?._seconds
                        ? new Date(violation.createdAt._seconds * 1000).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell className="font-medium">{violation.companyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contextLabels[violation.context]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(violation.violations.map(v => v.type))].map(type => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {violationTypeIcons[type]}
                            {violationTypeLabels[type]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {violation.reviewed ? (
                        violation.action === 'banned' ? (
                          <Badge variant="destructive">Gesperrt</Badge>
                        ) : violation.action === 'suspended' ? (
                          <Badge className="bg-orange-500">Vorübergehend</Badge>
                        ) : violation.action === 'warning' ? (
                          <Badge className="bg-yellow-500">Verwarnt</Badge>
                        ) : (
                          <Badge variant="secondary">Abgewiesen</Badge>
                        )
                      ) : (
                        <Badge className="bg-red-500">Offen</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedViolation(violation)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedViolation} onOpenChange={() => setSelectedViolation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Verstoß-Details
            </DialogTitle>
            <DialogDescription>
              {selectedViolation?.companyName} - {selectedViolation?.createdAt?._seconds
                ? new Date(selectedViolation.createdAt._seconds * 1000).toLocaleString('de-DE')
                : '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedViolation && (
            <div className="space-y-4">
              {/* Erkannte Verstöße */}
              <div>
                <h4 className="font-medium mb-2">Erkannte Verstöße:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedViolation.violations.map((v, i) => (
                    <Badge key={i} variant="destructive" className="flex items-center gap-1">
                      {violationTypeIcons[v.type]}
                      <span className="font-mono">{v.match}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Original Nachricht */}
              <div>
                <h4 className="font-medium mb-2">Original-Nachricht:</h4>
                <div className="bg-gray-50 p-4 rounded-lg border text-sm whitespace-pre-wrap">
                  {selectedViolation.originalText}
                </div>
              </div>

              {/* Notizen */}
              {!selectedViolation.reviewed && (
                <div>
                  <h4 className="font-medium mb-2">Notizen (optional):</h4>
                  <Textarea
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    placeholder="Begründung für die Aktion..."
                    rows={3}
                  />
                </div>
              )}

              {/* Bisherige Aktion */}
              {selectedViolation.reviewed && (
                <div>
                  <h4 className="font-medium mb-2">Durchgeführte Aktion:</h4>
                  <div className="flex items-center gap-2">
                    {selectedViolation.action === 'banned' ? (
                      <Badge variant="destructive">Dauerhaft gesperrt</Badge>
                    ) : selectedViolation.action === 'suspended' ? (
                      <Badge className="bg-orange-500">Vorübergehend gesperrt</Badge>
                    ) : selectedViolation.action === 'warning' ? (
                      <Badge className="bg-yellow-500">Verwarnung erteilt</Badge>
                    ) : (
                      <Badge variant="secondary">Abgewiesen</Badge>
                    )}
                  </div>
                  {selectedViolation.notes && (
                    <p className="text-sm text-gray-600 mt-2">{selectedViolation.notes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!selectedViolation?.reviewed && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => handleAction('dismiss')}
                disabled={processingAction}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Abweisen
              </Button>
              <Button
                variant="outline"
                className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                onClick={() => handleAction('warning')}
                disabled={processingAction}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Verwarnung
              </Button>
              <Button
                variant="outline"
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                onClick={() => handleAction('suspended')}
                disabled={processingAction}
              >
                <Clock className="h-4 w-4 mr-2" />
                Vorübergehend sperren
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction('banned')}
                disabled={processingAction}
              >
                <Ban className="h-4 w-4 mr-2" />
                Dauerhaft sperren
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
