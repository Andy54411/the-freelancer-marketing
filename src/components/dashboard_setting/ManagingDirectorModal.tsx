'use client';

import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, User } from 'lucide-react';
import { UserDataForSettings } from '@/types/settings';

interface ManagingDirector {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  isMainDirector?: boolean;
}

interface ManagingDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: UserDataForSettings;
  handleChange: (path: string, value: string | number) => void;
  onSave: () => void;
}

const emptyDirector: ManagingDirector = {
  id: '',
  firstName: '',
  lastName: '',
  street: '',
  postalCode: '',
  city: '',
  country: 'Deutschland',
  phone: '',
  email: '',
  dateOfBirth: '',
  placeOfBirth: '',
  nationality: 'Deutsch',
  isMainDirector: false,
};

const ManagingDirectorModal: React.FC<ManagingDirectorModalProps> = ({
  isOpen,
  onClose,
  formData,
  handleChange,
  onSave,
}) => {
  // Initialisiere Geschäftsführer-Liste aus den vorhandenen Daten
  const initializeDirectors = (): ManagingDirector[] => {
    // Erstelle einen Hauptgeschäftsführer aus den alten Daten
    const mainDirector: ManagingDirector = {
      id: 'main-director',
      firstName: formData.step1?.personalData?.firstName || '',
      lastName: formData.step1?.personalData?.lastName || '',
      street: formData.step1?.personalData?.address?.street || '',
      postalCode: formData.step1?.personalData?.address?.postalCode || '',
      city: formData.step1?.personalData?.address?.city || '',
      country: formData.step1?.personalData?.address?.country || 'Deutschland',
      phone: formData.step1?.personalData?.phone || '',
      email: formData.step1?.personalData?.email || formData.email || '',
      dateOfBirth: formData.step1?.personalData?.dateOfBirth || '',
      placeOfBirth: formData.step1?.personalData?.placeOfBirth || '',
      nationality: formData.step1?.personalData?.nationality || 'Deutsch',
      isMainDirector: true,
    };
    return [mainDirector];
  };

  const [directors, setDirectors] = useState<ManagingDirector[]>(initializeDirectors);
  const [editingDirector, setEditingDirector] = useState<ManagingDirector>({ ...emptyDirector });
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleDirectorChange = (field: keyof ManagingDirector, value: string) => {
    setEditingDirector(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addNewDirector = () => {
    setEditingDirector({
      ...emptyDirector,
      id: `director-${Date.now()}`,
      isMainDirector: false,
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const editDirector = (director: ManagingDirector) => {
    setEditingDirector({ ...director });
    setIsEditing(true);
    setShowForm(true);
  };

  const saveDirector = () => {
    if (isEditing) {
      // Bearbeite bestehenden Geschäftsführer
      setDirectors(prev =>
        prev.map(dir => (dir.id === editingDirector.id ? editingDirector : dir))
      );
    } else {
      // Füge neuen Geschäftsführer hinzu
      setDirectors(prev => [...prev, editingDirector]);
    }
    setShowForm(false);
    setEditingDirector({ ...emptyDirector });
  };

  const deleteDirector = (id: string) => {
    // Bestätigungsdialog für alle Geschäftsführer
    const director = directors.find(d => d.id === id);
    const message = director?.isMainDirector
      ? 'Sind Sie sicher, dass Sie den Hauptgeschäftsführer löschen möchten?'
      : 'Sind Sie sicher, dass Sie diesen Geschäftsführer löschen möchten?';

    if (confirm(message)) {
      const updatedDirectors = directors.filter(dir => dir.id !== id);

      // Wenn der Hauptgeschäftsführer gelöscht wird und andere vorhanden sind,
      // wird der erste verbleibende zum Hauptgeschäftsführer
      if (director?.isMainDirector && updatedDirectors.length > 0) {
        updatedDirectors[0].isMainDirector = true;
      }

      setDirectors(updatedDirectors);
    }
  };

  const handleSave = async () => {
    // Speichere alle Geschäftsführer direkt in das Hauptformular
    directors.forEach((director, index) => {
      if (index === 0) {
        // Hauptgeschäftsführer in personalData speichern
        handleChange('step1.personalData.firstName', director.firstName);
        handleChange('step1.personalData.lastName', director.lastName);
        handleChange('step1.personalData.phone', director.phone);
        handleChange('step1.personalData.email', director.email);
        handleChange('step1.personalData.dateOfBirth', director.dateOfBirth);
        handleChange('step1.personalData.placeOfBirth', director.placeOfBirth);
        handleChange('step1.personalData.nationality', director.nationality);
        handleChange('step1.personalData.address.street', director.street);
        handleChange('step1.personalData.address.postalCode', director.postalCode);
        handleChange('step1.personalData.address.city', director.city);
        handleChange('step1.personalData.address.country', director.country);
      }
    });

    // Speichere auch alle Geschäftsführer als Array
    (handleChange as any)('step1.managingDirectors', directors);

    // Speichere direkt in die Datenbank
    await onSave();
    onClose();
  };

  if (!isOpen) return null;

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Geschäftsführer bearbeiten' : 'Neuen Geschäftsführer hinzufügen'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="block mb-1 font-medium text-gray-700">Vorname *</label>
                <input
                  type="text"
                  value={editingDirector.firstName}
                  onChange={e => handleDirectorChange('firstName', e.target.value)}
                  className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="block mb-1 font-medium text-gray-700">Nachname *</label>
                <input
                  type="text"
                  value={editingDirector.lastName}
                  onChange={e => handleDirectorChange('lastName', e.target.value)}
                  className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="block mb-1 font-medium text-gray-700">Geburtsdatum</label>
                <input
                  type="date"
                  value={editingDirector.dateOfBirth}
                  onChange={e => handleDirectorChange('dateOfBirth', e.target.value)}
                  className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="block mb-1 font-medium text-gray-700">Geburtsort</label>
                <input
                  type="text"
                  value={editingDirector.placeOfBirth}
                  onChange={e => handleDirectorChange('placeOfBirth', e.target.value)}
                  className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="z.B. München"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="block mb-1 font-medium text-gray-700">Nationalität</label>
              <input
                type="text"
                value={editingDirector.nationality}
                onChange={e => handleDirectorChange('nationality', e.target.value)}
                className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="z.B. Deutsch"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="block mb-1 font-medium text-gray-700">
                    Straße und Hausnummer *
                  </label>
                  <input
                    type="text"
                    value={editingDirector.street}
                    onChange={e => handleDirectorChange('street', e.target.value)}
                    className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="z.B. Musterstraße 123"
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="block mb-1 font-medium text-gray-700">PLZ *</label>
                    <input
                      type="text"
                      value={editingDirector.postalCode}
                      onChange={e => handleDirectorChange('postalCode', e.target.value)}
                      className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="z.B. 80331"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block mb-1 font-medium text-gray-700">Stadt *</label>
                    <input
                      type="text"
                      value={editingDirector.city}
                      onChange={e => handleDirectorChange('city', e.target.value)}
                      className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="z.B. München"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="block mb-1 font-medium text-gray-700">Land</label>
                  <input
                    type="text"
                    value={editingDirector.country}
                    onChange={e => handleDirectorChange('country', e.target.value)}
                    className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Kontaktdaten</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="block mb-1 font-medium text-gray-700">Telefon</label>
                  <input
                    type="tel"
                    value={editingDirector.phone}
                    onChange={e => handleDirectorChange('phone', e.target.value)}
                    className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="z.B. +49 89 123456789"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block mb-1 font-medium text-gray-700">E-Mail-Adresse</label>
                  <input
                    type="email"
                    value={editingDirector.email}
                    onChange={e => handleDirectorChange('email', e.target.value)}
                    className="input border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="geschaeftsfuehrer@firma.de"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50/80 backdrop-blur-sm">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 text-base font-medium text-gray-700 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-colors duration-200"
            >
              Abbrechen
            </button>
            <button
              onClick={saveDirector}
              className="px-6 py-3 text-base font-medium text-teal-600 bg-white/90 backdrop-blur-sm border border-teal-300 rounded-md hover:bg-green-50 hover:text-green-600 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-colors duration-200"
            >
              <svg
                className="inline-block w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Speichern
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Geschäftsführer verwalten</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Verwalten Sie alle Geschäftsführer Ihres Unternehmens. Der Hauptgeschäftsführer wird
              für offizielle Dokumente verwendet.
            </p>
            <button
              onClick={addNewDirector}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Hinzufügen
            </button>
          </div>

          <div className="grid gap-4">
            {directors.map(director => (
              <div key={director.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="shrink-0">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {director.firstName} {director.lastName}
                        {director.isMainDirector && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                            Hauptgeschäftsführer
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {director.street}, {director.postalCode} {director.city}
                      </p>
                      <p className="text-sm text-gray-500">
                        {director.email} • {director.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => editDirector(director)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteDirector(director.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50/80 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-6 py-3 text-base font-medium text-gray-700 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-colors duration-200"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 text-base font-medium text-teal-600 bg-white/90 backdrop-blur-sm border border-teal-300 rounded-md hover:bg-green-50 hover:text-green-600 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-colors duration-200"
          >
            <svg
              className="inline-block w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagingDirectorModal;
