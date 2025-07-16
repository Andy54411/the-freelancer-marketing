import React, { useState, useEffect } from 'react';
import { MusikerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface MusikerFormProps {
  data: MusikerData;
  onDataChange: (data: MusikerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MusikerForm: React.FC<MusikerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MusikerData>(data);

  const serviceTypeOptions = [
    { value: 'live_musik', label: 'Live-Musik' },
    { value: 'dj', label: 'DJ' },
    { value: 'band', label: 'Band' },
    { value: 'solo_künstler', label: 'Solo-Künstler' },
    { value: 'duo', label: 'Duo' },
    { value: 'trio', label: 'Trio' },
    { value: 'quartett', label: 'Quartett' },
    { value: 'orchester', label: 'Orchester' },
    { value: 'chor', label: 'Chor' },
    { value: 'musikunterricht', label: 'Musikunterricht' },
    { value: 'aufnahme', label: 'Aufnahme/Studio' },
    { value: 'komposition', label: 'Komposition' },
    { value: 'arrangement', label: 'Arrangement' },
    { value: 'musikproduktion', label: 'Musikproduktion' },
    { value: 'mixing', label: 'Mixing/Mastering' },
    { value: 'sound_techniker', label: 'Sound-Techniker' },
  ];

  const musicGenreOptions = [
    { value: 'pop', label: 'Pop' },
    { value: 'rock', label: 'Rock' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'klassik', label: 'Klassik' },
    { value: 'blues', label: 'Blues' },
    { value: 'country', label: 'Country' },
    { value: 'folk', label: 'Folk' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'dance', label: 'Dance' },
    { value: 'hip_hop', label: 'Hip-Hop' },
    { value: 'reggae', label: 'Reggae' },
    { value: 'latin', label: 'Latin' },
    { value: 'world', label: 'World Music' },
    { value: 'schlager', label: 'Schlager' },
    { value: 'oldies', label: 'Oldies' },
    { value: 'instrumental', label: 'Instrumental' },
    { value: 'ambient', label: 'Ambient' },
    { value: 'andere', label: 'Andere' },
  ];

  const instrumentOptions = [
    { value: 'klavier', label: 'Klavier' },
    { value: 'gitarre', label: 'Gitarre' },
    { value: 'bass', label: 'Bass' },
    { value: 'schlagzeug', label: 'Schlagzeug' },
    { value: 'geige', label: 'Geige' },
    { value: 'cello', label: 'Cello' },
    { value: 'flöte', label: 'Flöte' },
    { value: 'saxophon', label: 'Saxophon' },
    { value: 'trompete', label: 'Trompete' },
    { value: 'keyboard', label: 'Keyboard' },
    { value: 'harmonika', label: 'Harmonika' },
    { value: 'gesang', label: 'Gesang' },
    { value: 'andere', label: 'Andere Instrumente' },
  ];

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenfeier', label: 'Firmenfeier' },
    { value: 'konzert', label: 'Konzert' },
    { value: 'festival', label: 'Festival' },
    { value: 'party', label: 'Party' },
    { value: 'taufe', label: 'Taufe' },
    { value: 'konfirmation', label: 'Konfirmation' },
    { value: 'beerdigung', label: 'Beerdigung' },
    { value: 'weihnachtsfeier', label: 'Weihnachtsfeier' },
    { value: 'silvester', label: 'Silvester' },
    { value: 'oktoberfest', label: 'Oktoberfest' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'bar', label: 'Bar/Lounge' },
    { value: 'kirche', label: 'Kirche' },
    { value: 'andere', label: 'Andere' },
  ];

  const venueTypeOptions = [
    { value: 'indoor', label: 'Indoor' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'beides', label: 'Beides möglich' },
  ];

  const audienceOptions = [
    { value: 'unter_50', label: 'Unter 50 Personen' },
    { value: '50_100', label: '50-100 Personen' },
    { value: '100_200', label: '100-200 Personen' },
    { value: '200_500', label: '200-500 Personen' },
    { value: '500_1000', label: '500-1000 Personen' },
    { value: 'über_1000', label: 'Über 1000 Personen' },
  ];

  const durationOptions = [
    { value: '1', label: '1 Stunde' },
    { value: '2', label: '2 Stunden' },
    { value: '3', label: '3 Stunden' },
    { value: '4', label: '4 Stunden' },
    { value: '5', label: '5 Stunden' },
    { value: '6', label: '6+ Stunden' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_200', label: 'Unter 200€' },
    { value: '200_500', label: '200€ - 500€' },
    { value: '500_1000', label: '500€ - 1.000€' },
    { value: '1000_2000', label: '1.000€ - 2.000€' },
    { value: '2000_5000', label: '2.000€ - 5.000€' },
    { value: 'über_5000', label: 'Über 5.000€' },
  ];

  const experienceLevelOptions = [
    { value: 'amateur', label: 'Amateur' },
    { value: 'semi_profi', label: 'Semi-Profi' },
    { value: 'profi', label: 'Profi' },
    { value: 'star', label: 'Star/Bekannt' },
    { value: 'egal', label: 'Egal' },
  ];

  const equipmentOptions = [
    { value: 'eigene_anlage', label: 'Eigene Anlage' },
    { value: 'verstärker', label: 'Verstärker' },
    { value: 'mikrofon', label: 'Mikrofon' },
    { value: 'licht', label: 'Licht' },
    { value: 'instrumente', label: 'Instrumente' },
    { value: 'dj_equipment', label: 'DJ-Equipment' },
    { value: 'aufnahme', label: 'Aufnahme-Equipment' },
    { value: 'keine', label: 'Keine eigene Ausstattung' },
  ];

  const additionalServicesOptions = [
    { value: 'moderation', label: 'Moderation' },
    { value: 'ansage', label: 'Ansage' },
    { value: 'ton_technik', label: 'Tontechnik' },
    { value: 'licht_technik', label: 'Lichttechnik' },
    { value: 'aufbau', label: 'Aufbau/Abbau' },
    { value: 'transport', label: 'Transport' },
    { value: 'probe', label: 'Probe' },
    { value: 'sound_check', label: 'Sound-Check' },
    { value: 'aufnahme', label: 'Aufnahme' },
    { value: 'live_stream', label: 'Live-Stream' },
  ];

  const locationOptions = [
    { value: 'deutschland', label: 'Deutschland' },
    { value: 'europa', label: 'Europa' },
    { value: 'weltweit', label: 'Weltweit' },
    { value: 'lokal', label: 'Nur lokal' },
  ];

  const handleInputChange = (field: keyof MusikerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.musicGenre &&
      formData.eventType &&
      formData.venueType &&
      formData.audienceSize &&
      formData.duration &&
      formData.budgetRange &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Musiker-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Musikrichtung" required>
            <FormSelect
              value={formData.musicGenre || ''}
              onChange={value => handleInputChange('musicGenre', value)}
              options={musicGenreOptions}
              placeholder="Wählen Sie die Musikrichtung"
            />
          </FormField>

          <FormField label="Art der Veranstaltung" required>
            <FormCheckboxGroup
              value={formData.eventType || []}
              onChange={value => handleInputChange('eventType', value)}
              options={eventTypeOptions}
            />
          </FormField>

          <FormField label="Veranstaltungsort" required>
            <FormSelect
              value={formData.venueType || ''}
              onChange={value => handleInputChange('venueType', value)}
              options={venueTypeOptions}
              placeholder="Wählen Sie den Veranstaltungsort"
            />
          </FormField>

          <FormField label="Publikumsgröße" required>
            <FormSelect
              value={formData.audienceSize || ''}
              onChange={value => handleInputChange('audienceSize', value)}
              options={audienceOptions}
              placeholder="Wählen Sie die Publikumsgröße"
            />
          </FormField>

          <FormField label="Dauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Dauer"
            />
          </FormField>

          <FormField label="Budget-Rahmen" required>
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
            />
          </FormField>

          <FormField label="Gewünschte Erfahrung">
            <FormSelect
              value={formData.experienceLevel || ''}
              onChange={value => handleInputChange('experienceLevel', value)}
              options={experienceLevelOptions}
              placeholder="Wählen Sie die Erfahrung"
            />
          </FormField>

          <FormField label="Reichweite">
            <FormSelect
              value={formData.travelRange || ''}
              onChange={value => handleInputChange('travelRange', value)}
              options={locationOptions}
              placeholder="Wählen Sie die Reichweite"
            />
          </FormField>

          <FormField label="Veranstaltungsdatum">
            <FormInput
              type="text"
              value={formData.eventDate || ''}
              onChange={value => handleInputChange('eventDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Uhrzeit">
            <FormInput
              type="text"
              value={formData.eventTime || ''}
              onChange={value => handleInputChange('eventTime', value)}
              placeholder="HH:MM"
            />
          </FormField>

          <FormField label="Kontaktperson">
            <FormInput
              type="text"
              value={formData.contactPerson || ''}
              onChange={value => handleInputChange('contactPerson', value)}
              placeholder="Name der Kontaktperson"
            />
          </FormField>

          <FormField label="Telefonnummer">
            <FormInput
              type="text"
              value={formData.phoneNumber || ''}
              onChange={value => handleInputChange('phoneNumber', value)}
              placeholder="Telefonnummer"
            />
          </FormField>

          <FormField label="E-Mail">
            <FormInput
              type="email"
              value={formData.email || ''}
              onChange={value => handleInputChange('email', value)}
              placeholder="E-Mail-Adresse"
            />
          </FormField>

          <FormField label="Veranstaltungsadresse">
            <FormInput
              type="text"
              value={formData.eventAddress || ''}
              onChange={value => handleInputChange('eventAddress', value)}
              placeholder="Straße, PLZ, Ort"
            />
          </FormField>

          <FormField label="Anzahl Künstler">
            <FormInput
              type="number"
              value={formData.numberOfArtists?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfArtists',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Künstler"
            />
          </FormField>

          <FormField label="Pausenzeiten">
            <FormInput
              type="text"
              value={formData.breakTimes || ''}
              onChange={value => handleInputChange('breakTimes', value)}
              placeholder="Gewünschte Pausenzeiten"
            />
          </FormField>

          <FormField label="Aufbauzeit">
            <FormInput
              type="text"
              value={formData.setupTime || ''}
              onChange={value => handleInputChange('setupTime', value)}
              placeholder="Benötigte Aufbauzeit"
            />
          </FormField>

          <FormField label="Lautstärke">
            <FormInput
              type="text"
              value={formData.volumeLevel || ''}
              onChange={value => handleInputChange('volumeLevel', value)}
              placeholder="Gewünschte Lautstärke"
            />
          </FormField>

          <FormField label="Alter der Zielgruppe">
            <FormInput
              type="text"
              value={formData.targetAgeGroup || ''}
              onChange={value => handleInputChange('targetAgeGroup', value)}
              placeholder="Alter der Zielgruppe"
            />
          </FormField>

          <FormField label="Kleiderordnung">
            <FormInput
              type="text"
              value={formData.dressCode || ''}
              onChange={value => handleInputChange('dressCode', value)}
              placeholder="Gewünschte Kleiderordnung"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Instrumente">
            <FormCheckboxGroup
              value={formData.instruments || []}
              onChange={value => handleInputChange('instruments', value)}
              options={instrumentOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ausstattung">
            <FormCheckboxGroup
              value={formData.equipment || []}
              onChange={value => handleInputChange('equipment', value)}
              options={equipmentOptions}
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
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Musik-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Repertoire-Wünsche">
            <FormTextarea
              value={formData.repertoireRequests || ''}
              onChange={value => handleInputChange('repertoireRequests', value)}
              placeholder="Spezielle Liedwünsche oder Repertoire-Vorstellungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Atmosphäre">
            <FormTextarea
              value={formData.atmosphere || ''}
              onChange={value => handleInputChange('atmosphere', value)}
              placeholder="Gewünschte Atmosphäre und Stimmung"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Technische Anforderungen">
            <FormTextarea
              value={formData.technicalRequirements || ''}
              onChange={value => handleInputChange('technicalRequirements', value)}
              placeholder="Technische Anforderungen und Ausstattung vor Ort"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Logistik">
            <FormTextarea
              value={formData.logistics || ''}
              onChange={value => handleInputChange('logistics', value)}
              placeholder="Logistische Informationen (Parken, Laden, etc.)"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Verpflegung">
            <FormTextarea
              value={formData.catering || ''}
              onChange={value => handleInputChange('catering', value)}
              placeholder="Verpflegung für die Künstler"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequests || ''}
              onChange={value => handleInputChange('specialRequests', value)}
              placeholder="Besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dringlichkeit">
            <FormRadioGroup
              name="urgency"
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={[
                { value: 'nicht_eilig', label: 'Nicht eilig' },
                { value: 'normal', label: 'Normal' },
                { value: 'eilig', label: 'Eilig' },
                { value: 'sehr_eilig', label: 'Sehr eilig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wiederholung">
            <FormRadioGroup
              name="recurring"
              value={formData.recurring || ''}
              onChange={value => handleInputChange('recurring', value)}
              options={[
                { value: 'einmalig', label: 'Einmalig' },
                { value: 'regelmäßig', label: 'Regelmäßig' },
                { value: 'jährlich', label: 'Jährlich' },
                { value: 'monatlich', label: 'Monatlich' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Publikum">
            <FormRadioGroup
              name="audienceType"
              value={formData.audienceType || ''}
              onChange={value => handleInputChange('audienceType', value)}
              options={[
                { value: 'kinder', label: 'Kinder' },
                { value: 'erwachsene', label: 'Erwachsene' },
                { value: 'senioren', label: 'Senioren' },
                { value: 'gemischt', label: 'Gemischt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Interaktion gewünscht">
            <FormRadioGroup
              name="interactionDesired"
              value={formData.interactionDesired || ''}
              onChange={value => handleInputChange('interactionDesired', value)}
              options={[
                { value: 'ja', label: 'Ja, Interaktion gewünscht' },
                { value: 'nein', label: 'Nein, nur Musik' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aufnahme erlaubt">
            <FormRadioGroup
              name="recordingAllowed"
              value={formData.recordingAllowed || ''}
              onChange={value => handleInputChange('recordingAllowed', value)}
              options={[
                { value: 'ja', label: 'Ja, Aufnahme erlaubt' },
                { value: 'nein', label: 'Nein, keine Aufnahme' },
                { value: 'nach_absprache', label: 'Nach Absprache' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default MusikerForm;
