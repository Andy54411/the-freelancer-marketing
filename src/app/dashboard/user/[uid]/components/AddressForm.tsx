// src/app/dashboard/user/[uid]/components/AddressForm.tsx
'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { SavedAddress } from '@/types/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface AddressFormProps {
    initialData?: Partial<SavedAddress>;
    onChange: (address: SavedAddress) => void;
    onCancel: () => void;
}

const AddressForm: React.FC<AddressFormProps> = ({ initialData, onChange, onCancel }) => {
    const [address, setAddress] = useState<Partial<SavedAddress>>({
        name: '', line1: '', line2: '', city: '', postal_code: '', country: 'DE', ...initialData
    });

    useEffect(() => {
        if (initialData) {
            setAddress(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedAddress = { ...address, [name]: value } as SavedAddress;
        setAddress(updatedAddress);

        if (onChange) {
            onChange(updatedAddress);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-1.5">
                <Label htmlFor="addr-name">Name der Adresse (z.B. "Zuhause")</Label>
                <Input id="addr-name" name="name" value={address.name || ''} onChange={handleFieldChange} placeholder="Zuhause" />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="addr-line1">Straße & Hausnummer</Label>
                <Input id="addr-line1" name="line1" value={address.line1 || ''} onChange={handleFieldChange} placeholder="Musterstraße 123" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="addr-postal_code">Postleitzahl</Label>
                    <Input id="addr-postal_code" name="postal_code" value={address.postal_code || ''} onChange={handleFieldChange} placeholder="12345" required />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="addr-city">Stadt</Label>
                    <Input id="addr-city" name="city" value={address.city || ''} onChange={handleFieldChange} placeholder="Musterstadt" required />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Abbrechen
                </Button>
            </div>
        </div>
    );
};
export default AddressForm;