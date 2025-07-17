import React, { useState, useEffect } from 'react';
import { DJServiceData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface DJServiceFormProps {
  data: DJServiceData;
  onDataChange: (data: DJServiceData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DJServiceForm: React.FC<DJServiceFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<DJServiceData>(data);

  const serviceTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeits-DJ' },
    { value: 'geburtstag', label: 'Geburtstags-DJ' },
    { value: 'firmenfeier', label: 'Firmenfeier-DJ' },
    { value: 'club', label: 'Club-DJ' },
    { value: 'party', label: 'Party-DJ' },
    { value: 'schulfest', label: 'Schulfest-DJ' },
    { value: 'stadtfest', label: 'Stadtfest-DJ' },
    { value: 'radio', label: 'Radio-Moderation' },
    { value: 'karaoke', label: 'Karaoke-DJ' },
    { value: 'mobile_disco', label: 'Mobile Disco' },
  ];

  const musicGenreOptions = [
    { value: 'pop', label: 'Pop' },
    { value: 'rock', label: 'Rock' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'hip_hop', label: 'Hip-Hop' },
    { value: 'house', label: 'House' },
    { value: 'techno', label: 'Techno' },
    { value: 'disco', label: 'Disco' },
    { value: 'funk', label: 'Funk' },
    { value: 'soul', label: 'Soul' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'reggae', label: 'Reggae' },
    { value: 'latin', label: 'Latin' },
    { value: 'schlager', label: 'Schlager' },
    { value: 'oldies', label: 'Oldies' },
    { value: 'charts', label: 'Charts' },
    { value: 'mixed', label: 'Gemischt' },
  ];

  const eventDurationOptions = [
    { value: '2', label: '2 Stunden' },
    { value: '3', label: '3 Stunden' },
    { value: '4', label: '4 Stunden' },
    { value: '5', label: '5 Stunden' },
    { value: '6', label: '6 Stunden' },
    { value: '8', label: '8 Stunden' },
    { value: '10', label: '10+ Stunden' },
  ];

  const guestCountOptions = [
    { value: 'bis_50', label: 'Bis 50 Gäste' },
    { value: '50_100', label: '50 - 100 Gäste' },
    { value: '100_200', label: '100 - 200 Gäste' },
    { value: '200_500', label: '200 - 500 Gäste' },
    { value: 'über_500', label: 'Über 500 Gäste' },
  ];
  const additionalServicesOptions = [
    { value: 'lichtshow', label: 'Lichtshow' },
    { value: 'nebelmaschine', label: 'Nebelmaschine' },
    { value: 'mikrofon', label: 'Mikrofon/Moderation' },
    { value: 'karaoke', label: 'Karaoke' },
    { value: 'livestream', label: 'Livestream' },
    { value: 'aufzeichnung', label: 'Aufzeichnung' },
    { value: 'playlist_erstellung', label: 'Playlist-Erstellung' },
    { value: 'musikwünsche', label: 'Musikwünsche' },
    { value: 'tanzfläche', label: 'Tanzfläche' },
    { value: 'backup_system', label: 'Backup-System' },
  ];

  const handleInputChange = (field: keyof DJServiceData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.musicGenres && formData.guestCount);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          DJ-Service-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Events" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Events"
            />
          </FormField>

          <FormField label="Event-Ort">
            <FormInput
              type="text"
              value={formData.eventLocation || ''}
              onChange={value => handleInputChange('eventLocation', value)}
              placeholder="Adresse der Veranstaltung"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Musikrichtungen" required>
            <FormCheckboxGroup
              value={formData.musicGenres || []}
              onChange={value => handleInputChange('musicGenres', value)}
              options={musicGenreOptions}
              maxSelections={5}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Technik vorhanden">
            <FormRadioGroup
              name="equipment"
              value={formData.equipment || ''}
              onChange={value => handleInputChange('equipment', value)}
              options={[
                { value: 'dj_bringt_alles', label: 'DJ bringt komplette Technik mit' },
                { value: 'teilweise_vorhanden', label: 'Teilweise vorhanden' },
                { value: 'alles_vorhanden', label: 'Komplette Technik vorhanden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung erwünscht">
            <FormRadioGroup
              name="experience"
              value={formData.experience || ''}
              onChange={value => handleInputChange('experience', value)}
              options={[
                { value: 'anfänger', label: 'Anfänger (günstiger)' },
                { value: 'erfahren', label: 'Erfahrener DJ' },
                { value: 'profi', label: 'Profi-DJ' },
                { value: 'egal', label: 'Egal' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequests || ''}
              onChange={value => handleInputChange('specialRequests', value)}
              placeholder="Besondere Musikwünsche, Ablauf, etc."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default DJServiceForm;
