'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Building, TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import COMPLETE_DATEV_ACCOUNTS from '@/data/complete-datev-accounts';

// Account Type Labels
const ACCOUNT_TYPE_LABELS = {
  ASSET: { label: 'Aktiva', color: 'bg-blue-100 text-blue-800', icon: Building },
  LIABILITY: { label: 'Passiva', color: 'bg-purple-100 text-purple-800', icon: DollarSign },
  INCOME: { label: 'Ertrag', color: 'bg-green-100 text-green-800', icon: TrendingUp },
  EXPENSE: { label: 'Aufwand', color: 'bg-red-100 text-red-800', icon: TrendingDown },
} as const;

type AccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';

interface BookingAccount {
  number: string;
  name: string;
  type: AccountType;
}

interface DatevAccountCardsProps {
  onAccountSelect?: (account: BookingAccount) => void;
  selectedAccountId?: string;
  showSelectionOnly?: boolean;
  companyUid?: string;
}

export function DatevAccountCards({
  onAccountSelect,
  selectedAccountId,
  showSelectionOnly = false,
  companyUid,
}: DatevAccountCardsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter accounts based on search and type
  const filteredAccounts = useMemo(() => {
    return COMPLETE_DATEV_ACCOUNTS.filter(account => {
      const matchesSearch =
        searchTerm === '' ||
        account.number.includes(searchTerm) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || account.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [searchTerm, selectedType]);

  // Pagination
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const total = COMPLETE_DATEV_ACCOUNTS.length;
    const byType = COMPLETE_DATEV_ACCOUNTS.reduce(
      (acc, account) => {
        acc[account.type] = (acc[account.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return { total, byType };
  }, []);

  const handleAccountClick = (account: typeof COMPLETE_DATEV_ACCOUNTS[0]) => {
    if (onAccountSelect) {
      onAccountSelect(account as BookingAccount);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">DATEV Buchungskonten</h2>
          <p className="text-gray-600 mt-1">
            Vollständige DATEV-Kontenliste ({filteredAccounts.length} von {stats.total} Konten)
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Gesamt</div>
          </CardContent>
        </Card>
        {Object.entries(ACCOUNT_TYPE_LABELS).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-xl font-bold text-gray-900">{stats.byType[type] || 0}</div>
                <div className="text-xs text-gray-600">{config.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Suche nach Kontonummer oder -name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Kontotyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="ASSET">Aktiva</SelectItem>
                <SelectItem value="LIABILITY">Passiva</SelectItem>
                <SelectItem value="INCOME">Ertrag</SelectItem>
                <SelectItem value="EXPENSE">Aufwand</SelectItem>
              </SelectContent>
            </Select>

            {/* Items per page */}
            <Select
              value={itemsPerPage.toString()}
              onValueChange={value => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 pro Seite</SelectItem>
                <SelectItem value="50">50 pro Seite</SelectItem>
                <SelectItem value="100">100 pro Seite</SelectItem>
                <SelectItem value={filteredAccounts.length.toString()}>Alle anzeigen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account Cards Grid */}
      {paginatedAccounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedAccounts.map(account => {
            const typeConfig = ACCOUNT_TYPE_LABELS[account.type];
            const Icon = typeConfig.icon;
            const isSelected = selectedAccountId === account.number;

            return (
              <Card
                key={account.number}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
                  isSelected && 'ring-2 ring-[#14ad9f] bg-[#14ad9f]/5',
                  onAccountSelect && 'hover:bg-gray-50'
                )}
                onClick={() => handleAccountClick(account)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <CardTitle className="text-sm font-mono">{account.number}</CardTitle>
                    </div>
                    <Badge className={cn('text-xs', typeConfig.color)}>
                      {typeConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {account.name}
                  </CardDescription>
                  
                  {showSelectionOnly && (
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "w-full mt-3",
                        isSelected && "bg-[#14ad9f] hover:bg-taskilo-hover"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccountClick(account);
                      }}
                    >
                      {isSelected ? 'Ausgewählt' : 'Auswählen'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Konten gefunden</h3>
            <p className="text-gray-500">
              Versuchen Sie einen anderen Suchbegriff oder Filter.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Zeige {startIndex + 1} bis {Math.min(startIndex + itemsPerPage, filteredAccounts.length)} von{' '}
                {filteredAccounts.length} Konten
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Vorherige
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          currentPage === pageNum && "bg-[#14ad9f] hover:bg-taskilo-hover"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Nächste
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DatevAccountCards;