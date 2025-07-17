import React, { useState, useEffect } from 'react';
import { EventplanungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface EventplanungFormProps {
  data: EventplanungData;
  onDataChange: (data: EventplanungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const EventplanungForm: React.FC<EventplanungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<EventplanungData>(data);

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenfeier', label: 'Firmenfeier' },
    { value: 'konferenz', label: 'Konferenz' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'messe', label: 'Messe' },
    { value: 'gala', label: 'Gala' },
    { value: 'jubiläum', label: 'Jubiläum' },
    { value: 'taufe', label: 'Taufe' },
    { value: 'kommunion', label: 'Kommunion' },
    { value: 'konfirmation', label: 'Konfirmation' },
    { value: 'abschlussfeier', label: 'Abschlussfeier' },
    { value: 'weihnachtsfeier', label: 'Weihnachtsfeier' },
    { value: 'silvester', label: 'Silvester' },
    { value: 'produktpräsentation', label: 'Produktpräsentation' },
    { value: 'charity', label: 'Charity-Event' },
    { value: 'konzert', label: 'Konzert' },
    { value: 'festival', label: 'Festival' },
    { value: 'andere', label: 'Andere' },
  ];

  const eventSizeOptions = [
    { value: 'klein', label: 'Klein (bis 25 Personen)' },
    { value: 'mittel', label: 'Mittel (25-50 Personen)' },
    { value: 'gross', label: 'Groß (50-100 Personen)' },
    { value: 'sehr_gross', label: 'Sehr groß (100-200 Personen)' },
    { value: 'mega', label: 'Mega (über 200 Personen)' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_1000', label: 'Unter 1.000€' },
    { value: '1000_5000', label: '1.000€ - 5.000€' },
    { value: '5000_10000', label: '5.000€ - 10.000€' },
    { value: '10000_25000', label: '10.000€ - 25.000€' },
    { value: '25000_50000', label: '25.000€ - 50.000€' },
    { value: 'über_50000', label: 'Über 50.000€' },
  ];

  const serviceTypeOptions = [
    { value: 'vollplanung', label: 'Vollständige Planung' },
    { value: 'teilplanung', label: 'Teilplanung' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'koordination', label: 'Koordination am Event-Tag' },
    { value: 'location', label: 'Location-Suche' },
    { value: 'catering', label: 'Catering-Organisation' },
    { value: 'dekoration', label: 'Dekoration' },
    { value: 'unterhaltung', label: 'Unterhaltung' },
    { value: 'technik', label: 'Technik' },
    { value: 'logistik', label: 'Logistik' },
  ];

  const locationTypeOptions = [
    { value: 'hotel', label: 'Hotel' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'eventlocation', label: 'Event-Location' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'privat', label: 'Privat' },
    { value: 'kirche', label: 'Kirche' },
    { value: 'standesamt', label: 'Standesamt' },
    { value: 'büro', label: 'Büro' },
    { value: 'saal', label: 'Saal' },
    { value: 'zelt', label: 'Zelt' },
    { value: 'boot', label: 'Boot' },
    { value: 'andere', label: 'Andere' },
  ];

  const cateringTypeOptions = [
    { value: 'buffet', label: 'Buffet' },
    { value: 'menü', label: 'Menü' },
    { value: 'fingerfood', label: 'Fingerfood' },
    { value: 'bbq', label: 'BBQ' },
    { value: 'kaffee_kuchen', label: 'Kaffee & Kuchen' },
    { value: 'cocktail', label: 'Cocktail-Empfang' },
    { value: 'brunch', label: 'Brunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'street_food', label: 'Street Food' },
    { value: 'food_truck', label: 'Food Truck' },
    { value: 'andere', label: 'Andere' },
  ];

  const entertainmentOptions = [
    { value: 'band', label: 'Band' },
    { value: 'dj', label: 'DJ' },
    { value: 'comedian', label: 'Comedian' },
    { value: 'zauberer', label: 'Zauberer' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'tänzer', label: 'Tänzer' },
    { value: 'sänger', label: 'Sänger' },
    { value: 'artisten', label: 'Artisten' },
    { value: 'redner', label: 'Redner' },
    { value: 'karaoke', label: 'Karaoke' },
    { value: 'photo_booth', label: 'Photo Booth' },
    { value: 'spiele', label: 'Spiele' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'einladungen', label: 'Einladungen' },
    { value: 'drucksachen', label: 'Drucksachen' },
    { value: 'fotograf', label: 'Fotograf' },
    { value: 'videograf', label: 'Videograf' },
    { value: 'blumen', label: 'Blumen' },
    { value: 'transport', label: 'Transport' },
    { value: 'übernachtung', label: 'Übernachtung' },
    { value: 'security', label: 'Security' },
    { value: 'reinigung', label: 'Reinigung' },
    { value: 'versicherung', label: 'Versicherung' },
    { value: 'genehmigungen', label: 'Genehmigungen' },
    { value: 'kinderprogramm', label: 'Kinderprogramm' },
    { value: 'geschenke', label: 'Geschenke' },
    { value: 'giveaways', label: 'Giveaways' },
    { value: 'branding', label: 'Branding' },
  ];

  const specialRequirementsOptions = [
    { value: 'barrierefrei', label: 'Barrierefrei' },
    { value: 'vegetarisch', label: 'Vegetarisch' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'halal', label: 'Halal' },
    { value: 'koscher', label: 'Koscher' },
    { value: 'allergien', label: 'Allergien' },
    { value: 'kinder', label: 'Kinderfreundlich' },
    { value: 'raucher', label: 'Raucherbereich' },
    { value: 'parkplatz', label: 'Parkplatz' },
    { value: 'öpnv', label: 'ÖPNV-Anbindung' },
    { value: 'technik', label: 'Besondere Technik' },
    { value: 'sicherheit', label: 'Sicherheit' },
    { value: 'wetter', label: 'Wetterschutz' },
    { value: 'lautstärke', label: 'Lautstärke-Beschränkung' },
    { value: 'andere', label: 'Andere' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const handleInputChange = (field: keyof EventplanungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.eventType &&
      formData.eventSize &&
      formData.budgetRange &&
      formData.serviceType &&
      formData.locationType &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Event-Planungs-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Veranstaltung" required>
            <FormSelect
              value={formData.eventType || ''}
              onChange={value => handleInputChange('eventType', value)}
              options={eventTypeOptions}
              placeholder="Wählen Sie die Art der Veranstaltung"
            />
          </FormField>

          <FormField label="Größe der Veranstaltung" required>
            <FormSelect
              value={formData.eventSize || ''}
              onChange={value => handleInputChange('eventSize', value)}
              options={eventSizeOptions}
              placeholder="Wählen Sie die Größe"
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

          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Location-Typ" required>
            <FormSelect
              value={formData.locationType || ''}
              onChange={value => handleInputChange('locationType', value)}
              options={locationTypeOptions}
              placeholder="Wählen Sie den Location-Typ"
            />
          </FormField>

          <FormField label="Catering-Art">
            <FormSelect
              value={formData.cateringType || ''}
              onChange={value => handleInputChange('cateringType', value)}
              options={cateringTypeOptions}
              placeholder="Wählen Sie die Catering-Art"
            />
          </FormField>

          <FormField label="Anzahl Gäste">
            <FormInput
              type="text"
              value={formData.guestCount?.toString() || ''}
              onChange={value => handleInputChange('guestCount', value)}
              placeholder="Anzahl der Gäste"
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

          <FormField label="Bevorzugter Ort">
            <FormInput
              type="text"
              value={formData.preferredLocation || ''}
              onChange={value => handleInputChange('preferredLocation', value)}
              placeholder="Stadt oder Region"
            />
          </FormField>

          <FormField label="Anlass">
            <FormInput
              type="text"
              value={formData.occasion || ''}
              onChange={value => handleInputChange('occasion', value)}
              placeholder="Anlass der Veranstaltung"
            />
          </FormField>

          <FormField label="Thema/Motto">
            <FormInput
              type="text"
              value={formData.theme || ''}
              onChange={value => handleInputChange('theme', value)}
              placeholder="Thema oder Motto"
            />
          </FormField>

          <FormField label="Kleiderordnung">
            <FormInput
              type="text"
              value={formData.dressCode || ''}
              onChange={value => handleInputChange('dressCode', value)}
              placeholder="Kleiderordnung"
            />
          </FormField>

          <FormField label="Sprache">
            <FormInput
              type="text"
              value={formData.language || ''}
              onChange={value => handleInputChange('language', value)}
              placeholder="Sprache der Veranstaltung"
            />
          </FormField>

          <FormField label="Wetter-Backup">
            <FormInput
              type="text"
              value={formData.weatherBackup || ''}
              onChange={value => handleInputChange('weatherBackup', value)}
              placeholder="Plan bei schlechtem Wetter"
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

          <FormField label="Abbauzeit">
            <FormInput
              type="text"
              value={formData.teardownTime || ''}
              onChange={value => handleInputChange('teardownTime', value)}
              placeholder="Benötigte Abbauzeit"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Unterhaltung">
            <FormCheckboxGroup
              value={formData.entertainment || []}
              onChange={value => handleInputChange('entertainment', value)}
              options={entertainmentOptions}
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
          <FormField label="Besondere Anforderungen">
            <FormCheckboxGroup
              value={formData.specialRequirements || []}
              onChange={value => handleInputChange('specialRequirements', value)}
              options={specialRequirementsOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Event-Planungs-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zielgruppe">
            <FormTextarea
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Beschreibung der Zielgruppe"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Programm-Ablauf">
            <FormTextarea
              value={formData.programSchedule || ''}
              onChange={value => handleInputChange('programSchedule', value)}
              placeholder="Gewünschter Programm-Ablauf"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dekoration-Wünsche">
            <FormTextarea
              value={formData.decorationWishes || ''}
              onChange={value => handleInputChange('decorationWishes', value)}
              placeholder="Wünsche zur Dekoration"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Logistik-Anforderungen">
            <FormTextarea
              value={formData.logisticsRequirements || ''}
              onChange={value => handleInputChange('logisticsRequirements', value)}
              placeholder="Logistische Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorerfahrungen">
            <FormTextarea
              value={formData.previousExperiences || ''}
              onChange={value => handleInputChange('previousExperiences', value)}
              placeholder="Vorerfahrungen mit ähnlichen Events"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialWishes || ''}
              onChange={value => handleInputChange('specialWishes', value)}
              placeholder="Besondere Wünsche oder Ideen"
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
              options={urgencyOptions.map(option => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Outdoor/Indoor">
            <FormRadioGroup
              name="indoorOutdoor"
              value={formData.indoorOutdoor || ''}
              onChange={value => handleInputChange('indoorOutdoor', value)}
              options={[
                { value: 'indoor', label: 'Indoor' },
                { value: 'outdoor', label: 'Outdoor' },
                { value: 'beides', label: 'Beides möglich' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Alkohol gewünscht">
            <FormRadioGroup
              name="alcoholRequested"
              value={formData.alcoholRequested || ''}
              onChange={value => handleInputChange('alcoholRequested', value)}
              options={[
                { value: 'ja', label: 'Ja, Alkohol gewünscht' },
                { value: 'nein', label: 'Nein, alkoholfrei' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Fotografieren erlaubt">
            <FormRadioGroup
              name="photographyAllowed"
              value={formData.photographyAllowed || ''}
              onChange={value => handleInputChange('photographyAllowed', value)}
              options={[
                { value: 'ja', label: 'Ja, Fotografieren erlaubt' },
                { value: 'nein', label: 'Nein, keine Fotos' },
                { value: 'nach_absprache', label: 'Nach Absprache' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Geschenke/Giveaways">
            <FormRadioGroup
              name="giveaways"
              value={formData.giveaways || ''}
              onChange={value => handleInputChange('giveaways', value)}
              options={[
                { value: 'ja', label: 'Ja, Geschenke/Giveaways' },
                { value: 'nein', label: 'Nein, keine Geschenke' },
                { value: 'vielleicht', label: 'Vielleicht' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Nachhaltigkeit wichtig">
            <FormRadioGroup
              name="sustainabilityImportant"
              value={formData.sustainabilityImportant || ''}
              onChange={value => handleInputChange('sustainabilityImportant', value)}
              options={[
                { value: 'ja', label: 'Ja, Nachhaltigkeit wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise wichtig' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default EventplanungForm;
