'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'invoice' | 'customer' | 'document' | 'quote' | 'expense' | 'system';
  user: string;
  email?: string;
  userId?: string;
  action: string;
  target?: string;
  targetLink?: string;
  customerName?: string;
  customerLink?: string;
  date: string;
  time: string;
  timestamp?: Timestamp;
  description?: string;
  metadata?: any;
}

interface FirestoreActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  user?: string;
  userId?: string;
  email?: string;
  timestamp: Timestamp;
  targetId?: string;
  targetType?: string;
  customerName?: string;
  customerId?: string;
  metadata?: any;
}

interface ActivityHistoryCardProps {
  companyId?: string;
  showFilter?: boolean;
}

export default function ActivityHistoryCard({
  companyId,
  showFilter = true
}: ActivityHistoryCardProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Use companyId from props or fall back to user's uid (companies are stored with user's uid as id)
  const activeCompanyId = companyId || user?.uid;

  useEffect(() => {
    if (!activeCompanyId) {
      setError('Keine Company ID verfügbar');
      setLoading(false);
      return;
    }



    loadCustomerActivities();
  }, [activeCompanyId]);

  const loadCustomerActivities = async () => {
    if (!activeCompanyId) {
      setError('Keine Company ID verfügbar');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Lade alle Kunden der Company
      const customersRef = collection(db, 'companies', activeCompanyId, 'customers');
      const customersSnapshot = await getDocs(customersRef);



      const allActivities: ActivityItem[] = [];

      // 2. Für jeden Kunden, lade dessen Aktivitäten
      for (const customerDoc of customersSnapshot.docs) {
        const customerId = customerDoc.id;
        const customerData = customerDoc.data();
        const customerName = customerData.name || customerData.customerName || 'Unbekannter Kunde';

        try {
          // Aktivitäten dieses Kunden laden
          const activitiesRef = collection(db, 'companies', activeCompanyId, 'customers', customerId, 'activities');
          const activitiesQuery = query(
            activitiesRef,
            orderBy('timestamp', 'desc'),
            limit(20) // Limit pro Kunde für Performance
          );

          const activitiesSnapshot = await getDocs(activitiesQuery);



          activitiesSnapshot.forEach((activityDoc) => {
            const data = activityDoc.data() as FirestoreActivityItem;

            try {
              const timestamp = data.timestamp?.toDate() || new Date();

              const activityItem: ActivityItem = {
                id: `${customerId}_${activityDoc.id}`, // Unique ID across all customers
                type: mapFirestoreTypeToActivityType(data.type),
                user: data.user || data.userId || 'System',
                email: data.email,
                userId: data.userId,
                action: parseActionFromTitle(data.title, data.type),
                target: parseTargetFromDescription(data.description, data.type),
                targetLink: generateTargetLink(data.targetType, data.targetId, data.metadata),
                customerName: customerName,
                customerLink: `/dashboard/company/${activeCompanyId}/customers/${customerId}`,
                date: timestamp.toLocaleDateString('de-DE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }).toUpperCase(),
                time: timestamp.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                timestamp: data.timestamp,
                description: data.description,
                metadata: { ...data.metadata, customerId, customerName }
              };

              allActivities.push(activityItem);
            } catch (parseError) {
              console.warn('⚠️ ActivityHistoryCard: Error parsing activity:', activityDoc.id, parseError);
            }
          });
        } catch (customerError) {
          console.warn(`⚠️ ActivityHistoryCard: Error loading activities for customer ${customerId}:`, customerError);
        }
      }

      // 3. Sortiere alle Aktivitäten nach Timestamp (neueste zuerst)
      allActivities.sort((a, b) => {
        const timestampA = a.timestamp?.toDate()?.getTime() || 0;
        const timestampB = b.timestamp?.toDate()?.getTime() || 0;
        return timestampB - timestampA;
      });



      setActivities(allActivities);
      setFilteredActivities(allActivities); // Initial gefilterte Liste
      setError(null);
    } catch (error) {
      console.error('❌ ActivityHistoryCard: Error loading customer activities:', error);
      setError('Fehler beim Laden der Aktivitäten');
    } finally {
      setLoading(false);
    }
  };

  // Filter-Logik
  const applyFilters = () => {
    let filtered = [...activities];

    // 1. Typ-Filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((activity) => selectedTypes.includes(activity.type));
    }

    // 2. Zeitraum-Filter
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (selectedTimeRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }

      filtered = filtered.filter((activity) => {
        const activityDate = activity.timestamp?.toDate() || new Date(0);
        return activityDate >= cutoffDate;
      });
    }

    // 3. Kunden-Filter
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter((activity) =>
      activity.customerName === selectedCustomer
      );
    }

    // 4. Suchbegriff-Filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((activity) =>
      activity.description?.toLowerCase().includes(searchLower) ||
      activity.target?.toLowerCase().includes(searchLower) ||
      activity.customerName?.toLowerCase().includes(searchLower) ||
      activity.user.toLowerCase().includes(searchLower)
      );
    }

    setFilteredActivities(filtered);
    setCurrentPage(1); // Reset auf erste Seite bei Filter-Änderung
  };

  // Wende Filter an wenn sich Filter-States ändern
  useEffect(() => {
    applyFilters();
  }, [activities, selectedTypes, selectedTimeRange, selectedCustomer, searchTerm]);

  // Eindeutige Kunden für Filter-Dropdown
  const uniqueCustomers = [...new Set(activities.map((a) => a.customerName).filter(Boolean))];

  const activityTypes = [
  { value: 'invoice', label: 'Rechnungen', count: activities.filter((a) => a.type === 'invoice').length },
  { value: 'customer', label: 'Kunden', count: activities.filter((a) => a.type === 'customer').length },
  { value: 'quote', label: 'Angebote', count: activities.filter((a) => a.type === 'quote').length },
  { value: 'expense', label: 'Ausgaben', count: activities.filter((a) => a.type === 'expense').length },
  { value: 'document', label: 'Dokumente', count: activities.filter((a) => a.type === 'document').length },
  { value: 'system', label: 'System', count: activities.filter((a) => a.type === 'system').length }].
  filter((type) => type.count > 0);

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

  // Helper-Funktionen für Datenkonvertierung
  const mapFirestoreTypeToActivityType = (firestoreType: string): ActivityItem['type'] => {
    switch (firestoreType.toLowerCase()) {
      case 'invoice':
      case 'rechnung':
        return 'invoice';
      case 'customer':
      case 'kunde':
        return 'customer';
      case 'quote':
      case 'angebot':
        return 'quote';
      case 'expense':
      case 'ausgabe':
        return 'expense';
      case 'document':
      case 'dokument':
        return 'document';
      case 'system':
        return 'system';
      default:
        return 'document';
    }
  };

  const parseActionFromTitle = (title: string, type: string): string => {
    // Extrahiere Aktion aus dem Titel
    if (title.includes('erstellt')) return 'hat erstellt';
    if (title.includes('aktualisiert')) return 'hat aktualisiert';
    if (title.includes('gelöscht')) return 'hat gelöscht';
    if (title.includes('hinzugefügt')) return 'hat hinzugefügt';
    if (title.includes('angenommen')) return 'hat angenommen';
    if (title.includes('abgelehnt')) return 'hat abgelehnt';
    if (title.includes('versendet')) return 'hat versendet';

    // Fallback basierend auf Typ
    switch (type) {
      case 'invoice':return 'hat eine neue';
      case 'customer':return 'hat';
      case 'quote':return 'hat ein neues';
      default:return 'hat';
    }
  };

  const parseTargetFromDescription = (description: string, type: string): string => {
    // Versuche spezifische Entitäten zu extrahieren
    const invoiceMatch = description.match(/Rechnung\s+(RE-\d+)/i);
    if (invoiceMatch) return invoiceMatch[0];

    const quoteMatch = description.match(/Angebot\s+(AN-\d+)/i);
    if (quoteMatch) return quoteMatch[0];

    const customerMatch = description.match(/Kunde\s+(.+?)(?:\s|$)/i);
    if (customerMatch) return `Kunde ${customerMatch[1]}`;

    // Fallback: Erste Worte der Beschreibung
    const words = description.split(' ');
    return words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
  };

  const generateTargetLink = (targetType?: string, targetId?: string, metadata?: any): string | undefined => {
    if (!targetType || !targetId) return undefined;

    const companyId = activeCompanyId;

    switch (targetType.toLowerCase()) {
      case 'invoice':
      case 'rechnung':
        return `/dashboard/company/${companyId}/invoices/${targetId}`;
      case 'customer':
      case 'kunde':
        return `/dashboard/company/${companyId}/customers/${targetId}`;
      case 'quote':
      case 'angebot':
        return `/dashboard/company/${companyId}/quotes/${targetId}`;
      case 'expense':
      case 'ausgabe':
        return `/dashboard/company/${companyId}/expenses/${targetId}`;
      default:
        return undefined;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-600">
            <path d="M12.75 3.25V8.25C12.75 8.80228 13.1977 9.25 13.75 9.25H18.75M5.75 2.75H12.3358C12.601 2.75 12.8554 2.85536 13.0429 3.04289L18.9571 8.95711C19.1446 9.14464 19.25 9.399 19.25 9.66421V20.25C19.25 20.8023 18.8023 21.25 18.25 21.25H5.75C5.19771 21.25 4.75 20.8023 4.75 20.25V3.75C4.75 3.19772 5.19772 2.75 5.75 2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>);

      case 'quote':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-purple-600">
            <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>);

      case 'customer':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-600">
            <path d="M5.85697 18.9157C7.17056 16.9968 9.33203 15.75 12 15.75C14.668 15.75 16.8294 16.9968 18.143 18.9157M5.85697 18.9157C7.49061 20.3679 9.6423 21.25 12 21.25C14.3577 21.25 16.5094 20.3679 18.143 18.9157M5.85697 18.9157C3.95086 17.2214 2.75 14.7509 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 14.7509 20.0491 17.2214 18.143 18.9157M15.25 10C15.25 11.7949 13.7949 13.25 12 13.25C10.2051 13.25 8.75 11.7949 8.75 10C8.75 8.20507 10.2051 6.75 12 6.75C13.7949 6.75 15.25 8.20507 15.25 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>);

      case 'expense':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-600">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>);

      case 'document':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-orange-600">
            <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7l-5-5zM15 2v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>);

      case 'system':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-600">
            <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>);

      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-600">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>);

    }
  };

  const formatActivityText = (activity: ActivityItem) => {
    const userPart =
    <span className="font-semibold text-gray-900">
        {activity.user} {activity.email}
      </span>;


    if (activity.type === 'customer' && activity.customerName) {
      return (
        <span>
          {userPart} {activity.action}{' '}
          <a href={activity.customerLink} className="text-[#14ad9f] hover:text-[#129a8f] hover:underline font-medium">
            {activity.customerName}
          </a>
          {' '}{activity.target}
        </span>);

    }

    return (
      <span>
        {userPart} {activity.action}{' '}
        {activity.target && activity.targetLink ?
        <a href={activity.targetLink} className="text-[#14ad9f] hover:text-[#129a8f] hover:underline font-medium">
            {activity.target}
          </a> :

        <span>{activity.target}</span>
        }
        {activity.customerName &&
        <span>
            {' '}für{' '}
            <a href={activity.customerLink} className="text-[#14ad9f] hover:text-[#129a8f] hover:underline font-medium">
              {activity.customerName}
            </a>
          </span>
        }
        {' '}erstellt.
      </span>);

  };

  if (!activeCompanyId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Verlauf</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Keine Company ID verfügbar</p>
        </div>
      </div>);

  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Verlauf</h2>
            {filteredActivities.length !== activities.length &&
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                {filteredActivities.length} von {activities.length} Aktivitäten
              </span>
            }
          </div>
          {showFilter &&
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg ${
            showFilters || selectedTypes.length > 0 || selectedTimeRange !== 'all' || selectedCustomer !== 'all' || searchTerm ?
            'text-[#14ad9f] bg-[#14ad9f]/10 border-[#14ad9f]/20 hover:bg-[#14ad9f]/20' :
            'text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border-gray-200'}`
            }>

              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M2.75 4.75H21.25M8.75 19.25H15.25M5.75 12H18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Filter</span>
              {(selectedTypes.length > 0 || selectedTimeRange !== 'all' || selectedCustomer !== 'all' || searchTerm) &&
            <span className="bg-[#14ad9f] text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {selectedTypes.length + (selectedTimeRange !== 'all' ? 1 : 0) + (selectedCustomer !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0)}
                </span>
            }
            </button>
          }
        </div>

        {/* Filter Panel */}
        {showFilters &&
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {/* Suchfeld */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Suchen</label>
              <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suche in Aktivitäten..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm" />

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Activity Types Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aktivitätstyp</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {activityTypes.map((type) =>
                <label key={type.value} className="flex items-center">
                      <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTypes([...selectedTypes, type.value]);
                      } else {
                        setSelectedTypes(selectedTypes.filter((t) => t !== type.value));
                      }
                    }}
                    className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]" />

                      <span className="ml-2 text-sm text-gray-700 flex-1">
                        {type.label}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {type.count}
                      </span>
                    </label>
                )}
                </div>
              </div>

              {/* Time Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
                <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm">

                  <option value="all">Alle Zeiten</option>
                  <option value="today">Heute</option>
                  <option value="week">Letzte 7 Tage</option>
                  <option value="month">Letzter Monat</option>
                  <option value="quarter">Letztes Quartal</option>
                </select>
              </div>

              {/* Customer Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kunde</label>
                <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm">

                  <option value="all">Alle Kunden</option>
                  {uniqueCustomers.map((customer) =>
                <option key={customer} value={customer}>
                      {customer}
                    </option>
                )}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedTypes.length > 0 || selectedTimeRange !== 'all' || selectedCustomer !== 'all' || searchTerm) &&
          <div className="mt-4 pt-4 border-t border-gray-200">
                <button
              onClick={() => {
                setSelectedTypes([]);
                setSelectedTimeRange('all');
                setSelectedCustomer('all');
                setSearchTerm('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900 underline">

                  Alle Filter zurücksetzen
                </button>
              </div>
          }
          </div>
        }
        
        {loading ?
        <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#14ad9f]" />
            <span className="ml-2 text-gray-600">Aktivitäten werden geladen...</span>
          </div> :
        error ?
        <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div> :
        filteredActivities.length === 0 ?
        <div className="text-center py-8 text-gray-500">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-gray-300">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>
              {activities.length === 0 ?
            'Noch keine Aktivitäten vorhanden' :
            'Keine Aktivitäten für die gewählten Filter gefunden'
            }
            </p>
            {activities.length > 0 &&
          <button
            onClick={() => {
              setSelectedTypes([]);
              setSelectedTimeRange('all');
              setSelectedCustomer('all');
              setSearchTerm('');
            }}
            className="mt-2 text-sm text-[#14ad9f] hover:text-[#129a8f] underline">

                Filter zurücksetzen
              </button>
          }
          </div> :

        <div className="space-y-4">
            {filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((activity) =>
          <div key={activity.id} className="flex gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {activity.date} - {activity.time}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {formatActivityText(activity)}
                  </div>
                </div>
              </div>
          )}
          </div>
        }
      </div>
      
      {/* Pagination */}
      {totalPages > 1 &&
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between">
            <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 20L7.70708 12.7071C7.31655 12.3166 7.31655 11.6834 7.70708 11.2929L15 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            
            <span className="text-sm text-gray-600">
              {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredActivities.length)} von {filteredActivities.length}
              {filteredActivities.length !== activities.length &&
            <span className="text-gray-400"> (gefiltert aus {activities.length})</span>
            }
            </span>
            
            <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 4L16.2929 11.2929C16.6834 11.6834 16.6834 12.3166 16.2929 12.7071L9 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>);

}