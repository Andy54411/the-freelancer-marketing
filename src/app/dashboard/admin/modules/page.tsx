/**
 * Admin Module Subscriptions Dashboard
 * 
 * Übersicht aller Modul-Abonnements für Admins:
 * - Aktive Module pro Unternehmen
 * - Trial-Status
 * - Umsatzübersicht
 * - Statistiken
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Users, 
  TrendingUp, 
  Clock,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface ModuleStats {
  totalActiveModules: number;
  totalTrialingModules: number;
  totalBundles: number;
  totalSeats: number;
  monthlyRevenue: number;
  moduleBreakdown: {
    whatsapp: { active: number; trial: number };
    advertising: { active: number; trial: number };
    recruiting: { active: number; trial: number };
    workspace: { active: number; trial: number };
  };
}

interface CompanyModuleData {
  companyId: string;
  companyName: string;
  email: string;
  activeModules: string[];
  trialingModules: string[];
  bundleActive: boolean;
  seats: {
    total: number;
    used: number;
  };
  monthlyTotal: number;
  createdAt: string;
}

const MODULE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp Business',
  advertising: 'Taskilo Advertising',
  recruiting: 'Recruiting',
  workspace: 'Workspace Pro',
};

export default function AdminModulesPage() {
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [companies, setCompanies] = useState<CompanyModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'trial' | 'bundle'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      
      const res = await fetch('/api/admin/modules/stats', {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setCompanies(data.companies);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = 
      company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (filterStatus) {
      case 'active':
        return company.activeModules.length > 0;
      case 'trial':
        return company.trialingModules.length > 0;
      case 'bundle':
        return company.bundleActive;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#14ad9f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modul-Abonnements</h1>
        <p className="text-gray-600">Übersicht aller Premium-Module und Seats</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#14ad9f]" />
            </div>
            <span className="text-sm text-gray-500">Aktive Module</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalActiveModules || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">In Testphase</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalTrialingModules || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Bundles</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalBundles || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Monatlicher Umsatz</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {(stats?.monthlyRevenue || 0).toFixed(2).replace('.', ',')} €
          </p>
        </div>
      </div>

      {/* Module Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Module-Verteilung</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats?.moduleBreakdown || {}).map(([moduleId, data]) => (
            <div key={moduleId} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {MODULE_LABELS[moduleId] || moduleId}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">{data.active} aktiv</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-600">{data.trial} trial</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Unternehmen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktive Module</option>
            <option value="trial">In Testphase</option>
            <option value="bundle">Bundle</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Unternehmen</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Module</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Seats</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Monatlich</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Keine Unternehmen gefunden
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.companyId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{company.companyName}</p>
                        <p className="text-sm text-gray-500">{company.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {company.bundleActive && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                            Bundle
                          </span>
                        )}
                        {company.activeModules.map((m) => (
                          <span key={m} className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            {MODULE_LABELS[m] || m}
                          </span>
                        ))}
                        {company.trialingModules.map((m) => (
                          <span key={m} className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            {MODULE_LABELS[m] || m} (Trial)
                          </span>
                        ))}
                        {!company.bundleActive && company.activeModules.length === 0 && company.trialingModules.length === 0 && (
                          <span className="text-sm text-gray-400">Keine Module</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {company.seats.used} / {company.seats.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-gray-900">
                        {company.monthlyTotal.toFixed(2).replace('.', ',')} €
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
