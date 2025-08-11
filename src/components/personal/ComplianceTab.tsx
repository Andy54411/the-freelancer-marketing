'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, FileCheck, AlertTriangle, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Employee } from '@/services/personalService';

interface ComplianceTabProps {
  employee: Employee | null;
  isEditing: boolean;
  onUpdate: (updates: Partial<Employee>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

interface ComplianceDocument {
  type: string;
  status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  notes?: string;
}

interface WorkPermitDocument {
  type: 'WORK_PERMIT';
  status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  notes?: string;
}

interface HealthCertificateDocument {
  type: 'HEALTH_CERTIFICATE';
  status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  notes?: string;
}

interface CriminalRecordDocument {
  type: 'CRIMINAL_RECORD';
  status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  notes?: string;
}

interface DataProtectionDocument {
  type: 'DATA_PROTECTION';
  status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  notes?: string;
}

export default function ComplianceTab({
  employee,
  isEditing,
  onUpdate,
  onSave,
  onCancel,
  onEdit,
}: ComplianceTabProps) {
  const [workPermit, setWorkPermit] = useState<WorkPermitDocument>(
    employee?.compliance?.workPermit || {
      type: 'WORK_PERMIT',
      status: 'NOT_REQUIRED',
    }
  );

  const [healthCertificate, setHealthCertificate] = useState<HealthCertificateDocument>(
    employee?.compliance?.healthCertificate || {
      type: 'HEALTH_CERTIFICATE',
      status: 'NOT_REQUIRED',
    }
  );

  const [criminalRecord, setCriminalRecord] = useState<CriminalRecordDocument>(
    employee?.compliance?.criminalRecord || {
      type: 'CRIMINAL_RECORD',
      status: 'NOT_REQUIRED',
    }
  );

  const [dataProtection, setDataProtection] = useState<DataProtectionDocument>(
    employee?.compliance?.dataProtection || {
      type: 'DATA_PROTECTION',
      status: 'PENDING',
    }
  );

  const [companyAgreements, setCompanyAgreements] = useState<string[]>(
    employee?.compliance?.companyAgreements || []
  );

  const [safetyTrainings, setSafetyTrainings] = useState<
    {
      name: string;
      completedDate: string;
      validUntil?: string;
      trainer: string;
    }[]
  >(employee?.compliance?.safetyTrainings || []);

  const updateDocument = (
    doc: ComplianceDocument,
    field: keyof ComplianceDocument,
    value: string
  ) => {
    const updated = { ...doc, [field]: value };

    switch (doc.type) {
      case 'WORK_PERMIT':
        setWorkPermit(updated as WorkPermitDocument);
        break;
      case 'HEALTH_CERTIFICATE':
        setHealthCertificate(updated as HealthCertificateDocument);
        break;
      case 'CRIMINAL_RECORD':
        setCriminalRecord(updated as CriminalRecordDocument);
        break;
      case 'DATA_PROTECTION':
        setDataProtection(updated as DataProtectionDocument);
        break;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VALID':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'EXPIRED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PENDING':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileCheck className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysDiff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 30 && daysDiff > 0;
  };

  const addSafetyTraining = () => {
    setSafetyTrainings([
      ...safetyTrainings,
      {
        name: '',
        completedDate: '',
        validUntil: '',
        trainer: '',
      },
    ]);
  };

  const updateSafetyTraining = (index: number, field: string, value: string) => {
    const updated = [...safetyTrainings];
    updated[index] = { ...updated[index], [field]: value };
    setSafetyTrainings(updated);
  };

  const removeSafetyTraining = (index: number) => {
    setSafetyTrainings(safetyTrainings.filter((_, i) => i !== index));
  };

  const addCompanyAgreement = () => {
    setCompanyAgreements([...companyAgreements, '']);
  };

  const updateCompanyAgreement = (index: number, value: string) => {
    const updated = [...companyAgreements];
    updated[index] = value;
    setCompanyAgreements(updated);
  };

  const removeCompanyAgreement = (index: number) => {
    setCompanyAgreements(companyAgreements.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onUpdate({
      compliance: {
        workPermit,
        healthCertificate,
        criminalRecord,
        dataProtection,
        companyAgreements,
        safetyTrainings,
      },
    });
    onSave();
  };

  const renderComplianceDocument = (
    doc: ComplianceDocument,
    title: string,
    description: string
  ) => (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(doc.status)}
            <span>{title}</span>
          </div>
          <Badge className={getStatusColor(doc.status)}>
            {doc.status === 'VALID'
              ? 'Gültig'
              : doc.status === 'EXPIRED'
                ? 'Abgelaufen'
                : doc.status === 'PENDING'
                  ? 'Ausstehend'
                  : 'Nicht erforderlich'}
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <Select
              value={doc.status}
              onValueChange={value => updateDocument(doc, 'status', value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VALID">Gültig</SelectItem>
                <SelectItem value="EXPIRED">Abgelaufen</SelectItem>
                <SelectItem value="PENDING">Ausstehend</SelectItem>
                <SelectItem value="NOT_REQUIRED">Nicht erforderlich</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dokumentennummer</Label>
            <Input
              value={doc.documentNumber || ''}
              onChange={e => updateDocument(doc, 'documentNumber', e.target.value)}
              disabled={!isEditing}
              placeholder="Eindeutige Nummer"
            />
          </div>
          <div>
            <Label>Ausstellungsdatum</Label>
            <Input
              type="date"
              value={doc.issueDate || ''}
              onChange={e => updateDocument(doc, 'issueDate', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label>Ablaufdatum</Label>
            <div className="relative">
              <Input
                type="date"
                value={doc.expiryDate || ''}
                onChange={e => updateDocument(doc, 'expiryDate', e.target.value)}
                disabled={!isEditing}
                className={isExpiringSoon(doc.expiryDate) ? 'border-yellow-400' : ''}
              />
              {isExpiringSoon(doc.expiryDate) && (
                <div className="absolute -top-2 -right-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Ausstellende Behörde</Label>
            <Input
              value={doc.issuingAuthority || ''}
              onChange={e => updateDocument(doc, 'issuingAuthority', e.target.value)}
              disabled={!isEditing}
              placeholder="z.B. Ausländerbehörde, Gesundheitsamt"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notizen</Label>
            <Textarea
              value={doc.notes || ''}
              onChange={e => updateDocument(doc, 'notes', e.target.value)}
              disabled={!isEditing}
              placeholder="Zusätzliche Informationen"
              rows={2}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!employee) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-gray-500">Mitarbeiter nicht gefunden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#14ad9f]" />
            Compliance & Rechtliche Dokumente
          </CardTitle>
          <p className="text-sm text-gray-600">
            Verwaltung aller rechtlich erforderlichen Dokumente und Nachweise
          </p>
        </CardHeader>
      </Card>

      {/* Arbeitserlaubnis */}
      {renderComplianceDocument(
        workPermit,
        'Arbeitserlaubnis / Aufenthaltstitel',
        'Für ausländische Mitarbeiter erforderlich'
      )}

      {/* Gesundheitszeugnis */}
      {renderComplianceDocument(
        healthCertificate,
        'Gesundheitszeugnis',
        'Für Tätigkeiten im Lebensmittelbereich oder mit besonderen Hygieneanforderungen'
      )}

      {/* Führungszeugnis */}
      {renderComplianceDocument(
        criminalRecord,
        'Führungszeugnis',
        'Für Positionen mit besonderen Vertrauensanforderungen'
      )}

      {/* Datenschutzerklärung */}
      {renderComplianceDocument(
        dataProtection,
        'Datenschutzerklärung',
        'DSGVO-konforme Einverständniserklärung zur Datenverarbeitung'
      )}

      {/* Betriebsvereinbarungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-[#14ad9f]" />
            Betriebsvereinbarungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {companyAgreements.map((agreement, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={agreement}
                onChange={e => updateCompanyAgreement(index, e.target.value)}
                disabled={!isEditing}
                placeholder="Name der Betriebsvereinbarung"
                className="flex-1"
              />
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCompanyAgreement(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              onClick={addCompanyAgreement}
              className="w-full border-dashed"
            >
              Betriebsvereinbarung hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sicherheitsschulungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14ad9f]" />
            Sicherheitsschulungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {safetyTrainings.map((training, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label>Schulungsname</Label>
                    <Input
                      value={training.name}
                      onChange={e => updateSafetyTraining(index, 'name', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Brandschutz, Erste Hilfe, etc."
                    />
                  </div>
                  <div>
                    <Label>Trainer</Label>
                    <Input
                      value={training.trainer}
                      onChange={e => updateSafetyTraining(index, 'trainer', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Name des Trainers/der Institution"
                    />
                  </div>
                  <div>
                    <Label>Abschlussdatum</Label>
                    <Input
                      type="date"
                      value={training.completedDate}
                      onChange={e => updateSafetyTraining(index, 'completedDate', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label>Gültig bis (optional)</Label>
                    <Input
                      type="date"
                      value={training.validUntil || ''}
                      onChange={e => updateSafetyTraining(index, 'validUntil', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSafetyTraining(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isEditing && (
            <Button variant="outline" onClick={addSafetyTraining} className="w-full border-dashed">
              Sicherheitsschulung hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isEditing ? (
        <div className="flex gap-3">
          <Button onClick={handleSave} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            Speichern
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button onClick={onEdit} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
          Bearbeiten
        </Button>
      )}
    </div>
  );
}
