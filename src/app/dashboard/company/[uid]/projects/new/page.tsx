'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FolderKanban,
  HelpCircle,
  Plus,
  Search,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ProjectService } from '@/services/ProjectService';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// Status-Optionen wie bei das-programm.io
const STATUS_OPTIONS = [
  { value: 'neu', label: 'neu' },
  { value: 'angebotserstellung', label: 'Angebotserstellung' },
  { value: 'vertrieb', label: 'Vertrieb' },
  { value: 'beauftragt', label: 'beauftragt' },
  { value: 'verloren', label: 'verloren' },
  { value: 'auftragserfuellung', label: 'Auftragserfüllung' },
  { value: 'rechnung', label: 'Rechnung' },
  { value: 'warten_auf_zahlung', label: 'warten auf Zahlungseingang' },
  { value: 'abgeschlossen', label: 'abgeschlossen' },
];

interface Customer {
  id: string;
  name: string;
  firma?: string;
  address?: string;
  city?: string;
  zip?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface ObjectAddress {
  id: string;
  label: string;
  address: string;
}

export default function NewProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;

  // Form State
  const [formData, setFormData] = useState({
    bezeichnung: '',
    status: 'neu',
    objektadresseId: '',
    projektleiterId: '',
    kundenreferenz: '',
    beschreibung: '',
    abweichendeAdresse: false,
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [objectAddresses, setObjectAddresses] = useState<ObjectAddress[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const [saving, setSaving] = useState(false);

  // Kunden laden
  useEffect(() => {
    const loadData = async () => {
      try {
        // Kunden
        const customersRef = collection(db, 'companies', uid, 'customers');
        const customersSnap = await getDocs(query(customersRef, orderBy('name')));
        const customerList = customersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Customer[];
        setCustomers(customerList);

        // Mitarbeiter
        const employeesRef = collection(db, 'companies', uid, 'employees');
        const employeesSnap = await getDocs(employeesRef);
        const employeeList = employeesSnap.docs.map((doc) => ({
          id: doc.id,
          firstName: doc.data().firstName || '',
          lastName: doc.data().lastName || '',
        }));
        setEmployees(employeeList);
      } catch {
        // Fehler ignorieren
      }
    };
    loadData();
  }, [uid]);

  // Objektadressen aktualisieren wenn Kunde ausgewählt
  useEffect(() => {
    if (selectedCustomer) {
      const addresses: ObjectAddress[] = [];
      if (selectedCustomer.address) {
        addresses.push({
          id: 'customer_address',
          label: `${selectedCustomer.address}${selectedCustomer.zip ? `, ${selectedCustomer.zip}` : ''}${selectedCustomer.city ? ` ${selectedCustomer.city}` : ''}`,
          address: selectedCustomer.address,
        });
      }
      setObjectAddresses(addresses);
    } else {
      setObjectAddresses([]);
    }
  }, [selectedCustomer]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.firma?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bezeichnung.trim()) {
      return;
    }

    try {
      setSaving(true);

      const projektleiter = employees.find(e => e.id === formData.projektleiterId);

      const newProject = {
        name: formData.bezeichnung.trim(),
        bezeichnung: formData.bezeichnung.trim(),
        description: formData.beschreibung,
        status: formData.status as 'neu' | 'angebotserstellung' | 'vertrieb' | 'beauftragt' | 'verloren' | 'auftragserfuellung' | 'rechnung' | 'warten_auf_zahlung' | 'abgeschlossen',
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || selectedCustomer?.firma,
        kunde: selectedCustomer?.name || selectedCustomer?.firma || '',
        kundeId: selectedCustomer?.id || '',
        projektleiterId: formData.projektleiterId,
        projektleiter: projektleiter ? `${projektleiter.firstName} ${projektleiter.lastName}` : '',
        kundenreferenz: formData.kundenreferenz,
        objektadresse: objectAddresses.find(a => a.id === formData.objektadresseId)?.address || '',
        abweichendeAdresse: formData.abweichendeAdresse,
        startDate: new Date(),
        endDate: new Date(),
        color: '#14ad9f',
        progress: 0,
        tasks: [],
        resources: [],
        members: projektleiter ? [{
          id: projektleiter.id,
          name: `${projektleiter.firstName} ${projektleiter.lastName}`,
          role: 'manager' as const,
        }] : [],
        workingDays: [1, 2, 3, 4, 5],
        hoursPerDay: 8,
      };

      const projectId = await ProjectService.createProject(
        uid,
        newProject,
        user?.uid || uid
      );
      router.push(`/dashboard/company/${uid}/projects/${projectId}`);
    } catch {
      // Fehlerbehandlung
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-5 h-5 text-gray-500" />
          <h1 className="text-xl font-semibold text-gray-900">Projekt</h1>
        </div>
        <button
          className="w-8 h-8 rounded-full bg-[#14ad9f] text-white flex items-center justify-center text-sm font-medium"
          title="Hilfe"
        >
          ?
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status-Breadcrumb */}
          <div className="flex flex-wrap gap-0">
            {STATUS_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, status: option.value })}
                className={`px-4 py-2 text-sm font-medium border transition-colors ${
                  formData.status === option.value
                    ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${index === 0 ? 'rounded-l-lg' : ''} ${
                  index === STATUS_OPTIONS.length - 1 ? 'rounded-r-lg' : ''
                } ${index > 0 ? '-ml-px' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Kundensuche */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerResults(true);
                }}
                onFocus={() => setShowCustomerResults(true)}
                placeholder="Kundensuche"
                className="w-full md:w-1/2 px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" style={{ right: 'calc(50% + 12px)' }} />
            </div>

            {showCustomerResults && customerSearch && (
              <div className="absolute top-full left-0 w-full md:w-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch(customer.name || customer.firma || '');
                        setShowCustomerResults(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="font-medium text-gray-900">{customer.name || customer.firma}</p>
                      {customer.address && (
                        <p className="text-sm text-gray-500">{customer.address}</p>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Keine Kunden gefunden
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ausgewählter Kunde */}
          {selectedCustomer && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedCustomer.name || selectedCustomer.firma}</p>
              {selectedCustomer.address && (
                <p className="text-sm text-gray-600">{selectedCustomer.address}</p>
              )}
              {(selectedCustomer.zip || selectedCustomer.city) && (
                <p className="text-sm text-gray-600">
                  {selectedCustomer.zip} {selectedCustomer.city}
                </p>
              )}
            </div>
          )}

          {/* Bezeichnung & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bezeichnung
              </label>
              <input
                type="text"
                value={formData.bezeichnung}
                onChange={(e) => setFormData({ ...formData, bezeichnung: e.target.value })}
                placeholder=""
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none bg-white"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Objektadresse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objektadresse
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.objektadresseId}
                  onChange={(e) => setFormData({ ...formData, objektadresseId: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none bg-white"
                >
                  <option value=""></option>
                  {objectAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="px-4 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Projektleiter & Kundenreferenz */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projektleiter
              </label>
              <select
                value={formData.projektleiterId}
                onChange={(e) => setFormData({ ...formData, projektleiterId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none bg-white"
              >
                <option value=""></option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kundenreferenz
              </label>
              <input
                type="text"
                value={formData.kundenreferenz}
                onChange={(e) => setFormData({ ...formData, kundenreferenz: e.target.value })}
                placeholder=""
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
              />
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              value={formData.beschreibung}
              onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
              placeholder=""
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none resize-none"
            />
          </div>

          {/* Abweichende Projektadresse */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.abweichendeAdresse}
                onChange={(e) => setFormData({ ...formData, abweichendeAdresse: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-sm text-gray-700">abweichende Projektadresse</span>
            </label>
          </div>

          {/* Verlauf Box */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <h2 className="font-medium text-gray-900">Verlauf</h2>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Erstellt am
                  </label>
                  <p className="text-sm text-gray-600">{format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                  <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
                    von
                  </label>
                  <p className="text-sm text-gray-600">{user?.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Geändert am
                  </label>
                  <p className="text-sm text-gray-600">-</p>
                  <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
                    von
                  </label>
                  <p className="text-sm text-gray-600">-</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gelöscht am
                  </label>
                  <p className="text-sm text-gray-600">-</p>
                  <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
                    von
                  </label>
                  <p className="text-sm text-gray-600">-</p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              href={`/dashboard/company/${uid}/projects`}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={saving || !formData.bezeichnung.trim()}
              className="px-6 py-2.5 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Wird erstellt...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
