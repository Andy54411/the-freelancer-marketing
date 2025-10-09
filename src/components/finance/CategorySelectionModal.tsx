'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Star,
  Clock,
  Grid3X3,
  Wallet,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  Building2,
  Package,
  Briefcase,
  Car,
  Home,
  Utensils,
  Users,
  Building,
  Plane,
  MoreHorizontal,
  Heart,
  Shield,
  Megaphone,
  Percent,
  Percent as Tax,
  CreditCard,
  User,
  FileText,
  Calculator,
  Banknote,
  Handshake,
  Minus } from
'lucide-react';
import { BookingAccountService, BookingAccount } from '@/services/bookingAccountService';
import { DatevCardService, DatevCard } from '@/services/datevCardService';
import { DATEV_CATEGORY_MAPPINGS, findMappingByAccountNumber, getMappingsByCategory } from '@/data/datev-category-mapping-complete';
import {
  getAllIncomeMappings,
  findIncomeMappingByAccountNumber,
  getIncomeMappingsByCategory,
  incomeKategorienBeschreibungen,
  getAllIncomeCategories } from
'@/data/datev-income-mapping-complete';
import { Timestamp } from 'firebase/firestore';
import { FavoriteDatevAccountService } from '@/services/favoriteDatevAccountService';

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon: React.ReactNode;
  isFavorite?: boolean;
}

interface CategoryGroup {
  id: string;
  name: string;
  categories: Category[];
}

interface CategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: BookingAccount) => void;
  initialCategory?: string;
  hideBankingAccounts?: boolean;
  selectedCategory?: Category;
  companyUid?: string;
  transactionType?: 'ALL' | 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY';
  companyId?: string; // Für Favoriten-System
}

