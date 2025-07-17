import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface EventOrganisationData {
  subcategory: string;
  eventType: string;
  guestCount: string;
  location: string;
  duration: string;
  budget: string;
  services: string[];
  catering: string;
  date: string;
  theme: string;
  description?: string;
}

interface EventOrganisationFormProps {
  data: EventOrganisationData;
  onDataChange: (data: EventOrganisationData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const EventOrganisationForm: React.FC<EventOrganisationFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<EventOrganisationData>(data);

  const eventTypeOptions = [
    { value: 'firmenfeier', label: 'Firmenfeier/Firmenevent' },
    { value: 'konferenz', label: 'Konferenz/Tagung' },
    { value: 'messe', label: 'Messe/Ausstellung' },
    { value: 'produktlaunch', label: 'Produktlaunch' },
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'jubiläum', label: 'Jubiläum' },
    { value: 'weihnachtsfeier', label: 'Weihnachtsfeier' },
    { value: 'teambuilding', label: 'Teambuilding-Event' },
    { value: 'gala', label: 'Gala/Preisverleihung' },
    { value: 'festival', label: 'Festival/Konzert' },
    { value: 'workshop', label: 'Workshop/Seminar' },
    { value: 'andere', label: 'Andere' },
  ];

  const guestCountOptions = [
    { value: 'klein', label: 'Klein (< 20 Personen)' },
    { value: 'mittel', label: 'Mittel (20-50 Personen)' },
    { value: 'gross', label: 'Groß (50-100 Personen)' },
    { value: 'sehr_gross', label: 'Sehr groß (100-250 Personen)' },
    { value: 'XXL', label: 'XXL (> 250 Personen)' },
  ];

  const locationOptions = [
    { value: 'hotel', label: 'Hotel/Restaurant' },
    { value: 'eventlocation', label: 'Event-Location' },
    { value: 'firmengelände', label: 'Firmengelände' },
    { value: 'privaträume', label: 'Privaträume' },
    { value: 'outdoor', label: 'Outdoor/Garten' },
    { value: 'schloss', label: 'Schloss/historische Stätte' },
    { value: 'messehalle', label: 'Messehalle' },
    { value: 'konferenzcenter', label: 'Konferenzzentrum' },
    { value: 'virtuell', label: 'Virtuell/Online' },
    { value: 'hybrid', label: 'Hybrid (Online & Präsenz)' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: 'halbtag', label: 'Halbtags (bis zu 4 Stunden)' },
    { value: 'tag', label: 'Ganztags (bis zu 8 Stunden)' },
    { value: 'abend', label: 'Abendveranstaltung' },
    { value: 'mehrtägig', label: 'Mehrtägig' },
    { value: 'woche', label: 'Woche' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetOptions = [
    { value: 'niedrig', label: 'Niedrig (< 1.000€)' },
    { value: 'mittel', label: 'Mittel (1.000-5.000€)' },
    { value: 'hoch', label: 'Hoch (5.000-20.000€)' },
    { value: 'sehr_hoch', label: 'Sehr hoch (> 20.000€)' },
  ];

  const servicesOptions = [
    { value: 'komplettplanung', label: 'Komplettplanung des Events' },
    { value: 'locationsuche', label: 'Locationsuche' },
    { value: 'catering', label: 'Catering-Organisation' },
    { value: 'dekoration', label: 'Dekoration' },
    { value: 'technik', label: 'Technik/Audiovisuelle Ausstattung' },
    { value: 'einladungen', label: 'Einladungsmanagement' },
    { value: 'gästemanagement', label: 'Gästemanagement' },
    { value: 'unterhaltung', label: 'Unterhaltungsprogramm' },
    { value: 'redner', label: 'Redner/Moderatoren' },
    { value: 'fotografie', label: 'Fotografie/Videografie' },
    { value: 'transport', label: 'Transportorganisation' },
    { value: 'unterkunft', label: 'Unterkunftsorganisation' },
    { value: 'personal', label: 'Event-Personal/Hostessen' },
    { value: 'marketing', label: 'Event-Marketing' },
    { value: 'nachbetreuung', label: 'Nachbetreuung/Evaluation' },
    { value: 'andere', label: 'Andere' },
  ];

  const cateringOptions = [
    { value: 'keines', label: 'Kein Catering benötigt' },
    { value: 'fingerfood', label: 'Fingerfood/Snacks' },
    { value: 'buffet', label: 'Buffet' },
    { value: 'mehrgängig', label: 'Mehrgängiges Menü' },
    { value: 'bbq', label: 'Barbecue/Grill' },
    { value: 'getränke', label: 'Nur Getränke' },
    { value: 'kaffee', label: 'Kaffee & Kuchen' },
    { value: 'frühstück', label: 'Frühstück/Brunch' },
    { value: 'externe', label: 'Externe Caterer bereits vorhanden' },
    { value: 'andere', label: 'Andere' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof EventOrganisationData, value: string | string[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.eventType &&
      formData.guestCount &&
      formData.location &&
      formData.duration
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art des Events" required>
        <FormSelect
          value={formData.eventType}
          onChange={value => handleChange('eventType', value)}
          options={eventTypeOptions}
        />
      </FormField>

      <FormField label="Anzahl der Gäste" required>
        <FormSelect
          value={formData.guestCount}
          onChange={value => handleChange('guestCount', value)}
          options={guestCountOptions}
        />
      </FormField>

      <FormField label="Ort/Location" required>
        <FormSelect
          value={formData.location}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Dauer des Events" required>
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Budget">
        <FormSelect
          value={formData.budget || ''}
          onChange={value => handleChange('budget', value)}
          options={budgetOptions}
        />
      </FormField>

      <FormField label="Gewünschte Services">
        <FormCheckboxGroup
          value={formData.services || []}
          onChange={value => handleChange('services', value)}
          options={servicesOptions}
        />
      </FormField>

      <FormField label="Catering">
        <FormSelect
          value={formData.catering || ''}
          onChange={value => handleChange('catering', value)}
          options={cateringOptions}
        />
      </FormField>

      <FormField label="Datum/Zeitpunkt">
        <FormInput
          value={formData.date || ''}
          onChange={(value: string | number) => handleChange('date', value)}
          placeholder="z.B. 15.10.2025 oder 'noch flexibel'"
        />
      </FormField>

      <FormField label="Thema/Motto des Events">
        <FormInput
          value={formData.theme || ''}
          onChange={(value: string | number) => handleChange('theme', value)}
          placeholder="z.B. '20er Jahre', 'Zukunftstechnologien', etc."
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihr Event"
        />
      </FormField>
    </div>
  );
};

export default EventOrganisationForm;
