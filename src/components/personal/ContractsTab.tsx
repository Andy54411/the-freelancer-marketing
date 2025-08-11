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
import { FileText, Plus, X, Download, Upload, Calendar, CheckCircle } from 'lucide-react';
import { Employee } from '@/services/personalService';

interface ContractsTabProps {
  employee: Employee | null;
  isEditing: boolean;
  onUpdate: (updates: Partial<Employee>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

interface Contract {
  id: string;
  type:
    | 'EMPLOYMENT'
    | 'AMENDMENT'
    | 'NON_DISCLOSURE'
    | 'NON_COMPETE'
    | 'BONUS'
    | 'COMMISSION'
    | 'OTHER';
  title: string;
  description?: string;
  signedDate: string;
  effectiveDate: string;
  expiryDate?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';
  version: string;
  documentUrl?: string;
  signedBy: string[];
  terms?: {
    key: string;
    value: string;
  }[];
  renewalTerms?: string;
  terminationClause?: string;
}

interface Amendment {
  id: string;
  contractId: string;
  date: string;
  description: string;
  changedFields: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  reason: string;
  authorizedBy: string;
}

export default function ContractsTab({
  employee,
  isEditing,
  onUpdate,
  onSave,
  onCancel,
  onEdit,
}: ContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>(employee?.contracts?.contracts || []);

  const [amendments, setAmendments] = useState<Amendment[]>(employee?.contracts?.amendments || []);

  // Contract Management
  const addContract = () => {
    const newContract: Contract = {
      id: Date.now().toString(),
      type: 'EMPLOYMENT',
      title: '',
      signedDate: '',
      effectiveDate: '',
      status: 'PENDING',
      version: '1.0',
      signedBy: [],
    };
    setContracts([...contracts, newContract]);
  };

  const updateContract = (id: string, field: keyof Contract, value: any) => {
    setContracts(
      contracts.map(contract => (contract.id === id ? { ...contract, [field]: value } : contract))
    );
  };

  const removeContract = (id: string) => {
    setContracts(contracts.filter(contract => contract.id !== id));
    // Auch zugehörige Amendments entfernen
    setAmendments(amendments.filter(amendment => amendment.contractId !== id));
  };

  // Amendment Management
  const addAmendment = (contractId: string) => {
    const newAmendment: Amendment = {
      id: Date.now().toString(),
      contractId,
      date: new Date().toISOString().split('T')[0],
      description: '',
      changedFields: [],
      reason: '',
      authorizedBy: '',
    };
    setAmendments([...amendments, newAmendment]);
  };

  const updateAmendment = (id: string, field: keyof Amendment, value: any) => {
    setAmendments(
      amendments.map(amendment =>
        amendment.id === id ? { ...amendment, [field]: value } : amendment
      )
    );
  };

  const removeAmendment = (id: string) => {
    setAmendments(amendments.filter(amendment => amendment.id !== id));
  };

  // Contract Terms Management
  const addContractTerm = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      const terms = contract.terms || [];
      updateContract(contractId, 'terms', [...terms, { key: '', value: '' }]);
    }
  };

