'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  DollarSign,
  Edit,
  Download,
  Upload,
  Plus,
  Eye,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  url?: string;
}

interface TimeOffRequest {
  id: string;
  type: 'vacation' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

interface PerformanceReview {
  id: string;
  date: string;
  rating: number;
  goals: string[];
  feedback: string;
  reviewer: string;
}

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ uid: string; employeeId: string }>;
}) {
  const { user } = useAuth();
  const resolvedParams = React.use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  // Mock data for digital personnel file
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Arbeitsvertrag.pdf',
      type: 'contract',
      uploadDate: '2025-01-15',
      size: '2.4 MB',
    },
    {
      id: '2',
      name: 'Lebenslauf.pdf',
      type: 'cv',
      uploadDate: '2025-01-15',
      size: '1.2 MB',
    },
    {
      id: '3',
      name: 'Zeugnisse.pdf',
      type: 'certificates',
      uploadDate: '2025-01-15',
      size: '3.1 MB',
    },
    {
      id: '4',
      name: 'Gesundheitszeugnis.pdf',
      type: 'health',
      uploadDate: '2025-02-01',
      size: '800 KB',
    },
  ]);

  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([
    {
      id: '1',
      type: 'vacation',
      startDate: '2025-08-20',
      endDate: '2025-08-30',
      days: 10,
      status: 'approved',
      reason: 'Sommerurlaub',
    },
    {
      id: '2',
      type: 'sick',
      startDate: '2025-07-15',
      endDate: '2025-07-16',
      days: 2,
      status: 'approved',
      reason: 'Erkältung',
    },
  ]);

  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([
    {
      id: '1',
      date: '2025-01-15',
      rating: 4,
      goals: ['Verbesserung der Kochkünste', 'Teamführung entwickeln'],
      feedback: 'Sehr gute Leistung, zeigt Initiative und Kreativität in der Küche.',
      reviewer: 'Chefkoch Schmidt',
    },
  ]);

  useEffect(() => {
    if (user && resolvedParams.uid && resolvedParams.employeeId) {
      loadEmployeeData();
    }
  }, [user, resolvedParams.uid, resolvedParams.employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const employeeData = await PersonalService.getEmployee(
        resolvedParams.uid,
        resolvedParams.employeeId
      );
      setEmployee(employeeData);
      setEditForm(employeeData);
    } catch (error) {

      toast.error('Fehler beim Laden der Mitarbeiterdaten');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!employee || !editForm) return;

    try {
      await PersonalService.updateEmployee(resolvedParams.uid, employee.id, editForm);
      setEmployee({ ...employee, ...editForm });
      setIsEditing(false);
      toast.success('Mitarbeiterdaten aktualisiert');
    } catch (error) {

      toast.error('Fehler beim Speichern der Daten');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'contract':
        return 'Arbeitsvertrag';
      case 'cv':
        return 'Lebenslauf';
      case 'certificates':
        return 'Zeugnisse';
      case 'health':
        return 'Gesundheitszeugnis';
      default:
        return 'Dokument';
    }
  };

  const getTimeOffTypeLabel = (type: string) => {
    switch (type) {
      case 'vacation':
        return 'Urlaub';
      case 'sick':
        return 'Krankenstand';
      case 'personal':
        return 'Persönlich';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Genehmigt';
      case 'pending':
        return 'Ausstehend';
      case 'rejected':
        return 'Abgelehnt';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Mitarbeiter nicht gefunden</h1>
          <p className="text-gray-600 mt-2">
            Der angeforderte Mitarbeiter konnte nicht geladen werden.
          </p>
          <Link
            href={`/dashboard/company/${resolvedParams.uid}/personal/employees`}
            className="inline-flex items-center gap-2 mt-4 text-[#14ad9f] hover:text-[#129488]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Mitarbeiterübersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/company/${resolvedParams.uid}/personal/employees`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Digitale Personalakte</h1>
            <p className="text-gray-600 mt-1">
              Vollständige Mitarbeiterinformationen und Dokumentenverwaltung
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm(employee);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </>
          ) : (
            <Link
              href={`/dashboard/company/${resolvedParams.uid}/personal/edit/${resolvedParams.employeeId}`}
            >
              <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Employee Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={employee.avatar}
                alt={`${employee.firstName} ${employee.lastName}`}
              />
              <AvatarFallback className="text-xl">
                {employee.firstName.charAt(0)}
                {employee.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {employee.firstName} {employee.lastName}
                  </h2>
                  <p className="text-lg text-gray-600">{employee.position}</p>
                  <Badge
                    className={
                      employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }
                  >
                    {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    {isEditing ? (
                      <Input
                        value={editForm.email || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="E-Mail"
                      />
                    ) : (
                      <span>{employee.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    {isEditing ? (
                      <Input
                        value={editForm.phone || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Telefon"
                      />
                    ) : (
                      <span>{employee.phone || 'Nicht angegeben'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building className="h-4 w-4" />
                    {isEditing ? (
                      <Input
                        value={editForm.department || ''}
                        onChange={e =>
                          setEditForm(prev => ({ ...prev, department: e.target.value }))
                        }
                        placeholder="Abteilung"
                      />
                    ) : (
                      <span>{employee.department}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mitarbeiter-ID</label>
                    <p className="text-sm text-gray-600 font-mono">{employee.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Einstellungsdatum</label>
                    <p className="text-sm text-gray-600">
                      {employee.startDate
                        ? new Date(employee.startDate).toLocaleDateString('de-DE')
                        : 'Nicht angegeben'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stundenlohn</label>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.hourlyRate || ''}
                          onChange={e =>
                            setEditForm(prev => ({
                              ...prev,
                              hourlyRate: parseFloat(e.target.value),
                            }))
                          }
                          placeholder="0.00"
                          className="w-20"
                        />
                      ) : (
                        <span className="text-sm text-gray-600">
                          {employee.hourlyRate?.toFixed(2) || '0.00'}€
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Arbeitstyp</label>
                    {isEditing ? (
                      <select
                        value={editForm.employmentType || ''}
                        onChange={e =>
                          setEditForm(prev => ({
                            ...prev,
                            employmentType: e.target.value as
                              | 'FULL_TIME'
                              | 'PART_TIME'
                              | 'FREELANCER'
                              | 'INTERN',
                          }))
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="FULL_TIME">Vollzeit</option>
                        <option value="PART_TIME">Teilzeit</option>
                        <option value="FREELANCER">Freiberufler</option>
                        <option value="INTERN">Praktikant</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-600">
                        {employee.employmentType === 'FULL_TIME'
                          ? 'Vollzeit'
                          : employee.employmentType === 'PART_TIME'
                            ? 'Teilzeit'
                            : employee.employmentType === 'FREELANCER'
                              ? 'Freiberufler'
                              : employee.employmentType === 'INTERN'
                                ? 'Praktikant'
                                : 'Nicht angegeben'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">Dokumente</TabsTrigger>
          <TabsTrigger value="timeoff">Abwesenheiten</TabsTrigger>
          <TabsTrigger value="performance">Bewertungen</TabsTrigger>
          <TabsTrigger value="schedule">Dienstplan</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Dokumente
                  </CardTitle>
                  <CardDescription>
                    Verwalten Sie alle wichtigen Mitarbeiterdokumente
                  </CardDescription>
                </div>
                <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                  <Upload className="h-4 w-4 mr-2" />
                  Dokument hochladen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                  <Card
                    key={doc.id}
                    className="border-2 border-gray-200 hover:border-[#14ad9f] transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                          <p className="text-sm text-gray-600">{getDocumentTypeLabel(doc.type)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Hochgeladen: {new Date(doc.uploadDate).toLocaleDateString('de-DE')}</p>
                        <p>Größe: {doc.size}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Abwesenheiten
                  </CardTitle>
                  <CardDescription>
                    Übersicht über Urlaub, Krankenstand und andere Abwesenheiten
                  </CardDescription>
                </div>
                <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Abwesenheit hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeOffRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                        <span className="font-medium">{getTimeOffTypeLabel(request.type)}</span>
                        <span className="text-sm text-gray-600">
                          {request.days} {request.days === 1 ? 'Tag' : 'Tage'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(request.startDate).toLocaleDateString('de-DE')} -{' '}
                        {new Date(request.endDate).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    {request.reason && (
                      <p className="text-sm text-gray-600 mt-2">{request.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Leistungsbewertungen
                  </CardTitle>
                  <CardDescription>Mitarbeiterbeurteilungen und Entwicklungsziele</CardDescription>
                </div>
                <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Bewertung hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {performanceReviews.map(review => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Bewertung vom {new Date(review.date).toLocaleDateString('de-DE')}
                        </h4>
                        <p className="text-sm text-gray-600">Bewertet von: {review.reviewer}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <div
                            key={star}
                            className={`h-5 w-5 ${
                              star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ⭐
                          </div>
                        ))}
                        <span className="ml-2 font-medium">{review.rating}/5</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Ziele</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {review.goals.map((goal, index) => (
                            <li key={index} className="text-sm text-gray-600">
                              {goal}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Feedback</h5>
                        <p className="text-sm text-gray-600">{review.feedback}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Dienstplan-Übersicht
              </CardTitle>
              <CardDescription>
                Aktuelle und vergangene Schichten dieses Mitarbeiters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Dienstplan-Integration</h3>
                <p className="text-gray-600 mb-4">
                  Die Dienstplan-Übersicht für diesen Mitarbeiter wird hier angezeigt.
                </p>
                <Link
                  href={`/dashboard/company/${resolvedParams.uid}/personal/schedule`}
                  className="inline-flex items-center gap-2 bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2 rounded-lg"
                >
                  <Calendar className="h-4 w-4" />
                  Zum Dienstplan
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
