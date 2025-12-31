'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Star, 
  CheckCircle, 
  Clock, 
  Mail, 
  AlertCircle,
  TrendingUp,
  BarChart3,
  Search,
  RefreshCw
} from 'lucide-react';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface CompanyReview {
  id: string;
  orderId: string;
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  qualityOfWork: number;
  communication: number;
  punctuality: number;
  professionalism: number;
  pricePerformance: number;
  reliability: number;
  friendliness: number;
  expertise: number;
  cleanliness: number;
  recommendation: number;
  averageRating: number;
  overallComment: string;
  wouldHireAgain: boolean;
  createdAt: Timestamp;
}

interface ReviewRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  providerName: string;
  status: string;
  orderReviewSentAt: Timestamp | null;
  orderReviewCompletedAt: Timestamp | null;
  companyReviewSentAt: Timestamp | null;
  companyReviewCompletedAt: Timestamp | null;
  createdAt: Timestamp;
}

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'company' | 'requests'>('company');
  const [companyReviews, setCompanyReviews] = useState<CompanyReview[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Company Reviews laden
      const reviewsQuery = query(
        collection(db, 'companyReviews'),
        orderBy('createdAt', 'desc')
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompanyReview[];
      setCompanyReviews(reviews);
      
      // Review Requests laden
      const requestsQuery = query(
        collection(db, 'reviewRequests'),
        orderBy('createdAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReviewRequest[];
      setReviewRequests(requests);
      
    } catch {
      // Error silently handled
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const sendTestEmails = async () => {
    setSendingTestEmail(true);
    try {
      const response = await fetch('/api/reviews/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: 'andy.staudinger@taskilo.de',
          type: 'both',
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Test-E-Mails gesendet!\n\nOrder Review: ${result.results[0]?.reviewLink}\n\nCompany Review: ${result.results[1]?.reviewLink}`);
        loadData();
      } else {
        alert('Fehler: ' + result.error);
      }
    } catch {
      alert('Fehler beim Senden der Test-E-Mails');
    } finally {
      setSendingTestEmail(false);
    }
  };
  
  // Statistiken berechnen
  const stats = {
    totalCompanyReviews: companyReviews.length,
    averageRating: companyReviews.length > 0 
      ? (companyReviews.reduce((sum, r) => sum + r.averageRating, 0) / companyReviews.length).toFixed(1)
      : '0.0',
    wouldHireAgainPercent: companyReviews.length > 0
      ? Math.round((companyReviews.filter(r => r.wouldHireAgain).length / companyReviews.length) * 100)
      : 0,
    pendingRequests: reviewRequests.filter(r => r.status !== 'completed').length,
    completedRequests: reviewRequests.filter(r => r.status === 'completed').length,
  };
  
  // Filter anwenden
  const filteredReviews = companyReviews.filter(review => {
    if (searchTerm && !review.providerName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !review.customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  const filteredRequests = reviewRequests.filter(request => {
    if (searchTerm && !request.providerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !request.customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterStatus !== 'all' && request.status !== filterStatus) {
      return false;
    }
    return true;
  });
  
  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-100';
    if (rating >= 6) return 'text-yellow-600 bg-yellow-100';
    if (rating >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Abgeschlossen</span>;
      case 'pending_order':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Auftragsbewertung ausstehend</span>;
      case 'pending_company':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Firmenbewertung ausstehend</span>;
      case 'expired':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Abgelaufen</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bewertungssystem</h1>
          <p className="text-gray-600">Übersicht aller Kundenbewertungen und Bewertungsanfragen</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </button>
          <button
            onClick={sendTestEmails}
            disabled={sendingTestEmail}
            className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {sendingTestEmail ? 'Sende...' : 'Test-E-Mails senden'}
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-[#14ad9f]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Firmenbewertungen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCompanyReviews}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Durchschnitt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating}/10</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Würden wieder buchen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.wouldHireAgainPercent}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ausstehend</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Abgeschlossen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedRequests}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('company')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'company'
                  ? 'text-[#14ad9f] border-b-2 border-[#14ad9f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Firmenbewertungen ({companyReviews.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'requests'
                  ? 'text-[#14ad9f] border-b-2 border-[#14ad9f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bewertungsanfragen ({reviewRequests.length})
            </button>
          </div>
        </div>
        
        {/* Search & Filter */}
        <div className="p-4 border-b border-gray-200 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen nach Firma oder Kunde..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            />
          </div>
          {activeTab === 'requests' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            >
              <option value="all">Alle Status</option>
              <option value="pending_order">Auftragsbewertung ausstehend</option>
              <option value="pending_company">Firmenbewertung ausstehend</option>
              <option value="completed">Abgeschlossen</option>
              <option value="expired">Abgelaufen</option>
            </select>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {activeTab === 'company' ? (
            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Noch keine Firmenbewertungen vorhanden</p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{review.providerName}</h3>
                        <p className="text-sm text-gray-500">Bewertet von: {review.customerName}</p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${getRatingColor(review.averageRating)}`}>
                          <Star className="w-4 h-4" />
                          {review.averageRating.toFixed(1)}/10
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    
                    {/* Rating Grid */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Qualität</p>
                        <p className="font-bold">{review.qualityOfWork}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Kommunikation</p>
                        <p className="font-bold">{review.communication}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Pünktlichkeit</p>
                        <p className="font-bold">{review.punctuality}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Professionalität</p>
                        <p className="font-bold">{review.professionalism}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Preis/Leistung</p>
                        <p className="font-bold">{review.pricePerformance}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Zuverlässigkeit</p>
                        <p className="font-bold">{review.reliability}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Freundlichkeit</p>
                        <p className="font-bold">{review.friendliness}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Fachkompetenz</p>
                        <p className="font-bold">{review.expertise}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Sauberkeit</p>
                        <p className="font-bold">{review.cleanliness}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Empfehlung</p>
                        <p className="font-bold">{review.recommendation}</p>
                      </div>
                    </div>
                    
                    {/* Comment & Would Hire Again */}
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 italic">&ldquo;{review.overallComment}&rdquo;</p>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        review.wouldHireAgain ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {review.wouldHireAgain ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Würde wieder buchen
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            Würde nicht wieder buchen
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Keine Bewertungsanfragen gefunden</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Kunde</th>
                      <th className="pb-3 font-medium">Firma</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Auftrags-E-Mail</th>
                      <th className="pb-3 font-medium">Firmen-E-Mail</th>
                      <th className="pb-3 font-medium">Erstellt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <p className="font-medium text-gray-900">{request.customerName}</p>
                          <p className="text-xs text-gray-500">{request.customerEmail}</p>
                        </td>
                        <td className="py-3 text-gray-700">{request.providerName}</td>
                        <td className="py-3">{getStatusBadge(request.status)}</td>
                        <td className="py-3">
                          {request.orderReviewCompletedAt ? (
                            <span className="text-green-600 text-sm flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Abgeschlossen
                            </span>
                          ) : request.orderReviewSentAt ? (
                            <span className="text-yellow-600 text-sm flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              Gesendet
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Ausstehend</span>
                          )}
                        </td>
                        <td className="py-3">
                          {request.companyReviewCompletedAt ? (
                            <span className="text-green-600 text-sm flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Abgeschlossen
                            </span>
                          ) : request.companyReviewSentAt ? (
                            <span className="text-yellow-600 text-sm flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              Gesendet
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 text-sm text-gray-500">{formatDate(request.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
