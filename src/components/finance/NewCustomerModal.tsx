'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import NewCategoryModal from './NewCategoryModal';

interface Address {
  id: string;
  type: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

interface PersonCustomerValues {
  // Grunddaten (bleiben im Hauptbereich)
  anrede: string;
  titel: string;
  vorname: string;
  nachname: string;
  nameAddition: string;
  customerNumber: string;
  type: string;
  organisation: string;
  position: string;
  debitorNumber: string;
  kreditorNumber: string;
  eRechnungStandard: boolean;
  kundenreferenz: string;
  leitwegId: string;
  useKundenreferenz: boolean; // true = Kundenreferenz, false = Leitweg-ID
  // Sub-Tab: Adressen
  addresses: Address[];
  // Sub-Tab: Kontaktdetails
  email: string;
  phone: string;
  website: string;
  // Sub-Tab: Zahlungsinformationen
  bankName: string;
  iban: string;
  bic: string;
  paymentTerms: string;
  notes: string;
  // Sub-Tab: Konditionen
  discount: string;
  creditLimit: string;
  paymentMethod: string;
  deliveryTerms: string;
  // Sub-Tab: Weiteres
  additionalNotes: string;
  internalNotes: string;
  tags: string[];
}

interface OrganisationCustomerValues {
  // Grunddaten (bleiben im Hauptbereich)
  name: string;
  nameAddition: string;
  customerNumber: string;
  type: string;
  debitorNumber: string;
  kreditorNumber: string;
  eRechnungStandard: boolean;
  kundenreferenz: string;
  leitwegId: string;
  useKundenreferenz: boolean; // true = Kundenreferenz, false = Leitweg-ID
  // Sub-Tab: Adressen
  addresses: Address[];
  // Sub-Tab: Kontaktdetails
  email: string;
  phone: string;
  website: string;
  // Sub-Tab: Zahlungsinformationen
  bankName: string;
  iban: string;
  bic: string;
  paymentTerms: string;
  notes: string;
  // Sub-Tab: Konditionen
  discount: string;
  creditLimit: string;
  paymentMethod: string;
  deliveryTerms: string;
  // Sub-Tab: Weiteres
  additionalNotes: string;
  internalNotes: string;
  tags: string[];
}

type CustomerType = 'Person' | 'Organisation';
type SubTabType =
  | 'Adresse'
  | 'Kontaktdetails'
  | 'Zahlungsinformationen'
  | 'Konditionen'
  | 'Weiteres';

interface NewCustomerValues {
  customerType: CustomerType;
  person: PersonCustomerValues;
  organisation: OrganisationCustomerValues;
}

export interface NewCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<{
    name: string;
    firstName?: string;
    lastName?: string;
  }>;
  contactType?: 'organisation' | 'person';
  saving?: boolean;
  onSave?: (values: Record<string, unknown>) => Promise<void>;
  persistDirectly?: boolean;
  companyId?: string;
  onSaved?: (customerId: string) => void;
}

const createDefaultAddress = (): Address => ({
  id: Math.random().toString(36).substr(2, 9),
  type: 'Arbeit',
  street: '',
  postalCode: '',
  city: '',
  country: 'Deutschland',
});

const DEFAULT_PERSON_VALUES: PersonCustomerValues = {
  anrede: '',
  titel: '',
  vorname: '',
  nachname: '',
  nameAddition: '',
  customerNumber: '',
  type: 'Kunde',
  organisation: '',
  position: '',
  debitorNumber: '',
  kreditorNumber: '',
  eRechnungStandard: false,
  kundenreferenz: '',
  leitwegId: '',
  useKundenreferenz: true,
  addresses: [createDefaultAddress()],
  email: '',
  phone: '',
  website: '',
  bankName: '',
  iban: '',
  bic: '',
  paymentTerms: '',
  notes: '',
  discount: '',
  creditLimit: '',
  paymentMethod: '',
  deliveryTerms: '',
  additionalNotes: '',
  internalNotes: '',
  tags: [],
};

