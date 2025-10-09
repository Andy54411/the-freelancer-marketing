'use client';

import React from 'react';
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
import { Employee } from '@/services/personalService';

interface BasicInfoTabProps {
  employee: Employee | null;
  isEditing: boolean;
  onUpdate: (updates: Partial<Employee>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  employee,
  isEditing,
  onUpdate,
  onSave,
  onCancel,
  onEdit,
}) => {
  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Mitarbeiter wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persönliche Informationen */}
      <Card>
        <CardHeader>
          <CardTitle>Persönliche Informationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={employee.firstName || ''}
                onChange={e => onUpdate({ firstName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={employee.lastName || ''}
                onChange={e => onUpdate({ lastName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={employee.email || ''}
                onChange={e => onUpdate({ email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                value={employee.phone || ''}
                onChange={e => onUpdate({ phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Geburtsdatum</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={employee.dateOfBirth || ''}
                onChange={e => onUpdate({ dateOfBirth: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="nationality">Staatsangehörigkeit</Label>
              <Input
                id="nationality"
                value={employee.nationality || ''}
                onChange={e => onUpdate({ nationality: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="addressStreet">Straße und Hausnummer</Label>
            <Input
              id="addressStreet"
              value={employee.address?.street || ''}
              onChange={e =>
                onUpdate({
                  address: {
                    ...employee.address,
                    street: e.target.value,
                    city: employee.address?.city || '',
                    postalCode: employee.address?.postalCode || '',
                    country: employee.address?.country || '',
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="addressPostalCode">PLZ</Label>
              <Input
                id="addressPostalCode"
                value={employee.address?.postalCode || ''}
                onChange={e =>
                  onUpdate({
                    address: {
                      ...employee.address,
                      street: employee.address?.street || '',
                      city: employee.address?.city || '',
                      postalCode: e.target.value,
                      country: employee.address?.country || '',
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="addressCity">Stadt</Label>
              <Input
                id="addressCity"
                value={employee.address?.city || ''}
                onChange={e =>
                  onUpdate({
                    address: {
                      ...employee.address,
                      street: employee.address?.street || '',
                      city: e.target.value,
                      postalCode: employee.address?.postalCode || '',
                      country: employee.address?.country || '',
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="addressCountry">Land</Label>
              <Input
                id="addressCountry"
                value={employee.address?.country || ''}
                onChange={e =>
                  onUpdate({
                    address: {
                      ...employee.address,
                      street: employee.address?.street || '',
                      city: employee.address?.city || '',
                      postalCode: employee.address?.postalCode || '',
                      country: e.target.value,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arbeitsplatz Informationen */}
      <Card>
        <CardHeader>
          <CardTitle>Arbeitsplatz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={employee.position || ''}
                onChange={e => onUpdate({ position: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="department">Abteilung</Label>
              <Input
                id="department"
                value={employee.department || ''}
                onChange={e => onUpdate({ department: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Einstellungsdatum</Label>
              <Input
                id="startDate"
                type="date"
                value={employee.startDate || ''}
                onChange={e => onUpdate({ startDate: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="employmentType">Beschäftigungsart</Label>
              <Select
                value={employee.employmentType || ''}
                onValueChange={value =>
                  onUpdate({
                    employmentType: value as 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN',
                  })
                }
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Beschäftigungsart wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Vollzeit</SelectItem>
                  <SelectItem value="PART_TIME">Teilzeit</SelectItem>
                  <SelectItem value="FREELANCER">Freelancer</SelectItem>
                  <SelectItem value="INTERN">Praktikant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="grossSalary">Bruttogehalt (€)</Label>
              <Input
                id="grossSalary"
                type="number"
                value={employee.grossSalary || ''}
                onChange={e => onUpdate({ grossSalary: parseFloat(e.target.value) || 0 })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={employee.status || 'ACTIVE'}
                onValueChange={value =>
                  onUpdate({ status: value as 'ACTIVE' | 'INACTIVE' | 'TERMINATED' })
                }
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="INACTIVE">Inaktiv</SelectItem>
                  <SelectItem value="TERMINATED">Beendet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Versicherungsdaten */}
      <Card>
        <CardHeader>
          <CardTitle>Versicherungs- und Steuerdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="socialSecurityNumber">Sozialversicherungsnummer</Label>
              <Input
                id="socialSecurityNumber"
                value={employee.socialSecurityNumber || ''}
                onChange={e => onUpdate({ socialSecurityNumber: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="taxId">Steuerliche ID</Label>
              <Input
                id="taxId"
                value={employee.taxId || ''}
                onChange={e => onUpdate({ taxId: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="healthInsuranceProvider">Krankenkasse</Label>
              <Input
                id="healthInsuranceProvider"
                value={employee.healthInsurance?.provider || ''}
                onChange={e =>
                  onUpdate({
                    healthInsurance: {
                      provider: e.target.value,
                      memberNumber: employee.healthInsurance?.memberNumber || '',
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="healthInsuranceMemberNumber">Versichertennummer</Label>
              <Input
                id="healthInsuranceMemberNumber"
                value={employee.healthInsurance?.memberNumber || ''}
                onChange={e =>
                  onUpdate({
                    healthInsurance: {
                      provider: employee.healthInsurance?.provider || '',
                      memberNumber: e.target.value,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="bankAccountIban">IBAN</Label>
              <Input
                id="bankAccountIban"
                value={employee.bankAccount?.iban || ''}
                onChange={e =>
                  onUpdate({
                    bankAccount: {
                      iban: e.target.value,
                      bic: employee.bankAccount?.bic || '',
                      bankName: employee.bankAccount?.bankName || '',
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="DE89370400440532013000"
              />
            </div>
            <div>
              <Label htmlFor="bankAccountBic">BIC</Label>
              <Input
                id="bankAccountBic"
                value={employee.bankAccount?.bic || ''}
                onChange={e =>
                  onUpdate({
                    bankAccount: {
                      iban: employee.bankAccount?.iban || '',
                      bic: e.target.value,
                      bankName: employee.bankAccount?.bankName || '',
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="DEUTDEFFXXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notizen */}
      <Card>
        <CardHeader>
          <CardTitle>Zusätzliche Informationen</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={employee.notes || ''}
              onChange={e => onUpdate({ notes: e.target.value })}
              disabled={!isEditing}
              rows={4}
              placeholder="Interne Notizen zum Mitarbeiter..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button onClick={onSave} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              Speichern
            </Button>
          </>
        ) : (
          <Button onClick={onEdit} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            Bearbeiten
          </Button>
        )}
      </div>
    </div>
  );
};

export default BasicInfoTab;
