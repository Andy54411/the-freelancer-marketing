// 🎯 Google Ads Account Selector Component
// Ermöglicht die Auswahl eines spezifischen Google Ads Accounts für Kampagnen-Erstellung

'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  status: 'ENABLED' | 'PAUSED' | 'SUSPENDED' | 'UNKNOWN' | 'AKTIV';
  manager?: boolean;
  testAccount?: boolean;
  timezone?: string;
  linkedAt?: string;
}

interface AccountSelectorProps {
  companyId: string;
  selectedAccountId?: string;
  onAccountSelect: (accountId: string, account: GoogleAdsAccount) => void;
  className?: string;
}

export function AccountSelector({
  companyId,
  selectedAccountId,
  onAccountSelect,
  className,
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Lade verfügbare Google Ads Accounts
  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading accounts for companyId:', companyId);
      const response = await fetch(`/api/google-ads/status?companyId=${companyId}`);
      const result = await response.json();

      console.log('📊 Account loading result:', result);

      if (result.success && result.data?.accounts) {
        console.log('📋 Raw accounts:', result.data.accounts);

        // Filtere nur aktive, echte Accounts
        const activeAccounts = result.data.accounts.filter((account: GoogleAdsAccount) => {
          console.log('🔍 Checking account:', {
            id: account.id,
            status: account.status,
            testAccount: account.testAccount,
          });
          // Akzeptiere sowohl ENABLED als auch AKTIV Status
          const isActive = account.status === 'ENABLED' || account.status === 'AKTIV';
          const isReal = !account.testAccount;
          return isActive && isReal;
        });

        console.log('✅ Active accounts found:', activeAccounts);
        setAccounts(activeAccounts);

        // Wähle automatisch den ersten aktiven Account, wenn keiner gewählt ist
        if (activeAccounts.length > 0 && !selectedAccountId) {
          const defaultAccount = activeAccounts[0];
          console.log('🎯 Auto-selecting default account:', defaultAccount);
          onAccountSelect(defaultAccount.id, defaultAccount);
        }
      } else {
        console.log('❌ No accounts in response:', result);
        throw new Error(result.error || 'Keine Google Ads Accounts gefunden');
      }
    } catch (err) {
      console.error('❌ Account loading error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadAccounts();
    }
  }, [companyId]);

  const selectedAccount = accounts.find(account => account.id === selectedAccountId);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#14ad9f]" />
            Google Ads Account
          </CardTitle>
          <CardDescription>Wählen Sie den Account für die Kampagne</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade verfügbare Accounts...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#14ad9f]" />
            Google Ads Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={loadAccounts} className="mt-3">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#14ad9f]" />
            Google Ads Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Keine aktiven Google Ads Accounts gefunden. Bitte verbinden Sie zuerst einen Account.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#14ad9f]" />
          Google Ads Account auswählen
        </CardTitle>
        <CardDescription>
          Wählen Sie den Account für die Kampagnen-Erstellung ({accounts.length} aktive Accounts
          verfügbar)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedAccount ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{selectedAccount.name}</span>
                    <span className="text-xs text-gray-500">
                      Customer ID: {selectedAccount.id} • {selectedAccount.currency}
                    </span>
                  </div>
                </div>
              ) : (
                'Account auswählen...'
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Account suchen..." />
              <CommandEmpty>Kein Account gefunden.</CommandEmpty>
              <CommandGroup>
                {accounts.map(account => (
                  <CommandItem
                    key={account.id}
                    value={`${account.name} ${account.id}`}
                    onSelect={() => {
                      onAccountSelect(account.id, account);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedAccountId === account.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {account.currency}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 text-xs">AKTIV</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Customer ID: {account.id}
                        {account.timezone && ` • ${account.timezone}`}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Gewählter Account Details */}
        {selectedAccount && (
          <div className="mt-4 p-3 bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{selectedAccount.name}</div>
                <div className="text-sm text-gray-600">Customer ID: {selectedAccount.id}</div>
                {selectedAccount.timezone && (
                  <div className="text-xs text-gray-500">Zeitzone: {selectedAccount.timezone}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-green-100 text-green-800">AKTIV</Badge>
                <div className="text-xs text-gray-500">{selectedAccount.currency}</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-gray-500">
          Nur aktive, echte Google Ads Accounts werden angezeigt.
        </div>
      </CardContent>
    </Card>
  );
}
