'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Briefcase, Calendar, AlertCircle, Check, FileText, Shield, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApplicantData {
  // Persönliche Daten
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  salutation?: string;
  // Adresse
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  // Beschäftigung
  position?: string;
  department?: string;
  startDate?: string;
  grossSalary?: number;
  employmentType?: string;
  workingHoursWeekly?: number;
  workingHoursDaily?: number;
  // Versicherung & Steuern
  socialSecurityNumber?: string;
  taxId?: string;
  healthInsuranceProvider?: string;
  healthInsuranceMemberNumber?: string;
  // Bankdaten
  bankAccountIban?: string;
  bankAccountBic?: string;
  bankAccountName?: string;
  // Qualifikationen
  education?: Array<{
    degree?: string;
    institution?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    certificateUrl?: string;
    fileName?: string;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    certificateUrl?: string;
    fileName?: string;
  }>;
  languages?: Array<{
    language?: string;
    level?: string;
  }>;
  skills?: string[];
  qualifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    certificateUrl?: string;
    fileName?: string;
  }>;
  // Dokumente
  documents?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  // Notizen
  notes?: string;
  // Avatar
  avatar?: string;
}

interface EmployeeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employeeData: ApplicantData) => Promise<void>;
  applicationData: any;
  jobTitle?: string;
}

