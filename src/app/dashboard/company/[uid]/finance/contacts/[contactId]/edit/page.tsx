'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Customer } from '@/components/finance/AddCustomerModal';

interface EditContactPageProps {
  params: Promise<{
    uid: string;
    contactId: string;
  }>;
}

export default function EditContactPage({ params }: EditContactPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { uid: companyId, contactId } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  // Form-Daten
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Deutschland',
    taxNumber: '',
    vatId: '',
    website: '',
    notes: '',
  });

  // Lade Kundendaten
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        const customerRef = doc(db, 'companies', companyId, 'customers', contactId);
        const customerSnap = await getDoc(customerRef);

        if (!customerSnap.exists()) {
          toast.error('Kontakt nicht gefunden');
          router.push(`/dashboard/company/${companyId}/finance/contacts`);
          return;
        }

        const customerData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
        setCustomer(customerData);

        // Fülle Formular mit bestehenden Daten
        setFormData({
          name: customerData.name || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
          street: customerData.street || '',
          city: customerData.city || '',
          postalCode: customerData.postalCode || '',
          country: customerData.country || 'Deutschland',
          taxNumber: customerData.taxNumber || '',
          vatId: customerData.vatId || '',
          website: (customerData as any).website || '',
          notes: (customerData as any).notes || '',
        });
      } catch (error) {
        console.error('Fehler beim Laden des Kontakts:', error);
        toast.error('Fehler beim Laden des Kontakts');
        router.push(`/dashboard/company/${companyId}/finance/contacts`);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [companyId, contactId, router]);

  // Handle Input Change
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Speichern
  const handleSave = async () => {
    // Validierung
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    try {
      setSaving(true);

      const customerRef = doc(db, 'companies', companyId, 'customers', contactId);
      await updateDoc(customerRef, {
        ...formData,
        updatedAt: serverTimestamp(),
      });

      toast.success('Kontakt erfolgreich aktualisiert');
      router.push(`/dashboard/company/${companyId}/finance/contacts/${contactId}`);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern des Kontakts');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/company/${companyId}/finance/contacts/${contactId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Kontakt bearbeiten</h1>
        <p className="text-sm text-gray-600">
          Bearbeiten Sie die Kontaktinformationen für {customer.name}
        </p>
      </div>

      {/* Formular */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Allgemeine Informationen */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Allgemeine Informationen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Firmenname oder Name"
              />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="kontakt@beispiel.de"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+49 123 456789"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.beispiel.de"
              />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="street">Straße und Hausnummer</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                placeholder="Musterstraße 123"
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postleitzahl</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder="12345"
              />
            </div>
            <div>
              <Label htmlFor="city">Stadt</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Berlin"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="country">Land</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Deutschland"
              />
            </div>
          </div>
        </div>

        {/* Steuerinformationen */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Steuerinformationen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxNumber">Steuernummer</Label>
              <Input
                id="taxNumber"
                value={formData.taxNumber}
                onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                placeholder="123/456/78900"
              />
            </div>
            <div>
              <Label htmlFor="vatId">USt-IdNr.</Label>
              <Input
                id="vatId"
                value={formData.vatId}
                onChange={(e) => handleInputChange('vatId', e.target.value)}
                placeholder="DE123456789"
              />
            </div>
          </div>
        </div>

        {/* Notizen */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notizen</h3>
          <Label htmlFor="notes">Interne Notizen</Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Interne Notizen zum Kontakt..."
            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/company/${companyId}/finance/contacts/${contactId}`)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Speichert...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
