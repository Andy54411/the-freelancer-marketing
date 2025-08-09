'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Building,
  TrendingUp,
  Download,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface CompanyOnboardingOverview {
  uid: string;
  companyName: string;
  email: string;
  registrationDate: Date;
  onboardingStatus:
    | 'pending_onboarding'
    | 'in_progress'
    | 'completed'
    | 'approved'
    | 'rejected'
    | 'grandfathered';
  currentStep: number;
  completionPercentage: number;
  lastActivity: Date;
  stepsCompleted: number[];
  requiresApproval: boolean;
  adminNotes?: string;
  isLegacyCompany?: boolean;
  registrationMethod?: string;
}

interface OnboardingStats {
  totalCompanies: number;
  pendingOnboarding: number;
  inProgress: number;
  awaitingApproval: number;
  approved: number;
  grandfathered: number;
  avgCompletionTime: number;
  completionRate: number;
}

export default function CompanyOnboardingDashboard() {
  const [companies, setCompanies] = useState<CompanyOnboardingOverview[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyOnboardingOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OnboardingStats>({
    totalCompanies: 0,
    pendingOnboarding: 0,
    inProgress: 0,
    awaitingApproval: 0,
    approved: 0,
    grandfathered: 0,
    avgCompletionTime: 0,
    completionRate: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedCompanyDetails, setSelectedCompanyDetails] =
    useState<CompanyOnboardingOverview | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadCompaniesWithOnboardingStatus();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [companies, searchTerm, statusFilter]);

  const loadCompaniesWithOnboardingStatus = async () => {
    try {
      setLoading(true);

      // Use admin API instead of direct Firestore queries
      const response = await fetch('/api/admin/companies/onboarding', {
        method: 'GET',
        credentials: 'include', // Include admin session cookie
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load companies');
      }

      console.log('Loaded companies via API:', data.companies.length);
      setCompanies(data.companies);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading companies with onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = companies;

    // Search Filter
    if (searchTerm) {
      filtered = filtered.filter(
        company =>
          company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          company.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(company => company.onboardingStatus === statusFilter);
    }

    setFilteredCompanies(filtered);
  };

  const handleBulkApprove = async () => {
    if (selectedCompanies.length === 0) return;

    try {
      for (const companyUid of selectedCompanies) {
        await updateDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), {
          status: 'approved',
          approvedAt: serverTimestamp(),
          approvedBy: 'admin_bulk_action',
        });
      }

      setSelectedCompanies([]);
      loadCompaniesWithOnboardingStatus();
      alert(`${selectedCompanies.length} Unternehmen erfolgreich genehmigt.`);
    } catch (error) {
      console.error('Error in bulk approve:', error);
      alert('Fehler beim Genehmigen der Unternehmen.');
    }
  };

  const handleBulkReject = async () => {
    if (selectedCompanies.length === 0) return;

    const reason = prompt('Grund für Ablehnung:');
    if (!reason) return;

    try {
      for (const companyUid of selectedCompanies) {
        await updateDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
          rejectedBy: 'admin_bulk_action',
          rejectionReason: reason,
        });
      }

      setSelectedCompanies([]);
      loadCompaniesWithOnboardingStatus();
      alert(`${selectedCompanies.length} Unternehmen abgelehnt.`);
    } catch (error) {
      console.error('Error in bulk reject:', error);
      alert('Fehler beim Ablehnen der Unternehmen.');
    }
  };

  const handleShowDetails = (company: CompanyOnboardingOverview) => {
    setSelectedCompanyDetails(company);
    setShowDetailsModal(true);
  };

  const handleSingleApprove = async (companyUid: string) => {
    try {
      await updateDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'admin_single_action',
      });

      loadCompaniesWithOnboardingStatus();
      alert('Unternehmen erfolgreich genehmigt.');
    } catch (error) {
      console.error('Error approving company:', error);
      alert('Fehler beim Genehmigen des Unternehmens.');
    }
  };

  const handleSingleReject = async (companyUid: string) => {
    const reason = prompt('Grund für Ablehnung:');
    if (!reason) return;

    try {
      await updateDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: 'admin_single_action',
        rejectionReason: reason,
      });

      loadCompaniesWithOnboardingStatus();
      alert('Unternehmen abgelehnt.');
    } catch (error) {
      console.error('Error rejecting company:', error);
      alert('Fehler beim Ablehnen des Unternehmens.');
    }
  };

  const exportToCSV = () => {
    const csvData = filteredCompanies.map(company => ({
      Firmenname: company.companyName,
      'E-Mail': company.email,
      Registrierung: format(company.registrationDate, 'dd.MM.yyyy', { locale: de }),
      'Onboarding Status': getStatusLabel(company.onboardingStatus),
      'Aktueller Schritt': `${company.currentStep}/5`,
      'Fortschritt %': company.completionPercentage,
      'Letzte Aktivität': format(company.lastActivity, 'dd.MM.yyyy HH:mm', { locale: de }),
      Typ: company.isLegacyCompany ? 'Legacy' : 'Neu',
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `company-onboarding-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending_onboarding: { label: 'Ausstehend', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'In Bearbeitung', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Wartet auf Freigabe', className: 'bg-purple-100 text-purple-800' },
      approved: { label: 'Genehmigt', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      grandfathered: { label: 'Legacy (Bestandsschutz)', className: 'bg-gray-100 text-gray-800' },
    };

    const { label, className } =
      config[status as keyof typeof config] || config['pending_onboarding'];

    return <Badge className={className}>{label}</Badge>;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending_onboarding: 'Ausstehend',
      in_progress: 'In Bearbeitung',
      completed: 'Wartet auf Freigabe',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt',
      grandfathered: 'Legacy (Bestandsschutz)',
    };

    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Company Onboarding Übersicht</h1>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          CSV Export
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Unternehmen</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warten auf Start</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOnboarding}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warten auf Freigabe</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.awaitingApproval}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erfolgsquote</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completionRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter & Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Suche</label>
              <Input
                placeholder="Firmenname oder E-Mail..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="pending_onboarding">Ausstehend</SelectItem>
                  <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                  <SelectItem value="completed">Wartet auf Freigabe</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                  <SelectItem value="grandfathered">Legacy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Filter zurücksetzen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCompanies.length > 0 && (
        <Card className="mb-6 border-[#14ad9f]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedCompanies.length} Unternehmen ausgewählt
              </span>
              <div className="flex space-x-2">
                <Button onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700">
                  Alle genehmigen
                </Button>
                <Button onClick={handleBulkReject} variant="destructive">
                  Alle ablehnen
                </Button>
                <Button onClick={() => setSelectedCompanies([])} variant="outline">
                  Auswahl aufheben
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unternehmen ({filteredCompanies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedCompanies.length === filteredCompanies.length &&
                        filteredCompanies.length > 0
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedCompanies(filteredCompanies.map(c => c.uid));
                        } else {
                          setSelectedCompanies([]);
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-2">Unternehmen</th>
                  <th className="text-left p-2">Registrierung</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Fortschritt</th>
                  <th className="text-left p-2">Letzte Aktivität</th>
                  <th className="text-left p-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map(company => (
                  <tr key={company.uid} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company.uid)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedCompanies([...selectedCompanies, company.uid]);
                          } else {
                            setSelectedCompanies(
                              selectedCompanies.filter(id => id !== company.uid)
                            );
                          }
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{company.companyName}</div>
                        <div className="text-sm text-gray-500">{company.email}</div>
                      </div>
                    </td>
                    <td className="p-2 text-sm">
                      {format(company.registrationDate, 'dd.MM.yyyy', { locale: de })}
                    </td>
                    <td className="p-2">{getStatusBadge(company.onboardingStatus)}</td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>Schritt {company.currentStep}/5</span>
                            <span className="font-medium">{company.completionPercentage}%</span>
                          </div>
                          <div className="mt-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${company.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-sm">
                      {formatDistanceToNow(company.lastActivity, { addSuffix: true, locale: de })}
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowDetails(company)}
                        >
                          Details
                        </Button>
                        {company.onboardingStatus === 'completed' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleSingleApprove(company.uid)}
                            >
                              Genehmigen
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSingleReject(company.uid)}
                            >
                              Ablehnen
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCompanies.length === 0 && (
              <div className="text-center py-8 text-gray-500">Keine Unternehmen gefunden.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Unternehmensdetails</DialogTitle>
            <DialogDescription>Detaillierte Informationen zum Onboarding-Prozess</DialogDescription>
          </DialogHeader>

          {selectedCompanyDetails && (
            <div className="space-y-6">
              {/* Basic Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Firmeninformationen</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Firmenname:</span>{' '}
                      {selectedCompanyDetails.companyName}
                    </div>
                    <div>
                      <span className="font-medium">E-Mail:</span> {selectedCompanyDetails.email}
                    </div>
                    <div>
                      <span className="font-medium">UID:</span> {selectedCompanyDetails.uid}
                    </div>
                    <div>
                      <span className="font-medium">Registrierungsdatum:</span>{' '}
                      {format(selectedCompanyDetails.registrationDate, 'dd.MM.yyyy HH:mm', {
                        locale: de,
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Onboarding Status</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      {getStatusBadge(selectedCompanyDetails.onboardingStatus)}
                    </div>
                    <div>
                      <span className="font-medium">Aktueller Schritt:</span>{' '}
                      {selectedCompanyDetails.currentStep}/5
                    </div>
                    <div>
                      <span className="font-medium">Fortschritt:</span>{' '}
                      {selectedCompanyDetails.completionPercentage}%
                    </div>
                    <div>
                      <span className="font-medium">Letzte Aktivität:</span>{' '}
                      {format(selectedCompanyDetails.lastActivity, 'dd.MM.yyyy HH:mm', {
                        locale: de,
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Fortschrittsstatus</h3>
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[#14ad9f] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${selectedCompanyDetails.completionPercentage}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {selectedCompanyDetails.completionPercentage}% abgeschlossen
                </div>
              </div>

              {/* Completed Steps */}
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">
                  Abgeschlossene Schritte
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(step => {
                    const isCompleted = selectedCompanyDetails.stepsCompleted.includes(step);
                    const isCurrent = step === selectedCompanyDetails.currentStep;
                    return (
                      <div
                        key={step}
                        className={`p-3 rounded-lg text-center text-sm ${
                          isCompleted
                            ? 'bg-green-100 text-green-800'
                            : isCurrent
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <div className="font-medium">Schritt {step}</div>
                        <div className="text-xs mt-1">
                          {isCompleted ? '✓ Abgeschlossen' : isCurrent ? 'Aktuell' : 'Ausstehend'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legacy Company Info */}
              {selectedCompanyDetails.isLegacyCompany && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-800 mb-2">Legacy Unternehmen</h3>
                  <p className="text-sm text-amber-700">
                    Dieses Unternehmen wurde vor der Einführung des Onboarding-Prozesses registriert
                    und erhält automatisch Bestandsschutz.
                  </p>
                  <div className="mt-2">
                    <span className="font-medium">Registrierungsmethode:</span>{' '}
                    {selectedCompanyDetails.registrationMethod}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedCompanyDetails.adminNotes && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Admin Notizen</h3>
                  <div className="bg-gray-50 border rounded-lg p-3 text-sm">
                    {selectedCompanyDetails.adminNotes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedCompanyDetails.onboardingStatus === 'completed' && (
                <div className="flex space-x-3 pt-4 border-t">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleSingleApprove(selectedCompanyDetails.uid);
                      setShowDetailsModal(false);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Genehmigen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleSingleReject(selectedCompanyDetails.uid);
                      setShowDetailsModal(false);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Ablehnen
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