export default function EmployeeCreationModal({
  isOpen,
  onClose,
  onConfirm,
  applicationData,
  jobTitle,
}: EmployeeCreationModalProps) {
  const [formData, setFormData] = useState<ApplicantData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (applicationData) {
      const profile = applicationData.applicantProfile || {};
      const personalData = applicationData.personalData || {};

      // Dokumente aus Bewerbung extrahieren
      const documents: Array<{ name: string; url: string; type: string }> = [];
      
      // CV
      if (profile.cvUrl) {
        documents.push({
          name: profile.cvName || 'Lebenslauf.pdf',
          url: profile.cvUrl,
          type: 'Lebenslauf',
        });
      }
      
      // Anschreiben
      if (profile.coverLetterUrl) {
        documents.push({
          name: profile.coverLetterName || 'Anschreiben.pdf',
          url: profile.coverLetterUrl,
          type: 'Anschreiben',
        });
      }
      
      // Attachments aus der Bewerbung
      if (applicationData.attachments && Array.isArray(applicationData.attachments)) {
        applicationData.attachments.forEach((att: any) => {
          if (!documents.find(d => d.url === att.url)) {
            documents.push({
              name: att.name || 'Dokument',
              url: att.url,
              type: att.type || 'Sonstiges',
            });
          }
        });
      }

      // Zertifikate aus Bildung
      if (profile.education && Array.isArray(profile.education)) {
        profile.education.forEach((edu: any) => {
          if (edu.certificateUrl) {
            documents.push({
              name: edu.fileName || `Zeugnis - ${edu.degree || 'Ausbildung'}`,
              url: edu.certificateUrl,
              type: 'Zeugnis',
            });
          }
        });
      }

      // Zertifikate aus Berufserfahrung
      if (profile.experience && Array.isArray(profile.experience)) {
        profile.experience.forEach((exp: any) => {
          if (exp.certificateUrl) {
            documents.push({
              name: exp.fileName || `Arbeitszeugnis - ${exp.company || 'Firma'}`,
              url: exp.certificateUrl,
              type: 'Arbeitszeugnis',
            });
          }
        });
      }

      // Qualifikationen/Zertifikate
      if (profile.qualifications && Array.isArray(profile.qualifications)) {
        profile.qualifications.forEach((qual: any) => {
          if (qual.certificateUrl) {
            documents.push({
              name: qual.fileName || `Zertifikat - ${qual.name || 'Qualifikation'}`,
              url: qual.certificateUrl,
              type: 'Zertifikat',
            });
          }
        });
      }

      // Gehaltserwartung parsen
      let grossSalary = 0;
      if (profile.salaryExpectation?.amount) {
        grossSalary = profile.salaryExpectation.amount;
      }

      setFormData({
        // Persönliche Daten
        firstName: profile.firstName || personalData.firstName || '',
        lastName: profile.lastName || personalData.lastName || '',
        email: profile.email || personalData.email || applicationData.applicantEmail || '',
        phone: profile.phone || personalData.phone || '',
        dateOfBirth: profile.birthDate || personalData.birthDate || '',
        nationality: profile.nationality || personalData.nationality || '',
        salutation: profile.salutation || personalData.salutation || '',
        
        // Adresse - Direkt aus den Feldern statt aus verschachteltem address-Objekt
        street: profile.street || personalData.street || '',
        city: profile.city || personalData.city || '',
        postalCode: profile.zip || personalData.zip || '',
        country: profile.country || personalData.country || 'Deutschland',
        
        // Beschäftigung
        position: jobTitle || applicationData.jobTitle || profile.desiredPosition || '',
        department: '',
        startDate: new Date().toISOString().split('T')[0],
        grossSalary: grossSalary,
        employmentType: mapEmploymentType(profile.employmentTypes?.[0]),
        workingHoursWeekly: 40,
        workingHoursDaily: 8,
        
        // Qualifikationen
        education: profile.education || [],
        experience: profile.experience || [],
        languages: profile.languages || [],
        skills: profile.skills || [],
        qualifications: profile.qualifications || [],
        
        // Dokumente
        documents: documents,
        
        // Avatar
        avatar: profile.profilePictureUrl || '',
        
        // Notizen
        notes: `Eingestellt über Recruiting am ${new Date().toLocaleDateString('de-DE')}.
Bewerbungs-ID: ${applicationData.id || 'unbekannt'}
${applicationData.message ? `\nNachricht des Bewerbers:\n${applicationData.message}` : ''}`,
      });
    }
  }, [applicationData, jobTitle]);

  const mapEmploymentType = (type?: string): string => {
    if (!type) return 'FULL_TIME';
    const typeMap: Record<string, string> = {
      'Vollzeit': 'FULL_TIME',
      'Teilzeit': 'PART_TIME',
      'Minijob': 'PART_TIME',
      'Werkstudent': 'PART_TIME',
      'Praktikum': 'INTERN',
      'Freelancer': 'FREELANCER',
    };
    return typeMap[type] || 'FULL_TIME';
  };

  const handleChange = (field: keyof ApplicantData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) newErrors.firstName = 'Vorname ist erforderlich';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Nachname ist erforderlich';
    if (!formData.email?.trim()) newErrors.email = 'E-Mail ist erforderlich';
    if (!formData.position?.trim()) newErrors.position = 'Position ist erforderlich';
    if (!formData.department?.trim()) newErrors.department = 'Abteilung ist erforderlich';
    if (!formData.startDate?.trim()) newErrors.startDate = 'Startdatum ist erforderlich';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Zum ersten Tab mit Fehler wechseln
      if (errors.firstName || errors.lastName || errors.email) {
        setActiveTab('personal');
      } else if (errors.position || errors.department || errors.startDate) {
        setActiveTab('employment');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const missingFields: string[] = [];
  if (!formData.firstName) missingFields.push('Vorname');
  if (!formData.lastName) missingFields.push('Nachname');
  if (!formData.email) missingFields.push('E-Mail');
  if (!formData.department) missingFields.push('Abteilung');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {formData.avatar && (
              <img 
                src={formData.avatar} 
                alt="Profilbild" 
                className="w-12 h-12 rounded-full object-cover border-2 border-white"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold">Mitarbeiter anlegen</h2>
              <p className="text-teal-100 text-sm mt-0.5">
                {formData.firstName} {formData.lastName} - {formData.position || 'Position auswählen'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-teal-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        {missingFields.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3 shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium text-sm">
                Bitte ergänzen Sie die fehlenden Pflichtfelder:
              </p>
              <p className="text-amber-700 text-sm">
                {missingFields.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-5 mx-6 mt-4 shrink-0">
            <TabsTrigger value="personal" className="text-xs sm:text-sm">
              <User className="w-4 h-4 mr-1 hidden sm:inline" />
              Persönlich
            </TabsTrigger>
            <TabsTrigger value="employment" className="text-xs sm:text-sm">
              <Briefcase className="w-4 h-4 mr-1 hidden sm:inline" />
              Beschäftigung
            </TabsTrigger>
            <TabsTrigger value="qualifications" className="text-xs sm:text-sm">
              <Building2 className="w-4 h-4 mr-1 hidden sm:inline" />
              Qualifikation
            </TabsTrigger>
            <TabsTrigger value="insurance" className="text-xs sm:text-sm">
              <Shield className="w-4 h-4 mr-1 hidden sm:inline" />
              Versicherung
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">
              <FileText className="w-4 h-4 mr-1 hidden sm:inline" />
              Dokumente
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {/* Tab 1: Persönliche Daten */}
            <TabsContent value="personal" className="mt-0 space-y-6 data-[state=active]:block">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anrede
                    </label>
                    <select
                      value={formData.salutation || ''}
                      onChange={(e) => handleChange('salutation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Bitte wählen</option>
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                      <option value="Divers">Divers</option>
                    </select>
                  </div>
                  <div></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vorname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nachname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-Mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Geburtsdatum
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staatsangehörigkeit
                    </label>
                    <input
                      type="text"
                      value={formData.nationality || ''}
                      onChange={(e) => handleChange('nationality', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="z.B. Deutsch"
                    />
                  </div>
                </div>

                {/* Adresse */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    Adresse
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Straße & Hausnummer
                      </label>
                      <input
                        type="text"
                        value={formData.street || ''}
                        onChange={(e) => handleChange('street', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PLZ
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode || ''}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stadt
                      </label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Land
                      </label>
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

            {/* Tab 2: Beschäftigung */}
            <TabsContent value="employment" className="mt-0 space-y-6 data-[state=active]:block">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.position || ''}
                      onChange={(e) => handleChange('position', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.position ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Abteilung <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => handleChange('department', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.department ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="z.B. Küche, IT, Vertrieb"
                    />
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Startdatum <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => handleChange('startDate', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.startDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beschäftigungsart
                    </label>
                    <select
                      value={formData.employmentType || 'FULL_TIME'}
                      onChange={(e) => handleChange('employmentType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="FULL_TIME">Vollzeit</option>
                      <option value="PART_TIME">Teilzeit</option>
                      <option value="INTERN">Praktikant</option>
                      <option value="FREELANCER">Freelancer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bruttogehalt (EUR/Monat)
                    </label>
                    <input
                      type="number"
                      value={formData.grossSalary || ''}
                      onChange={(e) => handleChange('grossSalary', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="3500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wochenstunden
                    </label>
                    <input
                      type="number"
                      value={formData.workingHoursWeekly || 40}
                      onChange={(e) => handleChange('workingHoursWeekly', parseInt(e.target.value) || 40)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      min="0"
                      max="60"
                    />
                  </div>
                </div>

                {/* Notizen */}
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notizen
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Interne Notizen zum Mitarbeiter..."
                  />
                </div>
              </TabsContent>

            {/* Tab 3: Qualifikationen */}
            <TabsContent value="qualifications" className="mt-0 space-y-6 data-[state=active]:block">
                {/* Ausbildung */}
                {formData.education && formData.education.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Ausbildung</h4>
                    <div className="space-y-3">
                      {formData.education.map((edu, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                          <div className="font-medium">{edu.degree || 'Abschluss'}</div>
                          <div className="text-sm text-gray-600">{edu.institution} {edu.location && `- ${edu.location}`}</div>
                          <div className="text-xs text-gray-500">
                            {edu.startDate} - {edu.endDate || 'heute'}
                          </div>
                          {edu.certificateUrl && (
                            <a href={edu.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline">
                              Zeugnis ansehen
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Berufserfahrung */}
                {formData.experience && formData.experience.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Berufserfahrung</h4>
                    <div className="space-y-3">
                      {formData.experience.map((exp, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-sm text-gray-600">{exp.company} {exp.location && `- ${exp.location}`}</div>
                          <div className="text-xs text-gray-500">
                            {exp.startDate} - {exp.endDate || 'heute'}
                          </div>
                          {exp.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{exp.description}</p>
                          )}
                          {exp.certificateUrl && (
                            <a href={exp.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline">
                              Arbeitszeugnis ansehen
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sprachen */}
                {formData.languages && formData.languages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Sprachen</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.languages.map((lang, idx) => (
                        <span key={idx} className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">
                          {lang.language} ({lang.level})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {formData.skills && formData.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Fähigkeiten</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, idx) => (
                        <span key={idx} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualifikationen/Zertifikate */}
                {formData.qualifications && formData.qualifications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Zertifikate & Qualifikationen</h4>
                    <div className="space-y-2">
                      {formData.qualifications.map((qual, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                          <div>
                            <div className="font-medium">{qual.name}</div>
                            {qual.issuer && <div className="text-sm text-gray-600">{qual.issuer}</div>}
                          </div>
                          {qual.certificateUrl && (
                            <a href={qual.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline text-sm">
                              Ansehen
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!formData.education?.length && !formData.experience?.length && !formData.languages?.length && !formData.skills?.length && !formData.qualifications?.length) && (
                  <div className="text-center py-8 text-gray-500">
                    Keine Qualifikationen in der Bewerbung hinterlegt
                  </div>
                )}
              </TabsContent>

            {/* Tab 4: Versicherung & Steuern */}
            <TabsContent value="insurance" className="mt-0 space-y-6 data-[state=active]:block">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sozialversicherungsnummer
                    </label>
                    <input
                      type="text"
                      value={formData.socialSecurityNumber || ''}
                      onChange={(e) => handleChange('socialSecurityNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="12 345678 A 123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Steuerliche ID
                    </label>
                    <input
                      type="text"
                      value={formData.taxId || ''}
                      onChange={(e) => handleChange('taxId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="12345678901"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Krankenkasse
                    </label>
                    <input
                      type="text"
                      value={formData.healthInsuranceProvider || ''}
                      onChange={(e) => handleChange('healthInsuranceProvider', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="z.B. AOK, TK, Barmer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Versichertennummer
                    </label>
                    <input
                      type="text"
                      value={formData.healthInsuranceMemberNumber || ''}
                      onChange={(e) => handleChange('healthInsuranceMemberNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Bankdaten */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Bankverbindung</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountIban || ''}
                        onChange={(e) => handleChange('bankAccountIban', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="DE89 3704 0044 0532 0130 00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        BIC
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountBic || ''}
                        onChange={(e) => handleChange('bankAccountBic', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="DEUTDEFFXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bankname
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountName || ''}
                        onChange={(e) => handleChange('bankAccountName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="z.B. Deutsche Bank"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

            {/* Tab 5: Dokumente */}
            <TabsContent value="documents" className="mt-0 space-y-4 data-[state=active]:block">
                {formData.documents && formData.documents.length > 0 ? (
                  <div className="space-y-3">
                    {formData.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-teal-600" />
                          <div>
                            <div className="font-medium text-sm">{doc.name}</div>
                            <div className="text-xs text-gray-500">{doc.type}</div>
                          </div>
                        </div>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          Öffnen
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Keine Dokumente in der Bewerbung hinterlegt
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">
                  Diese Dokumente werden automatisch in die Mitarbeiterakte übernommen.
                </p>
              </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird angelegt...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Mitarbeiter anlegen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
