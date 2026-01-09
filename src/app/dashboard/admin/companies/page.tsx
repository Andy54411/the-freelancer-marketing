// Admin Unternehmen-Verwaltung
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Plus, Edit, Trash2, Mail, Phone, Globe, Eye } from 'lucide-react';

interface Company {
  id: string;
  email: string;
  name: string;
  type: string;
  companyName?: string;
  industry?: string;
  website?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteConfirm(true);
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    setDeletingId(companyToDelete.id);
    try {
      const response = await fetch(`/api/admin/companies/${companyToDelete.id}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert(`Unternehmen "${companyToDelete.companyName || companyToDelete.name}" wurde erfolgreich gelöscht.`);
        setShowDeleteConfirm(false);
        setCompanyToDelete(null);
        await loadCompanies(); // Liste neu laden
      } else {
        const data = await response.json();
        alert(`Fehler beim Löschen: ${data.error || 'Unbekannter Fehler'}`);
      }
    } catch {
      alert('Fehler beim Löschen des Unternehmens');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCompanies = companies.filter(
    company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.companyName && company.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktiv</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inaktiv</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Gesperrt</Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unternehmen-Verwaltung</h1>
          <p className="text-gray-600">Verwalte alle registrierten Unternehmen</p>
        </div>
        <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
          <Plus className="h-4 w-4 mr-2" />
          Neues Unternehmen
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Unternehmen suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamt</p>
                <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-[#14ad9f]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktive</p>
                <p className="text-2xl font-bold text-green-600">
                  {companies.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mit Website</p>
                <p className="text-2xl font-bold text-blue-600">
                  {companies.filter(c => c.website).length}
                </p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Neue (30T)</p>
                <p className="text-2xl font-bold text-purple-600">
                  {
                    companies.filter(c => {
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return new Date(c.createdAt) > thirtyDaysAgo;
                    }).length
                  }
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Unternehmen ({filteredCompanies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length > 0 ? (
            <div className="space-y-4">
              {filteredCompanies.map(company => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#14ad9f] rounded-lg flex items-center justify-center text-white font-semibold">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {company.companyName || company.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                        <span className="font-mono">UID: {company.id}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span>{company.email}</span>
                        {company.phone && (
                          <>
                            <span>•</span>
                            <Phone className="h-3 w-3" />
                            <span>{company.phone}</span>
                          </>
                        )}
                      </div>
                      {company.industry && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>Branche: {company.industry}</span>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <Globe className="h-3 w-3" />
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(company.status)}

                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/companies/${company.id}`)}
                        className="bg-[#14ad9f] hover:bg-taskilo-hover text-white border-[#14ad9f]"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(company)}
                        disabled={deletingId === company.id}
                      >
                        {deletingId === company.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Keine Unternehmen gefunden' : 'Keine Unternehmen verfügbar'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && companyToDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unternehmen löschen
            </h3>
            <p className="text-gray-600 mb-1">
              Möchten Sie <strong>{companyToDelete.companyName || companyToDelete.name}</strong> wirklich dauerhaft löschen?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              UID: <span className="font-mono">{companyToDelete.id}</span>
            </p>
            <p className="text-sm text-red-600 mb-4">
              ⚠️ Diese Aktion kann nicht rückgängig gemacht werden und löscht alle zugehörigen Daten (Kunden, Aufträge, Angebote, Rechnungen, etc.).
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCompanyToDelete(null);
                }}
                disabled={deletingId !== null}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteCompany}
                disabled={deletingId !== null}
              >
                {deletingId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Wird gelöscht...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Endgültig löschen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