export default function CategorySelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedCategory,
  companyUid,
  transactionType = 'ALL',
  companyId
}: CategorySelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(selectedCategory?.id || null);
  const [bookingAccounts, setBookingAccounts] = useState<BookingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [datevCards, setDatevCards] = useState<DatevCard[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDatevType, setSelectedDatevType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'>('ALL');
  const [favoriteAccounts, setFavoriteAccounts] = useState<string[]>([]);
  const itemsPerPage = 20;

  // TODO: Favoriten-System implementieren
  const currentCompanyId = companyId || companyUid;

  // Lade Buchungskonten beim Öffnen des Modals
  useEffect(() => {
    if (isOpen && companyUid) {
      loadBookingAccounts();
      loadDatevCards();
    }
  }, [isOpen, companyUid]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDatevType]);

  // Lade Favoriten beim Öffnen des Modals
  useEffect(() => {
    const loadFavorites = async () => {
      if (isOpen && currentCompanyId) {
        try {
          const favorites = await FavoriteDatevAccountService.getFavorites(currentCompanyId);
          setFavoriteAccounts(favorites.map((fav) => fav.code));
        } catch (error) {
          console.error('Fehler beim Laden der Favoriten:', error);
        }
      }
    };

    loadFavorites();
  }, [isOpen, currentCompanyId]);

  const loadBookingAccounts = async () => {
    setLoading(true);
    try {
      if (!companyUid) {
        console.warn('No companyUid provided');
        return;
      }
      const accounts = await BookingAccountService.getBookingAccounts(companyUid);
      setBookingAccounts(accounts);
    } catch (error) {
      console.error('Fehler beim Laden der Buchungskonten:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDatevCards = () => {
    try {
      let cards = DatevCardService.getAllCards();

      // Filter DATEV cards based on transaction type
      if (transactionType === 'INCOME') {
        cards = cards.filter((card) => card.type === 'INCOME');
      } else if (transactionType === 'EXPENSE') {
        cards = cards.filter((card) => card.type === 'EXPENSE');
      }
      // Bei 'ALL' werden alle Karten geladen

      setDatevCards(cards);
    } catch (error) {
      console.error('Fehler beim Laden der DATEV-Konten:', error);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: {[key: string]: React.ReactNode;} = {
      'TrendingUp': <TrendingUp className="h-5 w-5" />,
      'TrendingDown': <TrendingDown className="h-5 w-5" />,
      'Package': <Package className="h-5 w-5" />,
      'Users': <Users className="h-5 w-5" />,
      'Briefcase': <Briefcase className="h-5 w-5" />,
      'Car': <Car className="h-5 w-5" />,
      'Home': <Home className="h-5 w-5" />,
      'FileText': <FileText className="h-5 w-5" />,
      'Calculator': <Calculator className="h-5 w-5" />,
      'Building2': <Building2 className="h-5 w-5" />,
      'CreditCard': <CreditCard className="h-5 w-5" />,
      'Banknote': <Banknote className="h-5 w-5" />
    };
    return iconMap[iconName] || <Building2 className="h-5 w-5" />;
  };

  // Sample category data based on the HTML structure - filtered by transaction type
  const getAllCategoryGroups = (): CategoryGroup[] => [
  {
    id: 'overview',
    name: 'Übersicht',
    categories: [
    {
      id: 'favorites',
      name: 'Favoriten',
      code: '',
      icon: <Star className="h-5 w-5" />,
      isFavorite: true
    },
    {
      id: 'recent',
      name: 'Zuletzt verwendet',
      code: '',
      icon: <Clock className="h-5 w-5" />
    },
    {
      id: 'all',
      name: 'Alle Kategorien',
      code: '',
      icon: <Grid3X3 className="h-5 w-5" />
    }]

  },
  {
    id: 'income',
    name: 'Einnahmen',
    categories: getAllIncomeCategories().map((kategorie) => {
      const info = incomeKategorienBeschreibungen[kategorie as keyof typeof incomeKategorienBeschreibungen];
      return {
        id: kategorie,
        name: info.name,
        code: '',
        icon: kategorie === 'umsatzerlöse' ? <TrendingUp className="h-5 w-5" /> :
        kategorie === 'steuerfreie-umsätze' ? <Shield className="h-5 w-5" /> :
        kategorie === 'erlöse-7prozent' ? <Percent className="h-5 w-5" /> :
        kategorie === 'erlöse-19prozent' ? <Percent className="h-5 w-5" /> :
        kategorie === 'provisionen' ? <Handshake className="h-5 w-5" /> :
        kategorie === 'erlösschmälerungen' ? <Minus className="h-5 w-5" /> :
        <Wallet className="h-5 w-5" />
      };
    })
  },
  {
    id: 'expenses',
    name: 'Ausgaben',
    categories: [
    {
      id: 'banken-finanzen',
      name: 'Banken / Finanzen',
      code: '',
      icon: <Building2 className="h-5 w-5" />
    },
    {
      id: 'betriebsbedarf',
      name: 'Betriebsbedarf',
      code: '',
      icon: <Package className="h-5 w-5" />
    },
    {
      id: 'buro',
      name: 'Büro',
      code: '',
      icon: <Briefcase className="h-5 w-5" />
    },
    {
      id: 'dienstleistung',
      name: 'Dienstleistung / Beratung',
      code: '',
      icon: <Users className="h-5 w-5" />
    },
    {
      id: 'fahrzeug',
      name: 'Fahrzeug',
      code: '',
      icon: <Car className="h-5 w-5" />
    },
    {
      id: 'maschine-gebaude',
      name: 'Maschine / Gebäude',
      code: '',
      icon: <Home className="h-5 w-5" />
    },
    {
      id: 'material-waren',
      name: 'Material / Waren',
      code: '',
      icon: <Package className="h-5 w-5" />
    },
    {
      id: 'personal',
      name: 'Personal',
      code: '',
      icon: <Users className="h-5 w-5" />
    },
    {
      id: 'raumkosten',
      name: 'Raumkosten',
      code: '',
      icon: <Building className="h-5 w-5" />
    },
    {
      id: 'reisen-verpflegung',
      name: 'Reisen / Verpflegung',
      code: '',
      icon: <Plane className="h-5 w-5" />
    },
    {
      id: 'sonstiges',
      name: 'Sonstiges',
      code: '',
      icon: <MoreHorizontal className="h-5 w-5" />
    },
    {
      id: 'spenden',
      name: 'Spenden',
      code: '',
      icon: <Heart className="h-5 w-5" />
    },
    {
      id: 'versicherungen',
      name: 'Versicherungen / Beiträge',
      code: '',
      icon: <Shield className="h-5 w-5" />
    },
    {
      id: 'werbung',
      name: 'Werbung',
      code: '',
      icon: <Megaphone className="h-5 w-5" />
    },
    {
      id: 'zinsen',
      name: 'Zinsen',
      code: '',
      icon: <Percent className="h-5 w-5" />
    }]

  },
  {
    id: 'tax',
    name: 'Steuer',
    categories: [
    {
      id: 'steuer',
      name: 'Steuer',
      code: '',
      icon: <Tax className="h-5 w-5" />
    },
    {
      id: 'umsatzsteuer-vorsteuer',
      name: 'Umsatzsteuer / Vorsteuer',
      code: '',
      icon: <Percent className="h-5 w-5" />
    }]

  },
  {
    id: 'other',
    name: 'Weiteres',
    categories: [
    {
      id: 'privat',
      name: 'Privat',
      code: '',
      icon: <User className="h-5 w-5" />
    }]

  }];


  // Filter category groups based on transaction type
  const categoryGroups = getAllCategoryGroups().filter((group) => {
    // Übersicht ist immer verfügbar
    if (group.id === 'overview') return true;

    // Bei spezifischem Typ nur relevante Gruppen zeigen
    if (transactionType === 'INCOME') {
      return group.id === 'income';
    }

    if (transactionType === 'EXPENSE') {
      return ['expenses', 'tax'].includes(group.id);
    }

    // Bei 'ALL' alle Gruppen zeigen
    return true;
  });



  // Erweitere Kategoriegruppen um echte Buchungskonten
  const extendedCategoryGroups = [...categoryGroups];

  // Füge Buchungskonten als eigene Gruppe hinzu
  if (bookingAccounts.length > 0) {
    const bookingAccountCategories: Category[] = bookingAccounts.map((account) => ({
      id: `booking-${account.id}`,
      name: `${account.number} - ${account.name}`,
      code: account.number,
      description: `Buchungskonto (${account.type === 'INCOME' ? 'Einnahme' : account.type === 'EXPENSE' ? 'Ausgabe' : account.type === 'ASSET' ? 'Aktiva' : 'Passiva'})`,
      icon: <Building2 className="h-5 w-5" />
    }));

    extendedCategoryGroups.push({
      id: 'booking-accounts',
      name: 'Buchungskonten',
      categories: bookingAccountCategories
    });
  }



  // Markiere Kategorien mit verfügbaren DATEV-Konten (ohne sie direkt hinzuzufügen)
  if (datevCards.length > 0) {
    // Markiere Ausgaben-Kategorien mit verfügbaren DATEV-Konten
    const expenseGroup = extendedCategoryGroups.find((group) => group.id === 'expenses');
    if (expenseGroup) {
      const expenseCards = datevCards.filter((card) => card.type === 'EXPENSE');

      // Gruppiere DATEV-Konten nach bestehenden Kategorien
      const categorizedCards: {[categoryId: string]: DatevCard[];} = {};

      expenseCards.forEach((card) => {
        // Verwende das neue manuelle Mapping
        const mapping = findMappingByAccountNumber(card.code);
        if (mapping) {
          const categoryId = mapping.kategorie;
          if (!categorizedCards[categoryId]) {
            categorizedCards[categoryId] = [];
          }
          categorizedCards[categoryId].push(card);

          // Debug: Logge erfolgreiche Kategorisierungen

        } else {
          // Fallback: Unbekannte Konten zu "sonstiges"
          if (!categorizedCards['sonstiges']) {
            categorizedCards['sonstiges'] = [];
          }
          categorizedCards['sonstiges'].push(card);
          console.warn(`🔍 DATEV-Konto nicht im Mapping gefunden: ${card.code} - ${card.name} → sonstiges`);
        }
      });

      // Markiere Kategorien mit verfügbaren DATEV-Konten
      Object.entries(categorizedCards).forEach(([categoryId, cards]) => {
        const targetCategory = expenseGroup.categories.find((cat) => cat.id === categoryId);
        if (targetCategory) {
          // Markiere, dass DATEV-Konten verfügbar sind (für UI-Anzeige)
          (targetCategory as any).datevCards = cards;

          // Debug: Logge Kategorie-Zuweisungen für banken-finanzen und sonstiges
          if (categoryId === 'banken-finanzen' || categoryId === 'sonstiges') {

            cards.forEach((card) => {});
          }
        }
      });
    }

    // Markiere INCOME-Kategorien mit verfügbaren DATEV-Konten
    const incomeGroup = extendedCategoryGroups.find((group) => group.id === 'income');
    if (incomeGroup) {
      const incomeCards = datevCards.filter((card) => card.type === 'INCOME');

      // Gruppiere INCOME-Konten nach Kategorien
      const categorizedIncomeCards: {[categoryId: string]: DatevCard[];} = {};

      incomeCards.forEach((card) => {
        // Verwende das INCOME-Mapping
        const incomeMapping = findIncomeMappingByAccountNumber(card.code);
        if (incomeMapping) {
          const categoryId = incomeMapping.kategorie;
          if (!categorizedIncomeCards[categoryId]) {
            categorizedIncomeCards[categoryId] = [];
          }
          categorizedIncomeCards[categoryId].push(card);

          // Debug: Logge erfolgreiche INCOME-Kategorisierungen

        } else {
          // Fallback: Unbekannte INCOME-Konten zu "sonstige-erträge"
          if (!categorizedIncomeCards['sonstige-erträge']) {
            categorizedIncomeCards['sonstige-erträge'] = [];
          }
          categorizedIncomeCards['sonstige-erträge'].push(card);

        }
      });

      // Weise DATEV-Konten den entsprechenden INCOME-Kategorien zu
      Object.entries(categorizedIncomeCards).forEach(([categoryId, cards]) => {
        const targetCategory = incomeGroup.categories.find((cat) => cat.id === categoryId);
        if (targetCategory) {
          // Markiere, dass DATEV-Konten verfügbar sind (für UI-Anzeige)
          (targetCategory as any).datevCards = cards;

          // Debug: Logge Kategorie-Zuweisungen

          cards.forEach((card) => {});
        }
      });
    }

    // Markiere Steuer-Kategorien mit verfügbaren DATEV-Konten
    const taxGroup = extendedCategoryGroups.find((group) => group.id === 'tax');
    if (taxGroup) {
      const taxCards = getMappingsByCategory('steuern-abgaben').map((mapping) =>
      datevCards.find((card) => card.code === mapping.kontoNummer)
      ).filter((card) => card !== undefined) as DatevCard[];

      // Markiere Steuer-Kategorien mit verfügbaren DATEV-Konten
      taxGroup.categories.forEach((category) => {
        if (category.id === 'steuer') {
          (category as any).datevCards = taxCards.filter((card) =>
          !card.name.toLowerCase().includes('umsatzsteuer') &&
          !card.name.toLowerCase().includes('vorsteuer')
          );
        } else if (category.id === 'umsatzsteuer-vorsteuer') {
          (category as any).datevCards = taxCards.filter((card) =>
          card.name.toLowerCase().includes('umsatzsteuer') ||
          card.name.toLowerCase().includes('vorsteuer')
          );
        }
      });
    }
  }

  // Filter categories based on search term - inkl. Kontonummern-Suche
  const filteredGroups = extendedCategoryGroups.map((group) => ({
    ...group,
    categories: group.categories.filter((category) => {
      const searchLower = searchTerm.toLowerCase();

      // Standard-Suche nach Namen und Code
      const nameMatch = category.name.toLowerCase().includes(searchLower);
      const codeMatch = category.code?.toLowerCase().includes(searchLower);

      // Erweiterte Suche: Falls es eine Nummer ist, suche in DATEV-Konten dieser Kategorie
      const isNumericSearch = /^\d+$/.test(searchTerm.trim());
      let accountNumberMatch = false;

      if (isNumericSearch && (category as any).datevCards) {
        accountNumberMatch = (category as any).datevCards.some((card: DatevCard) =>
        card.code.includes(searchTerm.trim())
        );
      }

      return nameMatch || codeMatch || accountNumberMatch;
    })
  })).filter((group) => group.categories.length > 0);



  // Prüfe ob eine Kategorie mit DATEV-Konten ausgewählt ist
  const currentSelectedCategory = extendedCategoryGroups.
  flatMap((group) => group.categories).
  find((cat) => cat.id === selectedCategoryId);

  const hasDatevCards = currentSelectedCategory && (currentSelectedCategory as any).datevCards;
  const isIncomeSelected = selectedCategoryId && extendedCategoryGroups.
  find((group) => group.id === 'income')?.categories.
  some((cat) => cat.id === selectedCategoryId);
  const isTaxSelected = selectedCategoryId && extendedCategoryGroups.
  find((group) => group.id === 'tax')?.categories.
  some((cat) => cat.id === selectedCategoryId);
  const isAllCategoriesSelected = selectedCategoryId === 'all';

  // Prüfe ob eine DATEV-Karte direkt ausgewählt wurde
  const isDatevCardSelected = selectedCategoryId && datevCards.some((card) => card.id === selectedCategoryId);

  // Filter und paginiere DATEV-Konten basierend auf der ausgewählten Kategorie
  const getRelevantDatevCards = (): DatevCard[] => {
    // Wenn eine DATEV-Karte direkt ausgewählt wurde, zeige diese an
    if (isDatevCardSelected) {
      const selectedCard = datevCards.find((card) => card.id === selectedCategoryId);
      return selectedCard ? [selectedCard] : [];
    }

    if (!currentSelectedCategory) return [];

    // Spezielle Behandlung für "Alle Kategorien" - zeige alle verfügbaren DATEV-Karten
    if (isAllCategoriesSelected) {
      return datevCards; // Alle DATEV-Karten anzeigen
    }

    if (hasDatevCards) {
      // Zeige die DATEV-Karten der ausgewählten Ausgabenkategorie
      return (currentSelectedCategory as any).datevCards || [];
    }

    if (isIncomeSelected) {
      // Zeige alle Einnahme-DATEV-Konten
      return datevCards.filter((card) => card.type === 'INCOME');
    }

    if (isTaxSelected) {
      // Zeige steuerrelevante DATEV-Konten für die ausgewählte Steuer-Kategorie
      const taxAccountNumbers = getMappingsByCategory('steuern-abgaben').map((m) => m.kontoNummer);
      return datevCards.filter((card) => taxAccountNumbers.includes(card.code));
    }

    return [];
  };

  const filteredDatevCards = getRelevantDatevCards().filter((card) => {
    const matchesSearch = !searchTerm ||
    card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedDatevType === 'ALL' || card.type === selectedDatevType;

    return matchesSearch && matchesType;
  });

  // Pagination für DATEV-Karten
  const totalPages = Math.ceil(filteredDatevCards.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDatevCards = filteredDatevCards.slice(startIndex, startIndex + itemsPerPage);const handleCategorySelect = (category: Category) => {
    setSelectedCategoryId(category.id);

    // Reset DATEV filter when switching categories
    setSelectedDatevType('ALL');
    setCurrentPage(1);
  };

  const handleDatevCardSelect = (card: DatevCard) => {
    setSelectedCategoryId(card.id);
  };

  const handleConfirm = () => {
    // Prüfe zuerst ob eine DATEV-Karte ausgewählt wurde
    const selectedDatevCard = datevCards.find((card) => card.id === selectedCategoryId);
    if (selectedDatevCard) {
      // Konvertiere DATEV-Karte zu BookingAccount-Format
      const bookingAccountFromDatev: BookingAccount = {
        id: selectedDatevCard.id,
        number: selectedDatevCard.code,
        name: DatevCardService.getDisplayName(selectedDatevCard),
        type: 'EXPENSE' as const,
        automaticBooking: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      onSelect(bookingAccountFromDatev);
      onClose();
      return;
    }

    // Fallback auf normale Kategorien - konvertiere Category zu BookingAccount
    const allCategories = extendedCategoryGroups.flatMap((group) => group.categories);
    const selected = allCategories.find((cat) => cat.id === selectedCategoryId);
    if (selected) {
      const bookingAccountFromCategory: BookingAccount = {
        id: selected.id,
        number: selected.code || selected.id,
        name: selected.name,
        type: 'EXPENSE' as const,
        automaticBooking: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      onSelect(bookingAccountFromCategory);
    }
    onClose();
  };

  const handleToggleFavorite = async (datevCardId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentCompanyId) {
      console.warn('Keine Company-ID für Favoriten verfügbar');
      return;
    }

    try {
      const datevCard = datevCards.find((card) => card.id === datevCardId);
      if (!datevCard) return;

      const isFavorite = favoriteAccounts.includes(datevCard.code);

      if (isFavorite) {
        await FavoriteDatevAccountService.removeFromFavorites(currentCompanyId, datevCard.code);
        setFavoriteAccounts((prev) => prev.filter((code) => code !== datevCard.code));
      } else {
        await FavoriteDatevAccountService.addToFavorites(
          currentCompanyId,
          datevCard.code,
          DatevCardService.getDisplayName(datevCard),
          datevCard.category || 'Sonstiges'
        );
        setFavoriteAccounts((prev) => [...prev, datevCard.code]);
      }
    } catch (error) {
      console.error('Fehler beim Favoriten-Toggle:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <dialog
        open
        className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200 mx-auto"
        aria-label="Kategorie auswählen"
        aria-modal="true">

        {/* Header */}
        <header className="flex-shrink-0 p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Kategorie auswählen</h2>
              {transactionType !== 'ALL' &&
              <p className="text-sm text-gray-500 mt-1">
                  {transactionType === 'INCOME' ? 'Einnahme-Kategorien' : 'Ausgaben-Kategorien'}
                </p>
              }
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-md transition-colors border border-transparent hover:border-gray-200"
              aria-label="close"
              type="button">

              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Field */}
          <div className="relative">
            <div className="relative border border-gray-300 rounded-md focus-within:ring-[#14ad9f] focus-within:border-[#14ad9f] shadow-sm">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="searchField"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suche nach Stichwort, Kategorie, Kontonummer oder Buchhaltungskonto"
                className="w-full pl-12 pr-3 py-3 border-0 rounded-md focus:ring-0 focus:outline-none bg-transparent"
                autoComplete="off" />

            </div>
          </div>
        </header>

        {/* Main Content - 2 Column Grid */}
        <main className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Left Column - Category Lists */}
            <div className="w-[30%] border-r border-gray-200 overflow-y-auto flex-shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="p-6">
                <ul className="categoryGroupList space-y-6">
                  {filteredGroups.map((group) =>
                  <div key={group.id}>
                      {/* Group Header */}
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-0 py-2 border-b border-gray-200 mb-3">
                        {group.name}
                      </div>
                      {/* Group Items */}
                      <div className="space-y-1">
                        {group.categories.map((category) => {
                        const hasDatevCards = (category as any).datevCards?.length > 0;
                        const isIncomeCategory = group.id === 'income' && datevCards.some((card) => card.type === 'INCOME');
                        const taxAccountNumbers = getMappingsByCategory('steuern-abgaben').map((m) => m.kontoNummer);
                        const isTaxCategory = group.id === 'tax' && datevCards.some((card) => taxAccountNumbers.includes(card.code));
                        const hasAvailableCards = hasDatevCards || isIncomeCategory || isTaxCategory;

                        return (
                          <button
                            key={category.id}
                            onClick={() => handleCategorySelect(category)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-gray-50 transition-colors ${
                            selectedCategoryId === category.id ?
                            'bg-[#14ad9f]/10 text-[#14ad9f] border border-[#14ad9f]/20' :
                            'text-gray-700'}`
                            }
                            role="menuitem"
                            type="button">

                              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                {category.icon}
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <div className="font-medium text-sm">{category.name}</div>
                                {hasAvailableCards &&
                              <div className="flex-shrink-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {hasDatevCards ? (category as any).datevCards.length :
                                  isIncomeCategory ? datevCards.filter((card) => card.type === 'INCOME').length :
                                  isTaxCategory ? datevCards.filter((card) => taxAccountNumbers.includes(card.code)).length : 0}
                                    </span>
                                  </div>
                              }
                              </div>
                            </button>);

                      })}
                      </div>
                    </div>
                  )}
                </ul>
              </div>
            </div>

            {/* Right Column - Cards */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="p-4">
                {/* Zeige Inhalte basierend auf Auswahl */}
                {isAllCategoriesSelected ? (
                /* Bei "Alle Kategorien": Zeige sowohl Suggested Categories als auch DATEV-Karten */
                <div>


                    {/* DATEV Cards Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-4">DATEV-Buchungskonten</h4>
                      
                      {/* DATEV Typ Filter */}
                      <div className="mb-4 flex gap-2 flex-wrap">
                        {(['ALL', 'INCOME', 'EXPENSE', 'ASSET', 'LIABILITY'] as const).
                      filter((type) => {
                        // Filter verfügbare Typ-Buttons basierend auf transactionType
                        if (transactionType === 'INCOME') return ['ALL', 'INCOME'].includes(type);
                        if (transactionType === 'EXPENSE') return ['ALL', 'EXPENSE'].includes(type);
                        return true; // Bei 'ALL' alle Typen zeigen
                      }).
                      map((type) =>
                      <button
                        key={type}
                        onClick={() => setSelectedDatevType(type)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedDatevType === type ?
                        'bg-[#14ad9f] text-white border-[#14ad9f]' :
                        'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`
                        }
                        type="button">

                            {type === 'ALL' ? 'Alle' : DatevCardService.getTypeLabel(type)}
                          </button>
                      )}
                      </div>

                      {/* DATEV Cards Grid */}
                      {paginatedDatevCards.length > 0 ?
                    <>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {paginatedDatevCards.map((card) =>
                        <div
                          key={card.id}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedCategoryId === card.id ?
                          'border-[#14ad9f] bg-[#14ad9f]/5' :
                          'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`
                          }
                          onClick={() => handleDatevCardSelect(card)}>

                                {/* Icon + Radio */}
                                <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded">
                                    {getIconComponent(card.iconName)}
                                  </div>
                                  <input
                              type="radio"
                              checked={selectedCategoryId === card.id}
                              onChange={() => handleDatevCardSelect(card)}
                              className="text-[#14ad9f] focus:ring-[#14ad9f] w-4 h-4" />

                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="mb-2">
                                    <p className="font-medium text-gray-900 text-sm truncate">{DatevCardService.getDisplayName(card)}</p>
                                    <p className="text-xs text-gray-500 font-mono">Konto {card.code}</p>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed">
                                    {card.description}
                                  </p>
                                </div>
                                
                                {/* Favoriten-Stern */}
                                <div className="flex-shrink-0 pt-1">
                                  <button
                              onClick={(e) => handleToggleFavorite(card.id, e)}
                              className={`p-1 transition-colors ${
                              favoriteAccounts.includes(card.code) ?
                              'text-yellow-500 hover:text-yellow-600' :
                              'text-gray-400 hover:text-yellow-500'}`
                              }
                              aria-label={favoriteAccounts.includes(card.code) ? 'Von Favoriten entfernen' : 'Als Favorit markieren'}
                              type="button">

                                    <Star
                                className={`h-4 w-4 ${
                                favoriteAccounts.includes(card.code) ? 'fill-current' : ''}`
                                } />

                                  </button>
                                </div>
                              </div>
                        )}
                          </div>

                          {/* Pagination */}
                          {totalPages > 1 &&
                      <div className="mt-4 flex items-center justify-between">
                              <div className="text-sm text-gray-500">
                                Seite {currentPage} von {totalPages} ({filteredDatevCards.length} Konten)
                              </div>
                              <div className="flex gap-2">
                                <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button">

                                  Zurück
                                </button>
                                <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button">

                                  Weiter
                                </button>
                              </div>
                            </div>
                      }
                        </> :

                    <div className="flex items-center justify-center h-32 text-gray-500">
                          <div className="text-center">
                            <p className="text-sm">Keine DATEV-Konten gefunden</p>
                            <p className="text-xs mt-1">Ändern Sie die Filtereinstellungen</p>
                          </div>
                        </div>
                    }
                    </div>
                  </div>) :
                hasDatevCards || isIncomeSelected || isTaxSelected || isDatevCardSelected ?
                <div>
                    {/* DATEV Typ Filter */}
                    <div className="mb-4 flex gap-2 flex-wrap">
                      {(['ALL', 'INCOME', 'EXPENSE', 'ASSET', 'LIABILITY'] as const).
                    filter((type) => {
                      // Filter verfügbare Typ-Buttons basierend auf transactionType
                      if (transactionType === 'INCOME') return ['ALL', 'INCOME'].includes(type);
                      if (transactionType === 'EXPENSE') return ['ALL', 'EXPENSE'].includes(type);
                      return true; // Bei 'ALL' alle Typen zeigen
                    }).
                    map((type) =>
                    <button
                      key={type}
                      onClick={() => setSelectedDatevType(type)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedDatevType === type ?
                      'bg-[#14ad9f] text-white border-[#14ad9f]' :
                      'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`
                      }
                      type="button">

                          {type === 'ALL' ? 'Alle' : DatevCardService.getTypeLabel(type)}
                        </button>
                    )}
                    </div>

                    {/* DATEV Cards Grid */}
                    {paginatedDatevCards.length > 0 ?
                  <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {paginatedDatevCards.map((card) =>
                      <div
                        key={card.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCategoryId === card.id ?
                        'border-[#14ad9f] bg-[#14ad9f]/5' :
                        'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`
                        }
                        onClick={() => handleDatevCardSelect(card)}>

                              {/* Icon + Radio */}
                              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded">
                                  {getIconComponent(card.iconName)}
                                </div>
                                <input
                            type="radio"
                            checked={selectedCategoryId === card.id}
                            onChange={() => handleDatevCardSelect(card)}
                            className="text-[#14ad9f] focus:ring-[#14ad9f] w-4 h-4" />

                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                  <p className="font-medium text-gray-900 text-sm truncate">{DatevCardService.getDisplayName(card)}</p>
                                  <p className="text-xs text-gray-500 font-mono">Konto {card.code}</p>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {card.description}
                                </p>
                              </div>
                              
                              {/* Favoriten-Stern */}
                              <div className="flex-shrink-0 pt-1">
                                <button
                            onClick={(e) => handleToggleFavorite(card.id, e)}
                            className={`p-1 transition-colors ${
                            favoriteAccounts.includes(card.code) ?
                            'text-yellow-500 hover:text-yellow-600' :
                            'text-gray-400 hover:text-yellow-500'}`
                            }
                            aria-label={favoriteAccounts.includes(card.code) ? 'Von Favoriten entfernen' : 'Als Favorit markieren'}
                            type="button">

                                  <Star
                              className={`h-4 w-4 ${
                              favoriteAccounts.includes(card.code) ? 'fill-current' : ''}`
                              } />

                                </button>
                              </div>
                            </div>
                      )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 &&
                    <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              Seite {currentPage} von {totalPages} ({filteredDatevCards.length} Konten)
                            </div>
                            <div className="flex gap-2">
                              <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          type="button">

                                Zurück
                              </button>
                              <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          type="button">

                                Weiter
                              </button>
                            </div>
                          </div>
                    }
                      </> :

                  <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="text-center">
                          <p className="text-sm">Keine DATEV-Konten gefunden</p>
                          <p className="text-xs mt-1">Ändern Sie die Filtereinstellungen oder die Suche</p>
                        </div>
                      </div>
                  }
                  </div> : (

                /* Fallback: Zeige Hinweis zur Kategorie-Auswahl */
                <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <p className="text-sm">Wählen Sie eine Kategorie aus der linken Liste</p>
                      <p className="text-xs mt-1">DATEV-Buchungskonten werden nach Kategorie-Auswahl angezeigt</p>
                    </div>
                  </div>)
                }
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              type="button">

              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedCategoryId}
              className="px-4 py-2 text-sm font-medium text-white bg-[#14ad9f] border border-transparent rounded-md hover:bg-[#129488] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="button">

              Übernehmen
            </button>
          </div>
        </footer>
      </dialog>
    </div>);

}