const DEFAULT_ORGANISATION_VALUES: OrganisationCustomerValues = {
  name: '',
  nameAddition: '',
  customerNumber: '',
  type: 'Kunde',
  debitorNumber: '',
  kreditorNumber: '',
  eRechnungStandard: false,
  kundenreferenz: '',
  leitwegId: '',
  useKundenreferenz: true,
  addresses: [createDefaultAddress()],
  email: '',
  phone: '',
  website: '',
  bankName: '',
  iban: '',
  bic: '',
  paymentTerms: '',
  notes: '',
  discount: '',
  creditLimit: '',
  paymentMethod: '',
  deliveryTerms: '',
  additionalNotes: '',
  internalNotes: '',
  tags: [],
};

const DEFAULT_VALUES: NewCustomerValues = {
  customerType: 'Person',
  person: DEFAULT_PERSON_VALUES,
  organisation: DEFAULT_ORGANISATION_VALUES,
};

const COUNTRY_OPTIONS = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Niederlande',
  'Belgien',
  'Frankreich',
  'Italien',
  'Spanien',
  'Polen',
  'Tschechien',
  'Ungarn',
  'Slowenien',
  'Kroatien',
  'USA',
  'Andere',
];

export default function NewCustomerModal({
  open,
  onOpenChange,
  defaultValues,
  contactType = 'organisation',
  saving,
  onSave,
  persistDirectly,
  companyId,
  onSaved,
}: NewCustomerModalProps) {
  const [values, setValues] = useState<NewCustomerValues>(DEFAULT_VALUES);
  const [activeTab, setActiveTab] = useState<CustomerType>(
    contactType === 'person' ? 'Person' : 'Organisation'
  );
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('Adresse');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [customCategories, setCustomCategories] = useState<
    Array<{ id: string; name: string; categoryType: string }>
  >([]);

  useEffect(() => {
    if (open) {
      const newValues = { ...DEFAULT_VALUES };
      if (defaultValues?.name) {
        // Pre-fill based on customer type
        if (activeTab === 'Person') {
          // Verwende die spezifischen Vor- und Nachnamen falls vorhanden
          if (defaultValues.firstName) {
            newValues.person.vorname = defaultValues.firstName;
          }
          if (defaultValues.lastName) {
            newValues.person.nachname = defaultValues.lastName;
          }
          // Fallback: Wenn nur name vorhanden ist, versuche es aufzuteilen
          if (!defaultValues.firstName && !defaultValues.lastName && defaultValues.name) {
            const nameParts = defaultValues.name.split(' ');
            newValues.person.vorname = nameParts[0] || '';
            newValues.person.nachname = nameParts.slice(1).join(' ') || '';
          }
        } else {
          newValues.organisation.name = defaultValues.name;
        }
      }
      setValues(newValues);

      // Lade Kategorien
      loadCategories();
    }
  }, [open, defaultValues, activeTab]);

  const loadCategories = async () => {
    try {
      const { getCategories } = await import('@/utils/api/companyApi');
      const response = await getCategories();
      if (response.success && response.categories) {
        setCustomCategories(response.categories);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
    }
  };

  const generateCustomerNumber = () => {
    const timestamp = Date.now().toString();
    return `${timestamp.slice(-4)}`;
  };

  const addAddress = () => {
    const newAddress = createDefaultAddress();
    setValues(prev => {
      const currentKey = activeTab.toLowerCase() as 'person' | 'organisation';
      return {
        ...prev,
        [currentKey]: {
          ...prev[currentKey],
          addresses: [...prev[currentKey].addresses, newAddress],
        },
      };
    });
  };

  const updateAddress = (addressId: string, field: keyof Address, value: string) => {
    setValues(prev => {
      const currentKey = activeTab.toLowerCase() as 'person' | 'organisation';
      return {
        ...prev,
        [currentKey]: {
          ...prev[currentKey],
          addresses: prev[currentKey].addresses.map((addr: Address) =>
            addr.id === addressId ? { ...addr, [field]: value } : addr
          ),
        },
      };
    });
  };

  const currentData = activeTab === 'Person' ? values.person : values.organisation;

  const updateCurrentData = (field: string, value: string | boolean) => {
    setValues(prev => {
      const currentKey = activeTab.toLowerCase() as 'person' | 'organisation';
      return {
        ...prev,
        [currentKey]: {
          ...prev[currentKey],
          [field]: value,
        },
      };
    });
  };

  const isValid = () => {
    if (activeTab === 'Person') {
      return values.person.nachname.trim() && values.person.customerNumber.trim();
    } else {
      return values.organisation.name.trim() && values.organisation.customerNumber.trim();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kontakt erstellen</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'Person'
                ? 'border-[#14ad9f] text-[#14ad9f]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('Person')}
          >
            Tab 1. Person
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'Organisation'
                ? 'border-[#14ad9f] text-[#14ad9f]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('Organisation')}
          >
            Tab 2. Organisation
          </button>
        </div>

        <div className="space-y-6 mt-6">
          {activeTab === 'Person' ? (
            /* Person Tab Content */
            <>
              {/* Person Basic Information - 2 Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Anrede</Label>
                      <Select
                        value={values.person.anrede}
                        onValueChange={val => updateCurrentData('anrede', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Anrede wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Herr">Herr</SelectItem>
                          <SelectItem value="Frau">Frau</SelectItem>
                          <SelectItem value="Divers">Divers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Titel</Label>
                      <Input
                        value={values.person.titel}
                        onChange={e => updateCurrentData('titel', e.target.value)}
                        placeholder="Dr., Prof., etc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vorname</Label>
                      <Input
                        value={values.person.vorname}
                        onChange={e => updateCurrentData('vorname', e.target.value)}
                        placeholder="Max"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nachname *</Label>
                      <Input
                        value={values.person.nachname}
                        onChange={e => updateCurrentData('nachname', e.target.value)}
                        placeholder="Mustermann"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Namenszusatz</Label>
                    <Input
                      value={values.person.nameAddition}
                      onChange={e => updateCurrentData('nameAddition', e.target.value)}
                      placeholder="z.B. MBA"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kunden-Nr. *</Label>
                      <Input
                        value={values.person.customerNumber}
                        onChange={e => updateCurrentData('customerNumber', e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Typ</Label>
                      <Select
                        value={values.person.type}
                        onValueChange={val => {
                          if (val === 'create-category') {
                            setShowCategoryModal(true);
                          } else {
                            updateCurrentData('type', val);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Typ wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lieferant">Lieferant</SelectItem>
                          <SelectItem value="Kunde">Kunde</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Interessent">Interessent</SelectItem>
                          {customCategories.map(category => (
                            <SelectItem key={category.id} value={category.categoryType}>
                              {category.name} ({category.categoryType})
                            </SelectItem>
                          ))}
                          <SelectItem
                            value="create-category"
                            className="text-[#14ad9f] font-medium border-t"
                          >
                            + Kategorie erstellen
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Organisation</Label>
                      <Input
                        value={values.person.organisation}
                        onChange={e => updateCurrentData('organisation', e.target.value)}
                        placeholder="Firma XY GmbH"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input
                        value={values.person.position}
                        onChange={e => updateCurrentData('position', e.target.value)}
                        placeholder="Geschäftsführer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Debitoren-Nr.</Label>
                    <Input
                      value={values.person.debitorNumber}
                      onChange={e => updateCurrentData('debitorNumber', e.target.value)}
                      placeholder="DEB001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kreditoren-Nr.</Label>
                    <Input
                      value={values.person.kreditorNumber}
                      onChange={e => updateCurrentData('kreditorNumber', e.target.value)}
                      placeholder="KRE001"
                    />
                  </div>
                </div>
              </div>

              {/* E-Rechnung und Kundenreferenz/Leitweg-ID Bereich */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Label htmlFor="erechnung-toggle">E-Rechnung Standard</Label>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 ${
                        values.person.eRechnungStandard ? 'bg-[#14ad9f]' : 'bg-gray-200'
                      }`}
                      onClick={() =>
                        updateCurrentData('eRechnungStandard', !values.person.eRechnungStandard)
                      }
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          values.person.eRechnungStandard ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Label>
                        {values.person.useKundenreferenz ? 'Kundenreferenz' : 'Leitweg-ID'}
                      </Label>
                      <button
                        type="button"
                        className="text-sm text-[#14ad9f] hover:text-[#129488] font-medium"
                        onClick={() =>
                          updateCurrentData('useKundenreferenz', !values.person.useKundenreferenz)
                        }
                      >
                        {values.person.useKundenreferenz
                          ? 'Zu Leitweg-ID wechseln'
                          : 'Zu Kundenreferenz wechseln'}
                      </button>
                    </div>
                    <Input
                      value={
                        values.person.useKundenreferenz
                          ? values.person.kundenreferenz
                          : values.person.leitwegId
                      }
                      onChange={e =>
                        updateCurrentData(
                          values.person.useKundenreferenz ? 'kundenreferenz' : 'leitwegId',
                          e.target.value
                        )
                      }
                      placeholder={values.person.useKundenreferenz ? 'REF001' : '991-12345-12'}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Organisation Tab Content */
            <>
              {/* Organisation Basic Information - 2 Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name der Organisation *</Label>
                    <Input
                      value={values.organisation.name}
                      onChange={e => updateCurrentData('name', e.target.value)}
                      placeholder="Musterfirma GmbH"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Namenszusatz</Label>
                    <Input
                      value={values.organisation.nameAddition}
                      onChange={e => updateCurrentData('nameAddition', e.target.value)}
                      placeholder="Abteilung Marketing"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Kunden-Nr. *</Label>
                    <Input
                      value={values.organisation.customerNumber}
                      onChange={e => updateCurrentData('customerNumber', e.target.value)}
                      placeholder="1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <Select
                      value={values.organisation.type}
                      onValueChange={val => {
                        if (val === 'create-category') {
                          setShowCategoryModal(true);
                        } else {
                          updateCurrentData('type', val);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Typ wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lieferant">Lieferant</SelectItem>
                        <SelectItem value="Kunde">Kunde</SelectItem>
                        <SelectItem value="Partner">Partner</SelectItem>
                        <SelectItem value="Interessent">Interessent</SelectItem>
                        {customCategories.map(category => (
                          <SelectItem key={category.id} value={category.categoryType}>
                            {category.name} ({category.categoryType})
                          </SelectItem>
                        ))}
                        <SelectItem
                          value="create-category"
                          className="text-[#14ad9f] font-medium border-t"
                        >
                          + Kategorie erstellen
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Debitoren-Nr.</Label>
                    <Input
                      value={values.organisation.debitorNumber}
                      onChange={e => updateCurrentData('debitorNumber', e.target.value)}
                      placeholder="DEB001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kreditoren-Nr.</Label>
                    <Input
                      value={values.organisation.kreditorNumber}
                      onChange={e => updateCurrentData('kreditorNumber', e.target.value)}
                      placeholder="KRE001"
                    />
                  </div>
                </div>
              </div>

              {/* E-Rechnung und Kundenreferenz/Leitweg-ID Bereich */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Label htmlFor="erechnung-toggle-org">E-Rechnung Standard</Label>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 ${
                        values.organisation.eRechnungStandard ? 'bg-[#14ad9f]' : 'bg-gray-200'
                      }`}
                      onClick={() =>
                        updateCurrentData(
                          'eRechnungStandard',
                          !values.organisation.eRechnungStandard
                        )
                      }
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          values.organisation.eRechnungStandard ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Label>
                        {values.organisation.useKundenreferenz ? 'Kundenreferenz' : 'Leitweg-ID'}
                      </Label>
                      <button
                        type="button"
                        className="text-sm text-[#14ad9f] hover:text-[#129488] font-medium"
                        onClick={() =>
                          updateCurrentData(
                            'useKundenreferenz',
                            !values.organisation.useKundenreferenz
                          )
                        }
                      >
                        {values.organisation.useKundenreferenz
                          ? 'Zu Leitweg-ID wechseln'
                          : 'Zu Kundenreferenz wechseln'}
                      </button>
                    </div>
                    <Input
                      value={
                        values.organisation.useKundenreferenz
                          ? values.organisation.kundenreferenz
                          : values.organisation.leitwegId
                      }
                      onChange={e =>
                        updateCurrentData(
                          values.organisation.useKundenreferenz ? 'kundenreferenz' : 'leitwegId',
                          e.target.value
                        )
                      }
                      placeholder={
                        values.organisation.useKundenreferenz ? 'REF001' : '991-12345-12'
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sub-Tab Navigation */}
          <div className="border-t pt-6">
            <div className="flex flex-wrap border-b border-gray-200 mb-6">
              {[
                'Adresse',
                'Kontaktdetails',
                'Zahlungsinformationen',
                'Konditionen',
                'Weiteres',
              ].map(subTab => (
                <button
                  key={subTab}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors mr-2 ${
                    activeSubTab === subTab
                      ? 'border-[#14ad9f] text-[#14ad9f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveSubTab(subTab as SubTabType)}
                >
                  {subTab}
                </button>
              ))}
            </div>

            {/* Sub-Tab Content */}
            {activeSubTab === 'Adresse' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Adressen</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAddress}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adresse hinzufügen
                  </Button>
                </div>

                {currentData.addresses.map((address, index) => (
                  <div key={address.id} className="space-y-4 border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Adresse {index + 1}</h4>
                      <Select
                        value={address.type}
                        onValueChange={val => updateAddress(address.id, 'type', val)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arbeit">Arbeit</SelectItem>
                          <SelectItem value="Privat">Privat</SelectItem>
                          <SelectItem value="Lieferung">Lieferung</SelectItem>
                          <SelectItem value="Rechnung">Rechnung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Straße</Label>
                        <Input
                          value={address.street}
                          onChange={e => updateAddress(address.id, 'street', e.target.value)}
                          placeholder="Musterstraße 123"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>PLZ</Label>
                          <Input
                            value={address.postalCode}
                            onChange={e => updateAddress(address.id, 'postalCode', e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Stadt</Label>
                          <Input
                            value={address.city}
                            onChange={e => updateAddress(address.id, 'city', e.target.value)}
                            placeholder="Musterstadt"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Land</Label>
                          <Select
                            value={address.country}
                            onValueChange={val => updateAddress(address.id, 'country', val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Land wählen" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {COUNTRY_OPTIONS.map(country => (
                                <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSubTab === 'Kontaktdetails' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Kontaktdetails</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={currentData.email}
                      onChange={e => updateCurrentData('email', e.target.value)}
                      placeholder="kontakt@beispiel.de"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={currentData.phone}
                      onChange={e => updateCurrentData('phone', e.target.value)}
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Website</Label>
                    <Input
                      type="url"
                      value={currentData.website}
                      onChange={e => updateCurrentData('website', e.target.value)}
                      placeholder="https://www.beispiel.de"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'Zahlungsinformationen' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Zahlungsinformationen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <Input
                      value={currentData.bankName}
                      onChange={e => updateCurrentData('bankName', e.target.value)}
                      placeholder="Deutsche Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN</Label>
                    <Input
                      value={currentData.iban}
                      onChange={e => updateCurrentData('iban', e.target.value)}
                      placeholder="DE89 3704 0044 0532 0130 00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>BIC</Label>
                    <Input
                      value={currentData.bic}
                      onChange={e => updateCurrentData('bic', e.target.value)}
                      placeholder="DEUTDEFF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zahlungsbedingungen</Label>
                    <Select
                      value={currentData.paymentTerms}
                      onValueChange={val => updateCurrentData('paymentTerms', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Zahlungsbedingungen wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sofort">Sofort</SelectItem>
                        <SelectItem value="7-tage">7 Tage</SelectItem>
                        <SelectItem value="14-tage">14 Tage</SelectItem>
                        <SelectItem value="30-tage">30 Tage</SelectItem>
                        <SelectItem value="60-tage">60 Tage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Zahlungsnotizen</Label>
                  <Textarea
                    value={currentData.notes}
                    onChange={e => updateCurrentData('notes', e.target.value)}
                    placeholder="Zusätzliche Zahlungsinformationen"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {activeSubTab === 'Konditionen' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Konditionen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rabatt (%)</Label>
                    <Input
                      type="number"
                      value={currentData.discount}
                      onChange={e => updateCurrentData('discount', e.target.value)}
                      placeholder="5"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kreditlimit (€)</Label>
                    <Input
                      type="number"
                      value={currentData.creditLimit}
                      onChange={e => updateCurrentData('creditLimit', e.target.value)}
                      placeholder="10000"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bevorzugte Zahlungsart</Label>
                    <Select
                      value={currentData.paymentMethod}
                      onValueChange={val => updateCurrentData('paymentMethod', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Zahlungsart wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rechnung">Rechnung</SelectItem>
                        <SelectItem value="lastschrift">Lastschrift</SelectItem>
                        <SelectItem value="vorkasse">Vorkasse</SelectItem>
                        <SelectItem value="kreditkarte">Kreditkarte</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lieferbedingungen</Label>
                    <Select
                      value={currentData.deliveryTerms}
                      onValueChange={val => updateCurrentData('deliveryTerms', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Lieferbedingungen wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="express">Express</SelectItem>
                        <SelectItem value="abholung">Abholung</SelectItem>
                        <SelectItem value="lieferung-frei-haus">Lieferung frei Haus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'Weiteres' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Weitere Informationen</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Zusätzliche Notizen</Label>
                    <Textarea
                      value={currentData.additionalNotes}
                      onChange={e => updateCurrentData('additionalNotes', e.target.value)}
                      placeholder="Öffentliche Notizen zum Kunden"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interne Notizen</Label>
                    <Textarea
                      value={currentData.internalNotes}
                      onChange={e => updateCurrentData('internalNotes', e.target.value)}
                      placeholder="Interne Notizen (nicht für Kunden sichtbar)"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              disabled={Boolean(saving) || !isValid()}
              onClick={async () => {
                // Transform data for API
                const apiData =
                  activeTab === 'Person'
                    ? {
                        name: `${values.person.vorname} ${values.person.nachname}`.trim(),
                        nameAddition: values.person.nameAddition,
                        customerNumber: values.person.customerNumber || generateCustomerNumber(),
                        type: 'Person',
                        email: values.person.email,
                        phone: values.person.phone,
                        street: values.person.addresses[0]?.street || '',
                        city: values.person.addresses[0]?.city || '',
                        postalCode: values.person.addresses[0]?.postalCode || '',
                        country: values.person.addresses[0]?.country || 'Deutschland',
                        taxNumber: '',
                        vatId: '',
                        notes: values.person.notes,
                      }
                    : {
                        name: values.organisation.name,
                        nameAddition: values.organisation.nameAddition,
                        customerNumber:
                          values.organisation.customerNumber || generateCustomerNumber(),
                        type: 'Organisation',
                        email: values.organisation.email,
                        phone: values.organisation.phone,
                        street: values.organisation.addresses[0]?.street || '',
                        city: values.organisation.addresses[0]?.city || '',
                        postalCode: values.organisation.addresses[0]?.postalCode || '',
                        country: values.organisation.addresses[0]?.country || 'Deutschland',
                        taxNumber: '',
                        vatId: '',
                        notes: values.organisation.notes,
                      };

                if (persistDirectly && companyId) {
                  try {
                    const { createCustomer } = await import('@/utils/api/companyApi');
                    const response = await createCustomer(companyId, apiData);
                    if (response.success && response.customerId) {
                      if (onSaved) onSaved(response.customerId);
                      onOpenChange(false);
                      return;
                    }
                  } catch (error) {
                    console.error('Fehler beim Speichern des Kunden:', error);
                  }
                }

                if (onSave) {
                  await onSave(apiData);
                }
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Category Modal */}
      <NewCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        companyId={companyId}
        onSaved={(categoryId, categoryData) => {
          // Setze die neue Kategorie als aktuellen Typ
          updateCurrentData('type', categoryData.categoryType);

          // Lade Kategorien-Liste neu um die neue Kategorie zu erhalten
          loadCategories();
        }}
      />
    </Dialog>
  );
}
