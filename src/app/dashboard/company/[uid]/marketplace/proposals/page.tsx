'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock as FiClock,
  Search as FiSearch,
  Inbox as FiInbox,
  Loader2 as FiLoader,
  Building as FiBuilding,
  User as FiUser,
  CheckCircle as FiCheckCircle,
  XCircle as FiXCircle,
  Eye as FiEye,
  Calendar as FiCalendar,
  AlertCircle as FiAlertCircle,
  Send as FiSend,
  MessageSquare as FiMessageSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Interface für Marketplace Proposals (Angebots-Anfragen)
interface MarketplaceProposal {
  id: string;
  title: string;
  description: string;
  serviceCategory: string;
  serviceSubcategory: string;
  projectType: 'fixed_price' | 'hourly' | 'project';
  status: 'pending' | 'responded' | 'accepted' | 'declined';
  budgetRange?: string;
  deadline?: string;
  location?: string;
  hasResponse?: boolean;
  response?: Record<string, unknown>;
  customer: {
    name: string;
    type: 'user' | 'company';
    email: string;
    avatar?: string;
    uid: string;
  };
  createdAt: string;
  updatedAt?: string;
  requirements?: string[];
  attachments?: Record<string, unknown>[];
}

export default function MarketplaceProposalsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [proposals, setProposals] = useState<MarketplaceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const uid = params?.uid as string;

  const fetchProposals = useCallback(async () => {
    try {
      if (!firebaseUser || !uid) return;

      setLoading(true);

      const token = await firebaseUser.getIdToken();
      if (!token) return;

      // API call to fetch marketplace proposals
      const response = await fetch(`/api/company/${uid}/quotes/incoming`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Bereinige die Daten um sicherzustellen, dass keine Objekte gerendert werden
      const cleanedProposals = (data.quotes || []).map((proposal: Record<string, unknown>) => ({
        ...proposal,
        budgetRange:
          typeof proposal.budgetRange === 'string'
            ? proposal.budgetRange
            : (proposal.budget as Record<string, unknown>)?.budgetRange
              ? (proposal.budget as Record<string, unknown>).budgetRange
              : (proposal.budget as Record<string, unknown>)?.min &&
                  (proposal.budget as Record<string, unknown>)?.max &&
                  (proposal.budget as Record<string, unknown>)?.currency
                ? `${(proposal.budget as Record<string, unknown>).min}€ - ${(proposal.budget as Record<string, unknown>).max}€`
                : 'Nicht angegeben',
      }));

      setProposals(cleanedProposals);
    } catch (error) {
      console.error('Fehler beim Laden der Proposals:', error);
      setError('Fehler beim Laden der Marketplace Proposals');
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, uid]);

  useEffect(() => {
    if (!params?.uid) return;
    if (authLoading) return;
    if (!user || !firebaseUser) {
      router.push('/login');
      return;
    }

    fetchProposals();
  }, [user, firebaseUser, authLoading, uid, params?.uid, router, fetchProposals]);

  // Early return if no params
  if (!params?.uid) {
    return <div>Loading...</div>;
  }

  const handleViewProposal = (proposalId: string) => {
    router.push(`/dashboard/company/${uid}/quotes/incoming/${proposalId}`);
  };

  const handleRespond = (proposalId: string) => {
    router.push(`/dashboard/company/${uid}/quotes/incoming/${proposalId}?action=respond`);
  };

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch =
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.customer.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || proposal.serviceCategory === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'responded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FiClock className="w-4 h-4" />;
      case 'responded':
        return <FiMessageSquare className="w-4 h-4" />;
      case 'accepted':
        return <FiCheckCircle className="w-4 h-4" />;
      case 'declined':
        return <FiXCircle className="w-4 h-4" />;
      default:
        return <FiInbox className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Wartend';
      case 'responded':
        return 'Beantwortet';
      case 'accepted':
        return 'Angenommen';
      case 'declined':
        return 'Abgelehnt';
      default:
        return 'Unbekannt';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <FiLoader className="w-8 h-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Marketplace Proposals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <FiAlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Proposals</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie eingehende Anfragen und Proposals aus dem Taskilo Marketplace
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push(`/dashboard/company/${uid}/quotes/incoming`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
          >
            <FiEye className="w-4 h-4 mr-2" />
            Alle Anfragen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Proposals durchsuchen..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Alle Status</option>
              <option value="pending">Wartend</option>
              <option value="responded">Beantwortet</option>
              <option value="accepted">Angenommen</option>
              <option value="declined">Abgelehnt</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">Alle Kategorien</option>
              <option value="handwerk">Handwerk</option>
              <option value="reinigung">Reinigung</option>
              <option value="garten">Garten & Landschaft</option>
              <option value="umzug">Umzug & Transport</option>
              <option value="reparatur">Reparatur & Wartung</option>
            </select>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiInbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Proposals gefunden</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Versuchen Sie andere Suchkriterien.'
                : 'Es sind noch keine Marketplace Proposals eingegangen.'}
            </p>
          </div>
        ) : (
          filteredProposals.map(proposal => (
            <div
              key={proposal.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {proposal.title}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}
                    >
                      {getStatusIcon(proposal.status)}
                      <span className="ml-1">{getStatusText(proposal.status)}</span>
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">{proposal.description}</p>

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      {proposal.customer.type === 'company' ? (
                        <FiBuilding className="w-4 h-4 mr-1" />
                      ) : (
                        <FiUser className="w-4 h-4 mr-1" />
                      )}
                      {proposal.customer.name}
                    </div>

                    {proposal.budgetRange && (
                      <div className="flex items-center">
                        <span>Budget: {proposal.budgetRange}</span>
                      </div>
                    )}

                    {proposal.deadline && (
                      <div className="flex items-center">
                        <FiCalendar className="w-4 h-4 mr-1" />
                        {new Date(proposal.deadline).toLocaleDateString('de-DE')}
                      </div>
                    )}

                    <div className="flex items-center">
                      <span className="capitalize">{proposal.serviceCategory}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleViewProposal(proposal.id)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                  >
                    <FiEye className="w-4 h-4 mr-1" />
                    Ansehen
                  </button>

                  {proposal.status === 'pending' && (
                    <button
                      onClick={() => handleRespond(proposal.id)}
                      className="inline-flex items-center px-3 py-2 bg-[#14ad9f] text-white rounded-lg text-sm font-medium hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      <FiSend className="w-4 h-4 mr-1" />
                      Antworten
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      {filteredProposals.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredProposals.length} von {proposals.length} Proposals angezeigt
            </span>
            <div className="flex items-center space-x-4">
              <span>Wartend: {proposals.filter(p => p.status === 'pending').length}</span>
              <span>Beantwortet: {proposals.filter(p => p.status === 'responded').length}</span>
              <span>Angenommen: {proposals.filter(p => p.status === 'accepted').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
