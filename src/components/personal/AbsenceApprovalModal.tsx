'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { type AbsenceRequest } from '@/services/personalService';

interface AbsenceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestProcessed: (requestId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => void;
  request: AbsenceRequest;
}

export function AbsenceApprovalModal({
  isOpen,
  onClose,
  onRequestProcessed,
  request,
}: AbsenceApprovalModalProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const getTypeLabel = (type: AbsenceRequest['type']) => {
    const labels = {
      VACATION: 'Urlaub',
      SICK: 'Krankheit',
      PERSONAL: 'Persönlich',
      TRAINING: 'Weiterbildung',
      OTHER: 'Sonstiges',
    };
    return labels[type];
  };

  const getTypeColor = (type: AbsenceRequest['type']) => {
    const colors = {
      VACATION: 'bg-blue-100 text-blue-800',
      SICK: 'bg-red-100 text-red-800',
      PERSONAL: 'bg-purple-100 text-purple-800',
      TRAINING: 'bg-green-100 text-green-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  const handleAction = async (action: 'APPROVED' | 'REJECTED') => {
    if (!request.id) return;

    try {
      setLoading(true);
      setSelectedAction(action);

      // Hier würde der API-Call zur Genehmigung/Ablehnung erfolgen
      // await PersonalService.processAbsenceRequest(request.id, action, notes);

      toast.success(
        action === 'APPROVED'
          ? 'Abwesenheitsantrag wurde genehmigt'
          : 'Abwesenheitsantrag wurde abgelehnt'
      );

      onRequestProcessed(request.id, action, notes);
      onClose();
      setNotes('');
      setSelectedAction(null);
    } catch (error) {
      toast.error('Fehler beim Verarbeiten des Antrags');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAction || !request.id) return;

    try {
      setLoading(true);

      // Hier würde der API-Call zur Genehmigung/Ablehnung erfolgen
      // await PersonalService.processAbsenceRequest(request.id, selectedAction, notes);

      toast.success(
        selectedAction === 'APPROVED'
          ? 'Abwesenheitsantrag wurde genehmigt'
          : 'Abwesenheitsantrag wurde abgelehnt'
      );

      onRequestProcessed(request.id, selectedAction, notes);
      onClose();
      setNotes('');
      setSelectedAction(null);
    } catch (error) {
      toast.error('Fehler beim Verarbeiten des Antrags');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Abwesenheitsantrag {request.status === 'APPROVED' ? 'bestätigen' : 'bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            Bestätigen oder bearbeiten Sie den Abwesenheitsantrag des Mitarbeiters.
          </DialogDescription>
        </DialogHeader>{' '}
        <div className="space-y-4">
          {/* Antragssteller */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Antragsteller:</span>
                  <span>{request.employeeName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(request.type)}>{getTypeLabel(request.type)}</Badge>
                  <Badge variant="outline">
                    {request.days} {request.days === 1 ? 'Tag' : 'Tage'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zeitraum */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Zeitraum:</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Von:</span>
                    <p className="font-medium">{formatDate(request.startDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Bis:</span>
                    <p className="font-medium">{formatDate(request.endDate)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grund */}
          {request.reason && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <span className="font-medium">Grund:</span>
                  <p className="text-sm text-gray-600">{request.reason}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zusätzliche Notizen vom Antragsteller */}
          {request.notes && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <span className="font-medium">Notizen vom Antragsteller:</span>
                  <p className="text-sm text-gray-600">{request.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Antragsdetails */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Eingereicht am:</span>
                  <span className="text-sm">
                    {request.requestedAt ? formatDate(request.requestedAt) : 'Unbekannt'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    Ausstehend
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HR Notizen */}
          <div>
            <Label htmlFor="hrNotes">
              HR Notizen {selectedAction === 'REJECTED' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="hrNotes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={
                selectedAction === 'REJECTED'
                  ? 'Grund für die Ablehnung...'
                  : 'Zusätzliche Bemerkungen (optional)...'
              }
              rows={3}
              className={selectedAction === 'REJECTED' ? 'border-red-300 focus:border-red-500' : ''}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Abbrechen
            </Button>

            <Button
              onClick={() => handleAction('REJECTED')}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {loading && selectedAction === 'REJECTED' ? 'Ablehnen...' : 'Ablehnen'}
            </Button>

            <Button
              onClick={() => handleAction('APPROVED')}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {loading && selectedAction === 'APPROVED' ? 'Genehmigen...' : 'Genehmigen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
