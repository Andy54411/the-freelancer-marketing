'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Ticket,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';

interface TrialInfo {
  trialStartDate: string;
  trialEndDate: string;
  daysRemaining: number;
  isExpired: boolean;
  isBlocked: boolean;
  promoCode?: string;
  promoExpiresAt?: string;
}

interface PromoCodeCardProps {
  companyId: string;
}

export function PromoCodeCard({ companyId }: PromoCodeCardProps) {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [durationDays, setDurationDays] = useState(30);
  const [notes, setNotes] = useState('');

  const loadTrialInfo = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/promo-code`);
      const data = await response.json();
      
      if (data.success) {
        setTrialInfo(data.trialInfo);
      }
    } catch {
      toast.error('Fehler beim Laden der Trial-Informationen');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadTrialInfo();
  }, [loadTrialInfo]);

  const generatePromoCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/promo-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays, notes }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Promo-Code erstellt: ${data.promoCode.code}`);
        setNotes('');
        loadTrialInfo();
      } else {
        toast.error(data.error || 'Fehler beim Erstellen des Promo-Codes');
      }
    } catch {
      toast.error('Fehler beim Erstellen des Promo-Codes');
    } finally {
      setGenerating(false);
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Promo-Code kopiert');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="h-5 w-5 mr-2" />
            Testphase & Promo-Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Ticket className="h-5 w-5 mr-2" />
            Testphase & Promo-Code
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadTrialInfo}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Banner */}
        {trialInfo && (
          <div className={`p-4 rounded-lg ${
            trialInfo.isBlocked 
              ? 'bg-red-50 border border-red-200' 
              : trialInfo.isExpired 
                ? 'bg-yellow-50 border border-yellow-200'
                : trialInfo.daysRemaining <= 3 
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              {trialInfo.isBlocked ? (
                <Lock className="h-5 w-5 text-red-500" />
              ) : trialInfo.isExpired ? (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  trialInfo.isBlocked ? 'text-red-800' : 
                  trialInfo.isExpired ? 'text-yellow-800' : 'text-green-800'
                }`}>
                  {trialInfo.isBlocked 
                    ? 'Account gesperrt' 
                    : trialInfo.isExpired 
                      ? 'Testphase abgelaufen'
                      : `${trialInfo.daysRemaining} ${trialInfo.daysRemaining === 1 ? 'Tag' : 'Tage'} verbleibend`
                  }
                </p>
                <p className={`text-sm ${
                  trialInfo.isBlocked ? 'text-red-600' : 
                  trialInfo.isExpired ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {trialInfo.promoCode 
                    ? `Promo-Code aktiv bis ${formatDate(trialInfo.promoExpiresAt!)}`
                    : `Testphase endet am ${formatDate(trialInfo.trialEndDate)}`
                  }
                </p>
              </div>
              {trialInfo.isBlocked && (
                <Badge className="bg-red-100 text-red-800">
                  <Lock className="h-3 w-3 mr-1" />
                  Gesperrt
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Aktiver Promo-Code */}
        {trialInfo?.promoCode && (
          <>
            <Separator />
            <div>
              <Label className="text-sm text-gray-500">Aktiver Promo-Code</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg font-mono text-sm">
                  {trialInfo.promoCode}
                </code>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyPromoCode(trialInfo.promoCode!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Promo-Code Generator */}
        <div>
          <Label className="text-sm font-medium">Neuen Promo-Code generieren</Label>
          <p className="text-xs text-gray-500 mb-3">
            Verlaengert die Testphase und entsperrt den Account falls blockiert
          </p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="duration" className="text-xs">Laufzeit (Tage)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-xs">Notizen (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Sonderaktion, VIP-Kunde..."
                className="mt-1"
              />
            </div>

            <Button 
              onClick={generatePromoCode}
              disabled={generating}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Promo-Code generieren ({durationDays} Tage)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => { setDurationDays(7); }}
          >
            <Clock className="h-3 w-3 mr-1" />
            7 Tage
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => { setDurationDays(30); }}
          >
            <Clock className="h-3 w-3 mr-1" />
            30 Tage
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => { setDurationDays(90); }}
          >
            <Clock className="h-3 w-3 mr-1" />
            90 Tage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