  const updateContractTerm = (
    contractId: string,
    termIndex: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      const terms = [...(contract.terms || [])];
      terms[termIndex] = { ...terms[termIndex], [field]: value };
      updateContract(contractId, 'terms', terms);
    }
  };

  const removeContractTerm = (contractId: string, termIndex: number) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      const terms = (contract.terms || []).filter((_, index) => index !== termIndex);
      updateContract(contractId, 'terms', terms);
    }
  };

  // Signatory Management
  const addSignatory = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      updateContract(contractId, 'signedBy', [...contract.signedBy, '']);
    }
  };

  const updateSignatory = (contractId: string, signatoryIndex: number, value: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      const signedBy = [...contract.signedBy];
      signedBy[signatoryIndex] = value;
      updateContract(contractId, 'signedBy', signedBy);
    }
  };

  const removeSignatory = (contractId: string, signatoryIndex: number) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      const signedBy = contract.signedBy.filter((_, index) => index !== signatoryIndex);
      updateContract(contractId, 'signedBy', signedBy);
    }
  };

  // Changed Fields Management for Amendments
  const addChangedField = (amendmentId: string) => {
    const amendment = amendments.find(a => a.id === amendmentId);
    if (amendment) {
      const changedFields = [...amendment.changedFields, { field: '', oldValue: '', newValue: '' }];
      updateAmendment(amendmentId, 'changedFields', changedFields);
    }
  };

  const updateChangedField = (
    amendmentId: string,
    fieldIndex: number,
    key: 'field' | 'oldValue' | 'newValue',
    value: string
  ) => {
    const amendment = amendments.find(a => a.id === amendmentId);
    if (amendment) {
      const changedFields = [...amendment.changedFields];
      changedFields[fieldIndex] = { ...changedFields[fieldIndex], [key]: value };
      updateAmendment(amendmentId, 'changedFields', changedFields);
    }
  };

  const removeChangedField = (amendmentId: string, fieldIndex: number) => {
    const amendment = amendments.find(a => a.id === amendmentId);
    if (amendment) {
      const changedFields = amendment.changedFields.filter((_, index) => index !== fieldIndex);
      updateAmendment(amendmentId, 'changedFields', changedFields);
    }
  };

  const handleSave = () => {
    onUpdate({
      contracts: {
        contracts,
        amendments,
      },
    });
    onSave();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'TERMINATED':
        return 'bg-gray-100 text-gray-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'EMPLOYMENT':
        return 'Arbeitsvertrag';
      case 'AMENDMENT':
        return 'Nachtrag';
      case 'NON_DISCLOSURE':
        return 'Verschwiegenheitserklärung';
      case 'NON_COMPETE':
        return 'Wettbewerbsverbot';
      case 'BONUS':
        return 'Bonusvereinbarung';
      case 'COMMISSION':
        return 'Provisionsvereinbarung';
      case 'OTHER':
        return 'Sonstige Vereinbarung';
      default:
        return type;
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysDiff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 30 && daysDiff > 0;
  };

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
            <FileText className="h-5 w-5 text-[#14ad9f]" />
            Verträge & Vereinbarungen
          </CardTitle>
          <p className="text-sm text-gray-600">
            Verwaltung aller arbeitsrechtlichen Verträge und Zusatzvereinbarungen
          </p>
        </CardHeader>
      </Card>

      {/* Verträge */}
      <Card>
        <CardHeader>
          <CardTitle>Verträge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {contracts.map(contract => (
            <div key={contract.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(contract.status)}>
                    {contract.status === 'ACTIVE'
                      ? 'Aktiv'
                      : contract.status === 'EXPIRED'
                        ? 'Abgelaufen'
                        : contract.status === 'TERMINATED'
                          ? 'Beendet'
                          : 'Ausstehend'}
                  </Badge>
                  <Badge variant="outline">{getContractTypeLabel(contract.type)}</Badge>
                  <Badge variant="outline">v{contract.version}</Badge>
                  {isExpiringSoon(contract.expiryDate) && (
                    <Badge className="bg-yellow-100 text-yellow-800">Läuft bald ab</Badge>
                  )}
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContract(contract.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Vertragstyp</Label>
                  <Select
                    value={contract.type}
                    onValueChange={value => updateContract(contract.id, 'type', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYMENT">Arbeitsvertrag</SelectItem>
                      <SelectItem value="AMENDMENT">Nachtrag</SelectItem>
                      <SelectItem value="NON_DISCLOSURE">Verschwiegenheitserklärung</SelectItem>
                      <SelectItem value="NON_COMPETE">Wettbewerbsverbot</SelectItem>
                      <SelectItem value="BONUS">Bonusvereinbarung</SelectItem>
                      <SelectItem value="COMMISSION">Provisionsvereinbarung</SelectItem>
                      <SelectItem value="OTHER">Sonstige Vereinbarung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={contract.status}
                    onValueChange={value => updateContract(contract.id, 'status', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktiv</SelectItem>
                      <SelectItem value="EXPIRED">Abgelaufen</SelectItem>
                      <SelectItem value="TERMINATED">Beendet</SelectItem>
                      <SelectItem value="PENDING">Ausstehend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Titel</Label>
                  <Input
                    value={contract.title}
                    onChange={e => updateContract(contract.id, 'title', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Titel des Vertrags"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={contract.description || ''}
                    onChange={e => updateContract(contract.id, 'description', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Kurze Beschreibung des Vertrags"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Unterzeichnungsdatum</Label>
                  <Input
                    type="date"
                    value={contract.signedDate}
                    onChange={e => updateContract(contract.id, 'signedDate', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Gültig ab</Label>
                  <Input
                    type="date"
                    value={contract.effectiveDate}
                    onChange={e => updateContract(contract.id, 'effectiveDate', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Ablaufdatum (optional)</Label>
                  <Input
                    type="date"
                    value={contract.expiryDate || ''}
                    onChange={e => updateContract(contract.id, 'expiryDate', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input
                    value={contract.version}
                    onChange={e => updateContract(contract.id, 'version', e.target.value)}
                    disabled={!isEditing}
                    placeholder="1.0"
                  />
                </div>

                {/* Unterzeichner */}
                <div className="md:col-span-2">
                  <Label>Unterzeichner</Label>
                  <div className="space-y-2">
                    {contract.signedBy.map((signatory, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={signatory}
                          onChange={e => updateSignatory(contract.id, index, e.target.value)}
                          disabled={!isEditing}
                          placeholder="Name des Unterzeichners"
                          className="flex-1"
                        />
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSignatory(contract.id, index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSignatory(contract.id)}
                        className="border-dashed"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Unterzeichner hinzufügen
                      </Button>
                    )}
                  </div>
                </div>

                {/* Vertragsbedingungen */}
                <div className="md:col-span-2">
                  <Label>Vertragsbedingungen</Label>
                  <div className="space-y-2">
                    {(contract.terms || []).map((term, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <Input
                          value={term.key}
                          onChange={e =>
                            updateContractTerm(contract.id, index, 'key', e.target.value)
                          }
                          disabled={!isEditing}
                          placeholder="Bedingung"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={term.value}
                            onChange={e =>
                              updateContractTerm(contract.id, index, 'value', e.target.value)
                            }
                            disabled={!isEditing}
                            placeholder="Wert"
                            className="flex-1"
                          />
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContractTerm(contract.id, index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addContractTerm(contract.id)}
                        className="border-dashed"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Bedingung hinzufügen
                      </Button>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Verlängerungsregelung</Label>
                  <Textarea
                    value={contract.renewalTerms || ''}
                    onChange={e => updateContract(contract.id, 'renewalTerms', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Bedingungen für Vertragsverlängerung"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Kündigungsklausel</Label>
                  <Textarea
                    value={contract.terminationClause || ''}
                    onChange={e => updateContract(contract.id, 'terminationClause', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Bedingungen für Vertragsbeendigung"
                    rows={2}
                  />
                </div>
              </div>

              {/* Nachträge für diesen Vertrag */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Nachträge</h4>
                  {isEditing && (
                    <Button variant="outline" size="sm" onClick={() => addAmendment(contract.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nachtrag hinzufügen
                    </Button>
                  )}
                </div>

                {amendments
                  .filter(a => a.contractId === contract.id)
                  .map(amendment => (
                    <div key={amendment.id} className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline">
                          Nachtrag vom {new Date(amendment.date).toLocaleDateString('de-DE')}
                        </Badge>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAmendment(amendment.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Datum</Label>
                          <Input
                            type="date"
                            value={amendment.date}
                            onChange={e => updateAmendment(amendment.id, 'date', e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label>Autorisiert von</Label>
                          <Input
                            value={amendment.authorizedBy}
                            onChange={e =>
                              updateAmendment(amendment.id, 'authorizedBy', e.target.value)
                            }
                            disabled={!isEditing}
                            placeholder="Name der autorisierenden Person"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Beschreibung</Label>
                          <Textarea
                            value={amendment.description}
                            onChange={e =>
                              updateAmendment(amendment.id, 'description', e.target.value)
                            }
                            disabled={!isEditing}
                            placeholder="Beschreibung der Änderung"
                            rows={2}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Grund</Label>
                          <Textarea
                            value={amendment.reason}
                            onChange={e => updateAmendment(amendment.id, 'reason', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Grund für die Änderung"
                            rows={2}
                          />
                        </div>

                        {/* Geänderte Felder */}
                        <div className="md:col-span-2">
                          <Label>Geänderte Felder</Label>
                          <div className="space-y-2">
                            {amendment.changedFields.map((field, index) => (
                              <div key={index} className="grid grid-cols-3 gap-2">
                                <Input
                                  value={field.field}
                                  onChange={e =>
                                    updateChangedField(amendment.id, index, 'field', e.target.value)
                                  }
                                  disabled={!isEditing}
                                  placeholder="Feldname"
                                />
                                <Input
                                  value={field.oldValue}
                                  onChange={e =>
                                    updateChangedField(
                                      amendment.id,
                                      index,
                                      'oldValue',
                                      e.target.value
                                    )
                                  }
                                  disabled={!isEditing}
                                  placeholder="Alter Wert"
                                />
                                <div className="flex gap-2">
                                  <Input
                                    value={field.newValue}
                                    onChange={e =>
                                      updateChangedField(
                                        amendment.id,
                                        index,
                                        'newValue',
                                        e.target.value
                                      )
                                    }
                                    disabled={!isEditing}
                                    placeholder="Neuer Wert"
                                    className="flex-1"
                                  />
                                  {isEditing && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeChangedField(amendment.id, index)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isEditing && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addChangedField(amendment.id)}
                                className="border-dashed"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Geändertes Feld hinzufügen
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {isEditing && (
            <Button variant="outline" onClick={addContract} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Vertrag hinzufügen
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
