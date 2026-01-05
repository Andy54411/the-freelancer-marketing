/**
 * MarketplaceProposalCard - Zeigt ein Angebot für ein Marktplatz-Projekt an
 * 
 * Flow:
 * 1. Kunde sieht Angebot (Preis, Nachricht - KEINE Kontaktdaten)
 * 2. Kunde nimmt Angebot an → Zahlt vollen Betrag ins Escrow
 * 3. Nach Escrow-Zahlung: BEIDE Seiten sehen Kontaktdaten
 */
'use client';

import React, { useState } from 'react';
import { 
  Euro, 
  Clock, 
  Calendar, 
  Mail, 
  Phone, 
  Building, 
  Lock, 
  Unlock, 
  Check, 
  X,
  Loader2,
  CreditCard,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Proposal {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  message: string;
  proposedPrice: number;
  currency?: string;
  estimatedDuration?: string;
  availableDate?: string;
  status: 'pending' | 'accepted' | 'declined' | 'escrow_paid';
  createdAt: Date | string;
  // Nach Escrow-Zahlung verfügbar
  escrowPaid?: boolean;
  escrowId?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
}

interface ProviderDetails {
  companyName: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

interface MarketplaceProposalCardProps {
  proposal: Proposal;
  projectId: string;
  projectTitle: string;
  customerId: string;
  onAcceptAndPay?: (proposalId: string, amount: number) => void;
  onDecline?: (proposalId: string) => void;
  onEscrowComplete?: (proposalId: string, providerDetails: ProviderDetails) => void;
}

export default function MarketplaceProposalCard({
  proposal,
  projectId,
  projectTitle,
  customerId,
  onAcceptAndPay,
  onDecline,
  onEscrowComplete,
}: MarketplaceProposalCardProps) {
  const { firebaseUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  
  // Kontaktdaten sind nur sichtbar wenn Escrow bezahlt wurde
  const isContactVisible = proposal.status === 'escrow_paid' || proposal.escrowPaid === true;

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'Nicht angegeben';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  // Angebot annehmen und zur Escrow-Zahlung weiterleiten
  const handleAcceptAndPay = async () => {
    if (!firebaseUser) {
      toast.error('Bitte melden Sie sich an');
      return;
    }

    setIsProcessing(true);

    try {
      const token = await firebaseUser.getIdToken();
      
      // Escrow erstellen über bestehende API (mit action: 'create')
      const response = await fetch('/api/payment/escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create',
          orderId: `marketplace_${projectId}_${proposal.id}`,
          buyerId: customerId,
          amount: Math.round(proposal.proposedPrice * 100), // In Cent
          currency: proposal.currency || 'EUR',
          providerId: proposal.companyId,
          paymentMethod: 'card',
          description: `Marktplatz-Auftrag: ${projectTitle}`,
          // Zusätzliche Metadaten für den Webhook
          proposalId: proposal.id,
          projectId: projectId,
          isMarketplaceOrder: true,
          orderDetails: {
            projectId,
            projectTitle,
            proposalId: proposal.id,
            proposedPrice: proposal.proposedPrice,
            providerName: proposal.companyName,
            isMarketplaceOrder: true,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Escrow-Zahlung');
      }

      // Weiterleitung zur Zahlungsseite - im neuen Tab öffnen
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        toast.success('Checkout wurde in einem neuen Tab geöffnet.');
      } else if (data.clientSecret) {
        // Stripe Elements Payment (falls implementiert)
        onAcceptAndPay?.(proposal.id, proposal.proposedPrice);
      } else {
        toast.success('Escrow erfolgreich erstellt. Bitte überweisen Sie den Betrag.');
        onAcceptAndPay?.(proposal.id, proposal.proposedPrice);
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler bei der Zahlung');
    } finally {
      setIsProcessing(false);
      setShowPaymentConfirm(false);
    }
  };

  // Angebot ablehnen
  const handleDecline = async () => {
    if (!firebaseUser) return;
    
    setIsProcessing(true);
    try {
      const token = await firebaseUser.getIdToken();
      
      const response = await fetch(`/api/marketplace/proposals/${proposal.id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Ablehnen');
      }

      toast.success('Angebot abgelehnt');
      onDecline?.(proposal.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`
      ${proposal.status === 'escrow_paid' ? 'border-green-300 bg-green-50/50' : ''}
      ${proposal.status === 'accepted' ? 'border-yellow-300 bg-yellow-50/50' : ''}
      ${proposal.status === 'declined' ? 'border-red-300 bg-red-50/50' : ''}
      ${proposal.status === 'pending' ? 'border-gray-200' : ''}
    `}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {proposal.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proposal.companyLogo}
                alt={proposal.companyName}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#14ad9f]/10 flex items-center justify-center">
                <Building className="w-6 h-6 text-[#14ad9f]" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{proposal.companyName}</CardTitle>
              <p className="text-sm text-gray-500">
                Angebot vom {formatDate(proposal.createdAt)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {proposal.status === 'escrow_paid' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <ShieldCheck className="w-3 h-3" />
              Bezahlt (Escrow)
            </span>
          )}
          {proposal.status === 'accepted' && !proposal.escrowPaid && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <Clock className="w-3 h-3" />
              Warte auf Zahlung
            </span>
          )}
          {proposal.status === 'declined' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              <X className="w-3 h-3" />
              Abgelehnt
            </span>
          )}
          {proposal.status === 'pending' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <Clock className="w-3 h-3" />
              Neues Angebot
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Angebotene Nachricht */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Nachricht des Anbieters</h4>
          <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{proposal.message}</p>
        </div>

        {/* Preis und Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="flex items-center gap-1 text-gray-600 text-sm mb-1">
              <Euro className="w-4 h-4" />
              Angebotspreis
            </div>
            <p className="font-bold text-xl text-[#14ad9f]">
              {formatCurrency(proposal.proposedPrice, proposal.currency)}
            </p>
          </div>
          
          {proposal.estimatedDuration && (
            <div>
              <div className="flex items-center gap-1 text-gray-600 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Geschätzte Dauer
              </div>
              <p className="font-medium">{proposal.estimatedDuration}</p>
            </div>
          )}
          
          {proposal.availableDate && (
            <div>
              <div className="flex items-center gap-1 text-gray-600 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Verfügbar ab
              </div>
              <p className="font-medium">{formatDate(proposal.availableDate)}</p>
            </div>
          )}
        </div>

        {/* Kontaktdaten Section */}
        <div className="border-t pt-4">
          {isContactVisible ? (
            // Kontaktdaten nach Escrow-Zahlung sichtbar
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Unlock className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Kontaktdaten des Anbieters</h4>
              </div>
              <div className="space-y-2">
                {proposal.companyEmail && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a 
                      href={`mailto:${proposal.companyEmail}`}
                      className="hover:text-[#14ad9f] hover:underline"
                    >
                      {proposal.companyEmail}
                    </a>
                  </div>
                )}
                {proposal.companyPhone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <a 
                      href={`tel:${proposal.companyPhone}`}
                      className="hover:text-[#14ad9f] hover:underline"
                    >
                      {proposal.companyPhone}
                    </a>
                  </div>
                )}
                {proposal.companyWebsite && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Building className="w-4 h-4 text-gray-500" />
                    <a 
                      href={proposal.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#14ad9f] hover:underline"
                    >
                      Website besuchen
                    </a>
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Der Auftragsbetrag ist sicher im Escrow hinterlegt.
                </p>
              </div>
            </div>
          ) : (
            // Kontaktdaten gesperrt bis Escrow bezahlt
            <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-gray-500" />
                <h4 className="font-semibold text-gray-700">Kontaktdaten werden nach Zahlung freigeschaltet</h4>
              </div>
              <p className="text-sm text-gray-600">
                Nehmen Sie das Angebot an und zahlen Sie den Betrag sicher ins Escrow. 
                Danach sehen beide Seiten die Kontaktdaten.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {proposal.status === 'pending' && (
          <>
            {!showPaymentConfirm ? (
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setShowPaymentConfirm(true)}
                  disabled={isProcessing}
                  className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Angebot annehmen
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Ablehnen
                </Button>
              </div>
            ) : (
              // Zahlungsbestätigung
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800">Angebot annehmen und bezahlen</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Mit der Zahlung von <strong>{formatCurrency(proposal.proposedPrice)}</strong> wird der Betrag 
                      sicher im Escrow hinterlegt. Nach erfolgreicher Zahlung werden die Kontaktdaten 
                      für beide Seiten freigeschaltet.
                    </p>
                  </div>
                </div>
                
                <div className="p-3 bg-white rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Auftragsbetrag (Escrow)</span>
                    <span className="font-bold text-lg">{formatCurrency(proposal.proposedPrice)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Wird nach Auftragsabschluss an den Anbieter ausgezahlt (minus Plattformgebühr)
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAcceptAndPay}
                    disabled={isProcessing}
                    className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Wird verarbeitet...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Jetzt bezahlen
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowPaymentConfirm(false)}
                    disabled={isProcessing}
                    variant="outline"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info wenn bereits angenommen aber noch nicht bezahlt */}
        {proposal.status === 'accepted' && !proposal.escrowPaid && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800">Zahlung ausstehend</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Bitte schließen Sie die Escrow-Zahlung ab, um die Kontaktdaten freizuschalten.
                </p>
              </div>
            </div>
            <Button
              onClick={handleAcceptAndPay}
              disabled={isProcessing}
              className="mt-3 bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Jetzt bezahlen ({formatCurrency(proposal.proposedPrice)})
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
