'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Shield, CheckCircle } from 'lucide-react';
import FinAPIWebFormModal from '@/components/FinAPIWebFormModal';
import { getFinAPICredentialType } from '@/lib/finapi-config';

export default function ConnectBankPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bankName = searchParams?.get('bank') || 'Bank';
  const bic = searchParams?.get('bic') || '';
  const blz = searchParams?.get('blz') || '';
  const finapiId = searchParams?.get('finapiId') || '';
  const location = searchParams?.get('location') || '';
  const isTestBank = searchParams?.get('isTestBank') === 'true';
  const uid = params?.uid as string;

  const [startDate, setStartDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWebFormModalOpen, setIsWebFormModalOpen] = useState(false);
  const [webFormUrl, setWebFormUrl] = useState<string>('');
  const [webFormBankName, setWebFormBankName] = useState<string>('');
  const [checkingConnection, setCheckingConnection] = useState(true);

  const credentialType = getFinAPICredentialType();

  // Check for existing bank connections on component mount
  React.useEffect(() => {
    const checkExistingConnections = async () => {
      try {
        setCheckingConnection(true);
        
        // Check FinAPI connections
        const finapiResponse = await fetch(
          `/api/finapi/bank-connections?userId=${uid}&credentialType=${credentialType}`
        );
        
        if (finapiResponse.ok) {
          const finapiData = await finapiResponse.json();
          if (finapiData.success && finapiData.connections && finapiData.connections.length > 0) {
            // Already connected - redirect to banking accounts
            router.push(`/dashboard/company/${uid}/banking/accounts`);
            return;
          }
        }

        // Check enhanced accounts API
        const accountsResponse = await fetch(
          `/api/finapi/accounts-enhanced?userId=${uid}&credentialType=${credentialType}`
        );
        
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          if (accountsData.success && accountsData.accounts && accountsData.accounts.length > 0 && accountsData.source !== 'mock_data') {
            // Already connected - redirect to banking accounts
            router.push(`/dashboard/company/${uid}/banking/accounts`);
            return;
          }
        }

        // Check Revolut connections
        const revolutResponse = await fetch(`/api/revolut/accounts?userId=${uid}`);
        if (revolutResponse.ok) {
          const revolutData = await revolutResponse.json();
          if (revolutData.success && revolutData.accounts && revolutData.accounts.length > 0) {
            // Already connected - redirect to banking accounts
            router.push(`/dashboard/company/${uid}/banking/accounts`);
            return;
          }
        }

      } catch (error) {
        console.error('Fehler beim Prüfen der Bankverbindungen:', error);
        // Continue to show connect form on error
      } finally {
        setCheckingConnection(false);
      }
    };

    if (uid) {
      checkExistingConnections();
    }
  }, [uid, credentialType, router]);

  // Function to get the correct bank logo filename
  const getBankLogoPath = (name: string): string => {
    const bankMappings: {[key: string]: string;} = {
      'sparkasse': 'Sparkasse.png',
      'deutsche bank': 'Deutsche_Bank.png',
      'commerzbank': 'Commerzbank.png',
      'volksbank': 'Volksbanken_Raiffeisenbanken.png',
      'n26': 'N26.png',
      'paypal': 'Paypal.png',
      'qonto': 'Qonto.png',
      'fyrst': 'Fyrst.png',
      'norisbank': 'Deutsche_Bank.png'
    };

    const normalizedName = name.toLowerCase();
    const logoFile = bankMappings[normalizedName];

    return logoFile ? `/images/banks/${logoFile}` : '/images/banks/default-bank-logo.svg';
  };

  const handleBack = () => {
    router.back();
  };

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      // FinAPI Sandbox Test: Erstelle WebForm für Bankverbindung
      const response = await fetch('/api/finapi/webform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bankId: finapiId || mapBankNameToBankId(bankName), // Use echte FinAPI ID oder Fallback
          userId: uid,
          credentialType: credentialType,
          bankName: bankName,
          companyId: uid,
          startDate: startDate
        })
      });

      const data = await response.json();

      if (data.success && data.webFormUrl) {
        // Öffne FinAPI WebForm Modal
        setWebFormUrl(data.webFormUrl);
        setWebFormBankName(data.bankName || bankName);
        setIsWebFormModalOpen(true);

      } else {
        // Fehler beim Erstellen der WebForm
        console.error('❌ FinAPI WebForm Fehler:', data);
        alert(`Fehler beim Verbinden mit ${bankName}: ${data.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      console.error('❌ FinAPI Integration Fehler:', error);
      alert(`Verbindungsfehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Map bank names to finAPI bank IDs (Sandbox Test-Bank IDs)
  const mapBankNameToBankId = (name: string): number => {
    const bankIdMappings: {[key: string]: number;} = {
      'sparkasse': 277672, // finAPI Sandbox Test Bank ID
      'deutsche bank': 277672,
      'commerzbank': 277672,
      'volksbank': 277672,
      'n26': 277672,
      'paypal': 277672,
      'qonto': 277672,
      'fyrst': 277672,
      'norisbank': 277672
    };

    const normalizedName = name.toLowerCase();
    return bankIdMappings[normalizedName] || 277672; // Fallback to test bank
  };

  const handleWebFormSuccess = () => {
    setIsWebFormModalOpen(false);
    // Redirect back to banking overview with success message
    router.push(`/dashboard/company/${uid}/banking?connected=true&bank=${encodeURIComponent(bankName)}`);
  };

  const handleWebFormClose = () => {
    setIsWebFormModalOpen(false);
  };

  const handleWebFormError = (error: string) => {
    console.error('❌ FinAPI WebForm Fehler:', error);
    alert(`Fehler bei der Bankverbindung: ${error}`);
    setIsWebFormModalOpen(false);
  };

  const handleCancel = () => {
    router.back();
  };

  // Show loading while checking for existing connections
  if (checkingConnection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Prüfe bestehende Bankverbindungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2">

                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Konto hinzufügen
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Bank Connection Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Bank Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <img
                      src={getBankLogoPath(bankName)}
                      alt={bankName}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const sibling = target.nextElementSibling as HTMLElement;
                        target.style.display = 'none';
                        if (sibling) {
                          sibling.style.display = 'block';
                        }
                      }} />

                    <div className="w-8 h-8 bg-[#14ad9f] rounded flex items-center justify-center text-white font-semibold text-sm" style={{ display: 'none' }}>
                      {bankName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">{bankName}</h3>
                      {isTestBank &&
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Sandbox
                        </span>
                      }
                    </div>
                    <p className="text-sm text-gray-500">
                      BIC: {bic} · BLZ: {blz}
                      {location && ` · ${location}`}
                    </p>
                    {finapiId &&
                    <p className="text-xs text-gray-400">
                        FinAPI ID: {finapiId}
                      </p>
                    }
                  </div>
                </div>

                {/* Date Selection */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">
                      Startdatum für Zahlungsimport (Optional)
                    </Label>
                    <div className="mt-1 relative">
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="TT.MM.JJJJ"
                        className="pr-10" />

                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Bitte beachte: Manche Banken haben zeitliche Importbeschränkungen.</p>
                    <p className="text-amber-600">Das Datum muss mindestens 14 Tage in der Vergangenheit liegen.</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}>

                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={isLoading}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white">

                    {isLoading ? 'Erstelle FinAPI WebForm...' : 'Mit Bank verbinden'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FinAPI Security Banner */}
          <Card className="bg-blue-50 border border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Höchste Sicherheit durch finAPI - Deutschlands führender Banking-Partner
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Deine Bankdaten werden mit militärischer 256-Bit-Verschlüsselung geschützt und ausschließlich in deutschen, BaFin-regulierten Rechenzentren gespeichert. Weder Taskilo noch finAPI haben Zugriff auf deine Kontoinformationen - nur du behältst die volle Kontrolle über deine Finanzdaten.
                  </p>
                </div>
                <div className="flex-shrink-0 relative">
                  <div className="w-24 h-24 bg-white rounded-lg shadow-sm flex items-center justify-center p-2">
                    <img
                      src="/images/banks/finAPI_Logo.png.webp"
                      alt="finAPI Logo"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        // Fallback to shield icon if logo not found
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.innerHTML = '<svg class="h-8 w-8 text-[#14ad9f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>';
                        target.parentElement?.appendChild(fallback);
                      }} />

                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FinAPI WebForm Modal */}
      <FinAPIWebFormModal
        isOpen={isWebFormModalOpen}
        onClose={handleWebFormClose}
        onSuccess={handleWebFormSuccess}
        onError={handleWebFormError}
        webFormUrl={webFormUrl}
        bankName={webFormBankName} />

    </div>);

}