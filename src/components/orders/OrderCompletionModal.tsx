'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, Star, CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface OrderCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    title: string;
    description: string;
    selectedAnbieterId: string;
    companyName?: string;
    totalAmountPaidByBuyer: number;
    companyNetAmount: number;
    platformFeeAmount: number;
    status: string;
  };
  userId: string;
  onOrderCompleted: () => void;
}

const OrderCompletionModal: React.FC<OrderCompletionModalProps> = ({
  isOpen,
  onClose,
  order,
  userId,
  onOrderCompleted,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [review, setReview] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleComplete = async () => {
    if (!order || !userId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/${userId}/orders/${order.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          review,
          completionNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete order');
      }

      toast.success('Auftrag erfolgreich abgeschlossen!', {
        description:
          data.payoutStatus === 'transferred'
            ? 'Die Auszahlung wurde automatisch veranlasst.'
            : 'Die Auszahlung wird verarbeitet.',
      });

      onOrderCompleted();
      onClose();
    } catch (error: any) {

      toast.error('Fehler beim Abschließen des Auftrags', {
        description: error.message || 'Bitte versuchen Sie es später erneut.',
      });
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleSubmit = () => {
    // Zeige Bestätigungsdialog vor dem Abschließen
    setShowConfirmation(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Auftrag abschließen
            </DialogTitle>
            <DialogDescription>
              Markieren Sie den Auftrag als erledigt und bewerten Sie die Dienstleistung.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{order.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gesamtbetrag:</span>
                  <span className="font-medium">
                    {(order.totalAmountPaidByBuyer / 100).toFixed(2)}€
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bewertung</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1 rounded ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">({rating} von 5 Sternen)</span>
              </div>
            </div>

            {/* Review */}
            <div className="space-y-2">
              <label htmlFor="review" className="text-sm font-medium">
                Bewertungstext (optional)
              </label>
              <Textarea
                id="review"
                placeholder="Teilen Sie Ihre Erfahrung mit anderen..."
                value={review}
                onChange={e => setReview(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Completion Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Abschlussnotizen (optional)
              </label>
              <Textarea
                id="notes"
                placeholder="Zusätzliche Informationen zum Abschluss..."
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            {/* Payout Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Automatische Auszahlung</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Nach Abschluss wird das Geld automatisch an den Anbieter ausgezahlt. Dies kann
                    1-2 Werktage dauern.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {isLoading ? 'Wird abgeschlossen...' : 'Auftrag abschließen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Auftrag abschließen bestätigen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Auftrag als erledigt markieren möchten? Diese Aktion
              löst die automatische Auszahlung an den Anbieter aus und kann nicht rückgängig gemacht
              werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmation(false)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              Ja, abschließen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderCompletionModal;
