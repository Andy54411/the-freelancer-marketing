'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { 
  ChevronUp, 
  ChevronDown, 
  Plus,
  LayoutGrid,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Project {
  id: string;
  projektNummer: string;
  bezeichnung: string;
  kunde: string;
  kundeId: string;
  status: string;
  projektleiter: string;
  projektleiterId: string;
  strasse: string;
  plz: string;
  stadt: string;
  createdAt: Date;
}

interface Customer {
  id: string;
  name: string;
  firma?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

type SortField = 'projektNummer' | 'kunde' | 'bezeichnung' | 'strasse' | 'plz' | 'stadt' | 'status' | 'projektleiter';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS = [
  { value: '', label: 'Alle' },
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

const PAGE_SIZE_OPTIONS = [15, 50, 100, 200];

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const uid = params?.uid as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    projektNummer: '',
    kunde: '',
    bezeichnung: '',
    strasse: '',
    plz: '',
    stadt: '',
    status: '',
    projektleiter: '',
  });

  // Sorting
  const [sortField, setSortField] = useState<SortField>('projektNummer');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    if (!uid) return;
    loadData();
  }, [uid]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load projects
      const projectsRef = collection(db, 'companies', uid, 'projects');
      const projectsSnap = await getDocs(query(projectsRef, orderBy('createdAt', 'desc')));
      const projectsData = projectsSnap.docs.map(doc => {
        const data = doc.data();
        // Parse objektadresse if available
        let strasse = data.strasse || '';
        let plz = data.plz || '';
        let stadt = data.stadt || '';
        
        if (data.objektadresse && (!strasse || !plz || !stadt)) {
          const adressParts = data.objektadresse.split(',').map((p: string) => p.trim());
          if (adressParts.length >= 1) strasse = strasse || adressParts[0];
          if (adressParts.length >= 2) {
            const plzStadt = adressParts[1].split(' ');
            if (plzStadt.length >= 1) plz = plz || plzStadt[0];
            if (plzStadt.length >= 2) stadt = stadt || plzStadt.slice(1).join(' ');
          }
        }

        return {
          id: doc.id,
          projektNummer: data.projektNummer || data.number || '',
          bezeichnung: data.bezeichnung || data.name || '',
          kunde: data.kunde || data.customerName || '',
          kundeId: data.kundeId || data.customerId || '',
          status: data.status || 'neu',
          projektleiter: data.projektleiter || data.projectManager || '',
          projektleiterId: data.projektleiterId || data.projectManagerId || '',
          strasse,
          plz,
          stadt,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
      setProjects(projectsData);

      // Load customers
      const customersRef = collection(db, 'companies', uid, 'customers');
      const customersSnap = await getDocs(customersRef);
      const customersData = customersSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().firma || '',
        firma: doc.data().firma,
      }));
      setCustomers(customersData);

      // Load employees
      const employeesRef = collection(db, 'companies', uid, 'employees');
      const employeesSnap = await getDocs(employeesRef);
      const employeesData = employeesSnap.docs.map(doc => ({
        id: doc.id,
        firstName: doc.data().firstName || '',
        lastName: doc.data().lastName || '',
      }));
      setEmployees(employeesData);

    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? option.label : status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'neu':
        return 'bg-blue-100 text-blue-800';
      case 'angebotserstellung':
        return 'bg-purple-100 text-purple-800';
      case 'vertrieb':
        return 'bg-indigo-100 text-indigo-800';
      case 'beauftragt':
        return 'bg-teal-100 text-teal-800';
      case 'verloren':
        return 'bg-red-100 text-red-800';
      case 'auftragserfuellung':
        return 'bg-yellow-100 text-yellow-800';
      case 'rechnung':
        return 'bg-orange-100 text-orange-800';
      case 'warten_auf_zahlung':
        return 'bg-amber-100 text-amber-800';
      case 'abgeschlossen':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtered and sorted projects
  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // Apply filters
    if (filters.projektNummer) {
      result = result.filter(p => 
        p.projektNummer.toLowerCase().includes(filters.projektNummer.toLowerCase())
      );
    }
    if (filters.kunde) {
      result = result.filter(p => 
        p.kunde.toLowerCase().includes(filters.kunde.toLowerCase())
      );
    }
    if (filters.bezeichnung) {
      result = result.filter(p => 
        p.bezeichnung.toLowerCase().includes(filters.bezeichnung.toLowerCase())
      );
    }
    if (filters.strasse) {
      result = result.filter(p => 
        p.strasse.toLowerCase().includes(filters.strasse.toLowerCase())
      );
    }
    if (filters.plz) {
      result = result.filter(p => 
        p.plz.toLowerCase().includes(filters.plz.toLowerCase())
      );
    }
    if (filters.stadt) {
      result = result.filter(p => 
        p.stadt.toLowerCase().includes(filters.stadt.toLowerCase())
      );
    }
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }
    if (filters.projektleiter) {
      result = result.filter(p => 
        p.projektleiter.toLowerCase().includes(filters.projektleiter.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [projects, filters, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProjects.length / pageSize);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedProjects.slice(start, start + pageSize);
  }, [filteredAndSortedProjects, currentPage, pageSize]);

  const handleExcelExport = () => {
    // CSV Export
    const headers = ['Nummer', 'Kunde', 'Bezeichnung', 'Straße', 'PLZ', 'Stadt', 'Status', 'Projektleiter'];
    const rows = filteredAndSortedProjects.map(p => [
      p.projektNummer,
      p.kunde,
      p.bezeichnung,
      p.strasse,
      p.plz,
      p.stadt,
      getStatusLabel(p.status),
      p.projektleiter
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `projekte_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-300" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-[#14ad9f]" />
      : <ChevronDown className="w-3 h-3 text-[#14ad9f]" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h1 className="text-lg font-semibold text-gray-900">Projekte</h1>
        <div className="flex items-center gap-1">
          <button
            title="Status Ansicht"
            onClick={() => router.push(`/dashboard/company/${uid}/projects/status`)}
            className="p-2 text-[#14ad9f] hover:bg-teal-50 rounded transition-colors"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            title="Excelexport"
            onClick={handleExcelExport}
            className="p-2 text-[#14ad9f] hover:bg-teal-50 rounded transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            title="Projekt erstellen"
            onClick={() => router.push(`/dashboard/company/${uid}/projects/new`)}
            className="p-2 text-[#14ad9f] hover:bg-teal-50 rounded transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            {/* Header Row */}
            <tr className="bg-gray-100 border-b border-gray-200">
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('projektNummer')}
              >
                <div className="flex items-center gap-1">
                  Nummer
                  <SortIcon field="projektNummer" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('kunde')}
              >
                <div className="flex items-center gap-1">
                  Kunde
                  <SortIcon field="kunde" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('bezeichnung')}
              >
                <div className="flex items-center gap-1">
                  Bezeichnung
                  <SortIcon field="bezeichnung" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('strasse')}
              >
                <div className="flex items-center gap-1">
                  Straße
                  <SortIcon field="strasse" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors w-20"
                onClick={() => handleSort('plz')}
              >
                <div className="flex items-center gap-1">
                  ZIP
                  <SortIcon field="plz" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('stadt')}
              >
                <div className="flex items-center gap-1">
                  Stadt
                  <SortIcon field="stadt" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('projektleiter')}
              >
                <div className="flex items-center gap-1">
                  Projektleiter
                  <SortIcon field="projektleiter" />
                </div>
              </th>
            </tr>
            {/* Filter Row */}
            <tr className="bg-white border-b border-gray-200">
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filters.projektNummer}
                  onChange={(e) => handleFilterChange('projektNummer', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </th>
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filters.kunde}
                  onChange={(e) => handleFilterChange('kunde', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </th>
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filters.bezeichnung}
                  onChange={(e) => handleFilterChange('bezeichnung', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </th>
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filters.strasse}
                  onChange={(e) => handleFilterChange('strasse', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </th>
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filters.plz}
                  onChange={(e) => handleFilterChange('plz', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </th>
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filters.stadt}
                  onChange={(e) => handleFilterChange('stadt', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </th>
              <th className="px-2 py-2">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filters.projektleiter}
                  onChange={(e) => handleFilterChange('projektleiter', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Keine Projekte gefunden
                </td>
              </tr>
            ) : (
              paginatedProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/company/${uid}/projects/${project.id}`)}
                >
                  <td className="px-3 py-2 text-sm font-medium text-[#14ad9f]">
                    {project.projektNummer}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {project.kunde}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {project.bezeichnung}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {project.strasse}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {project.plz}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {project.stadt}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {project.projektleiter}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Zeige</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            von {filteredAndSortedProjects.length} Einträgen
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Erste
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-sm text-gray-700">
            Seite {currentPage} von {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Letzte
          </button>
        </div>
      </div>
    </div>
  );
}
