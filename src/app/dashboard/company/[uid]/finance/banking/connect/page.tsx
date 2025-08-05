'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertCircle,
  Building2,
  CreditCard,
  Search,
  ArrowLeft,
  Zap,
  Shield,
  FlaskConical,
} from 'lucide-react';

interface Bank {
  id: number;
  name: string;
  isTestBank?: boolean;
  blz?: string;
  location?: string;
  city?: string;
  popularity?: number;
  interfaces?: unknown[];
}

export default function ConnectBankPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBanks, setAvailableBanks] = useState<Bank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<Bank[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  useEffect(() => {
    loadAvailableBanks();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = availableBanks.filter(
        bank =>
          bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bank.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBanks(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      // Show popular banks by default
      const popular = availableBanks
        .filter(bank => bank.popularity && bank.popularity > 50)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 15);
      setFilteredBanks(popular);
    }
  }, [searchTerm, availableBanks]);

  const loadAvailableBanks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load banks with test banks for sandbox environment
      const response = await fetch('/api/finapi/banks?includeTestBanks=true&perPage=50');

      if (!response.ok) {
        throw new Error(`Failed to load banks: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.banks)) {
        setAvailableBanks(data.data.banks);
      } else if (data.banks && Array.isArray(data.banks)) {
        // Fallback for direct banks array
        setAvailableBanks(data.banks);
      } else {
        throw new Error('Invalid response format - no banks data received');
      }
    } catch (error) {
      console.error('Error loading banks:', error);
      setError(
        'Die Bankliste konnte nicht geladen werden. Bitte prüfen Sie die finAPI Sandbox-Konfiguration.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBank = async (bank: Bank) => {
    if (connecting) return;

    setConnecting(true);
    setSelectedBank(bank);
    setError(null);

    try {
      console.log('🔗 Connecting to bank with WebForm 2.0:', bank.name);

      // Use new WebForm 2.0 API
      const response = await fetch('/api/finapi/connect-bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: bank.id,
          bankName: bank.name,
          userId: uid,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verbindung zur Bank fehlgeschlagen');
      }

      if (result.webForm && result.webForm.url) {
        console.log('✅ WebForm 2.0 URL received, redirecting...');
        // Redirect to WebForm 2.0
        window.location.href = result.webForm.url;
      } else {
        throw new Error('Keine WebForm URL erhalten');
      }
    } catch (err: unknown) {
      console.error('❌ Bank connection failed:', err);
      const error = err as Error;
      setError(error.message || 'Unbekannter Fehler bei der Bankverbindung');
      setConnecting(false);
      setSelectedBank(null);
    }
  };

  const handleGoBack = () => {
    router.push(`/dashboard/company/${uid}/finance/banking`);
  };

  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
        <Button variant="ghost" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank verbinden</h1>
          <p className="text-gray-600 mt-1">
            Wählen Sie Ihre Bank aus und verbinden Sie sie sicher mit WebForm 2.0
          </p>
        </div>
      </div>

      {/* WebForm 2.0 Info */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                WebForm 2.0 - Sichere Bankverbindung
              </h3>
              <p className="text-green-700 text-sm">
                Moderne, verschlüsselte Verbindung direkt zu Ihrer Bank ohne Speicherung von
                Zugangsdaten
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">PSD2 konform</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sandbox Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FlaskConical className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">finAPI Sandbox-Umgebung</h4>
              <p className="text-blue-700 text-sm">
                Dies ist eine Test-Umgebung mit Demo-Banken. Keine echten Bankdaten erforderlich.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800">Verbindungsfehler</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#14ad9f]" />
            Bank auswählen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Bank suchen (z.B. Deutsche Bank, Sparkasse...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBanks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'Keine Banken gefunden' : 'Keine Banken verfügbar'}
                </div>
              ) : (
                filteredBanks.map(bank => (
                  <div
                    key={bank.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedBank?.id === bank.id && connecting
                        ? 'border-blue-300 bg-blue-50'
                        : 'hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleConnectBank(bank)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{bank.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            {bank.city && (
                              <span className="text-sm text-gray-600">{bank.city}</span>
                            )}
                            {bank.blz && (
                              <span className="text-sm text-gray-600">BLZ: {bank.blz}</span>
                            )}
                            {bank.isTestBank && (
                              <Badge variant="secondary" className="text-xs">
                                Test Bank
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedBank?.id === bank.id && connecting ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Verbinde...</span>
                          </div>
                        ) : (
                          <Button size="sm" className="bg-[#14ad9f] hover:bg-[#129488]">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Verbinden
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
