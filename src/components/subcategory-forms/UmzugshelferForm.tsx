import React, { useState, useEffect } from 'react';
import { UmzugshelferData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface UmzugshelferFormProps {
  data: UmzugshelferData;
  onDataChange: (data: UmzugshelferData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const UmzugshelferForm: React.FC<UmzugshelferFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<UmzugshelferData>(data);

  const serviceTypeOptions = [
    { value: 'komplett_umzug', label: 'Komplettumzug' },
    { value: 'möbel_transport', label: 'Möbeltransport' },
    { value: 'verpackung', label: 'Verpackung' },
    { value: 'entpackung', label: 'Entpackung' },
    { value: 'montage', label: 'Möbelmontage' },
    { value: 'demontage', label: 'Möbeldemontage' },
    { value: 'reinigung', label: 'Reinigung' },
    { value: 'lagerung', label: 'Lagerung' },
    { value: 'transport', label: 'Transport' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'andere', label: 'Andere' },
  ];

  const moveTypeOptions = [
    { value: 'privatumzug', label: 'Privatumzug' },
    { value: 'büroumzug', label: 'Büroumzug' },
    { value: 'seniorenumzug', label: 'Seniorenumzug' },
    { value: 'studenten_umzug', label: 'Studentenumzug' },
    { value: 'fernumzug', label: 'Fernumzug' },
    { value: 'nahbereich', label: 'Nahbereich' },
    { value: 'international', label: 'International' },
    { value: 'notumzug', label: 'Notumzug' },
    { value: 'teilumzug', label: 'Teilumzug' },
    { value: 'lagerumzug', label: 'Lagerumzug' },
    { value: 'andere', label: 'Andere' },
  ];

  const householdSizeOptions = [
    { value: 'single', label: 'Single (1-2 Zimmer)' },
    { value: 'klein', label: 'Klein (2-3 Zimmer)' },
    { value: 'mittel', label: 'Mittel (3-4 Zimmer)' },
    { value: 'gross', label: 'Groß (4-5 Zimmer)' },
    { value: 'sehr_gross', label: 'Sehr groß (5+ Zimmer)' },
  ];

  const floorOptions = [
    { value: 'erdgeschoss', label: 'Erdgeschoss' },
    { value: '1_stock', label: '1. Stock' },
    { value: '2_stock', label: '2. Stock' },
    { value: '3_stock', label: '3. Stock' },
    { value: '4_stock', label: '4. Stock' },
    { value: '5_stock', label: '5+ Stock' },
  ];

  const elevatorOptions = [
    { value: 'ja', label: 'Ja, Aufzug vorhanden' },
    { value: 'nein', label: 'Nein, kein Aufzug' },
    { value: 'unbekannt', label: 'Unbekannt' },
  ];

  const distanceOptions = [
    { value: 'unter_10km', label: 'Unter 10 km' },
    { value: '10_50km', label: '10-50 km' },
    { value: '50_100km', label: '50-100 km' },
    { value: '100_300km', label: '100-300 km' },
    { value: '300_500km', label: '300-500 km' },
    { value: 'über_500km', label: 'Über 500 km' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_500', label: 'Unter 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2000', label: '1000€ - 2000€' },
    { value: '2000_5000', label: '2000€ - 5000€' },
    { value: '5000_10000', label: '5000€ - 10000€' },
    { value: 'über_10000', label: 'Über 10000€' },
  ];

  const vehicleTypeOptions = [
    { value: 'transporter', label: 'Transporter' },
    { value: 'lkw_35t', label: 'LKW 3,5t' },
    { value: 'lkw_75t', label: 'LKW 7,5t' },
    { value: 'lkw_12t', label: 'LKW 12t' },
    { value: 'lkw_18t', label: 'LKW 18t' },
    { value: 'sattelzug', label: 'Sattelzug' },
    { value: 'container', label: 'Container' },
    { value: 'andere', label: 'Andere' },
  ];

  const specialItemsOptions = [
    { value: 'klavier', label: 'Klavier' },
    { value: 'flügel', label: 'Flügel' },
    { value: 'tresor', label: 'Tresor' },
    { value: 'kunstwerke', label: 'Kunstwerke' },
    { value: 'antiquitäten', label: 'Antiquitäten' },
    { value: 'elektronik', label: 'Elektronik' },
    { value: 'aquarium', label: 'Aquarium' },
    { value: 'pflanzen', label: 'Pflanzen' },
    { value: 'weinsammlung', label: 'Weinsammlung' },
    { value: 'bücher', label: 'Bücher' },
    { value: 'waschmaschine', label: 'Waschmaschine' },
    { value: 'trockner', label: 'Trockner' },
    { value: 'kühlschrank', label: 'Kühlschrank' },
    { value: 'geschirrspüler', label: 'Geschirrspüler' },
    { value: 'herd', label: 'Herd' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'verpackung', label: 'Verpackung' },
    { value: 'entpackung', label: 'Entpackung' },
    { value: 'möbel_montage', label: 'Möbelmontage' },
    { value: 'möbel_demontage', label: 'Möbeldemontage' },
    { value: 'reinigung_alt', label: 'Reinigung alte Wohnung' },
    { value: 'reinigung_neu', label: 'Reinigung neue Wohnung' },
    { value: 'entrümpelung', label: 'Entrümpelung' },
    { value: 'entsorgung', label: 'Entsorgung' },
    { value: 'lagerung', label: 'Zwischenlagerung' },
    { value: 'halte_verbot', label: 'Halteverbot' },
    { value: 'versicherung', label: 'Versicherung' },
    { value: 'kartons', label: 'Kartons' },
    { value: 'verpackungsmaterial', label: 'Verpackungsmaterial' },
    { value: 'schutzfolien', label: 'Schutzfolien' },
    { value: 'polstermaterial', label: 'Polstermaterial' },
    { value: 'möbel_einlagerung', label: 'Möbeleinlagerung' },
    { value: 'zwischenlagerung', label: 'Zwischenlagerung' },
    { value: 'transport_versicherung', label: 'Transportversicherung' },
    { value: 'express_service', label: 'Express-Service' },
    { value: 'wochenend_service', label: 'Wochenend-Service' },
    { value: 'abend_service', label: 'Abend-Service' },
    { value: 'nacht_service', label: 'Nacht-Service' },
    { value: 'notumzug', label: 'Notumzug' },
    { value: 'teilumzug', label: 'Teilumzug' },
    { value: 'küchen_umzug', label: 'Küchen-Umzug' },
    { value: 'piano_transport', label: 'Piano-Transport' },
    { value: 'tresor_transport', label: 'Tresor-Transport' },
    { value: 'kunst_transport', label: 'Kunst-Transport' },
    { value: 'it_umzug', label: 'IT-Umzug' },
    { value: 'server_umzug', label: 'Server-Umzug' },
    { value: 'archiv_umzug', label: 'Archiv-Umzug' },
    { value: 'praxis_umzug', label: 'Praxis-Umzug' },
    { value: 'büro_umzug', label: 'Büro-Umzug' },
    { value: 'lager_umzug', label: 'Lager-Umzug' },
    { value: 'werkstatt_umzug', label: 'Werkstatt-Umzug' },
    { value: 'geschäft_umzug', label: 'Geschäft-Umzug' },
    { value: 'restaurant_umzug', label: 'Restaurant-Umzug' },
    { value: 'praxis_ausstattung', label: 'Praxis-Ausstattung' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'besichtigung', label: 'Besichtigung' },
    { value: 'kostenvoranschlag', label: 'Kostenvoranschlag' },
    { value: 'umzugsplanung', label: 'Umzugsplanung' },
    { value: 'checkliste', label: 'Checkliste' },
    { value: 'ummeldung', label: 'Ummeldung' },
    { value: 'adressänderung', label: 'Adressänderung' },
    { value: 'nachsendeauftrag', label: 'Nachsendeauftrag' },
    { value: 'versorgung_an', label: 'Versorgung anmelden' },
    { value: 'versorgung_ab', label: 'Versorgung abmelden' },
    { value: 'internet_ummeldung', label: 'Internet-Ummeldung' },
    { value: 'telefon_ummeldung', label: 'Telefon-Ummeldung' },
    { value: 'versicherung_ummeldung', label: 'Versicherung-Ummeldung' },
    { value: 'bank_ummeldung', label: 'Bank-Ummeldung' },
    { value: 'steuer_ummeldung', label: 'Steuer-Ummeldung' },
    { value: 'kfz_ummeldung', label: 'KFZ-Ummeldung' },
    { value: 'schule_ummeldung', label: 'Schule-Ummeldung' },
    { value: 'kita_ummeldung', label: 'Kita-Ummeldung' },
    { value: 'arzt_ummeldung', label: 'Arzt-Ummeldung' },
    { value: 'apotheke_ummeldung', label: 'Apotheke-Ummeldung' },
    { value: 'handwerker_koordination', label: 'Handwerker-Koordination' },
    { value: 'renovierung_koordination', label: 'Renovierung-Koordination' },
    { value: 'einrichtung_hilfe', label: 'Einrichtung-Hilfe' },
    { value: 'möbel_aufbau', label: 'Möbel-Aufbau' },
    { value: 'küche_aufbau', label: 'Küche-Aufbau' },
    { value: 'lampen_montage', label: 'Lampen-Montage' },
    { value: 'bilder_aufhängen', label: 'Bilder aufhängen' },
    { value: 'vorhänge_aufhängen', label: 'Vorhänge aufhängen' },
    { value: 'teppich_verlegen', label: 'Teppich verlegen' },
    { value: 'keller_räumen', label: 'Keller räumen' },
    { value: 'dachboden_räumen', label: 'Dachboden räumen' },
    { value: 'garage_räumen', label: 'Garage räumen' },
    { value: 'schuppen_räumen', label: 'Schuppen räumen' },
    { value: 'garten_räumen', label: 'Garten räumen' },
    { value: 'balkon_räumen', label: 'Balkon räumen' },
    { value: 'terrasse_räumen', label: 'Terrasse räumen' },
    { value: 'büro_räumen', label: 'Büro räumen' },
    { value: 'lager_räumen', label: 'Lager räumen' },
    { value: 'werkstatt_räumen', label: 'Werkstatt räumen' },
    { value: 'geschäft_räumen', label: 'Geschäft räumen' },
    { value: 'praxis_räumen', label: 'Praxis räumen' },
    { value: 'restaurant_räumen', label: 'Restaurant räumen' },
    { value: 'hotel_räumen', label: 'Hotel räumen' },
    { value: 'krankenhaus_räumen', label: 'Krankenhaus räumen' },
    { value: 'schule_räumen', label: 'Schule räumen' },
    { value: 'kita_räumen', label: 'Kita räumen' },
    { value: 'altenheim_räumen', label: 'Altenheim räumen' },
    { value: 'pflegeheim_räumen', label: 'Pflegeheim räumen' },
    { value: 'krankenstation_räumen', label: 'Krankenstation räumen' },
    { value: 'apotheke_räumen', label: 'Apotheke räumen' },
    { value: 'labor_räumen', label: 'Labor räumen' },
    { value: 'forschung_räumen', label: 'Forschung räumen' },
    { value: 'uni_räumen', label: 'Uni räumen' },
    { value: 'bibliothek_räumen', label: 'Bibliothek räumen' },
    { value: 'archiv_räumen', label: 'Archiv räumen' },
    { value: 'museum_räumen', label: 'Museum räumen' },
    { value: 'theater_räumen', label: 'Theater räumen' },
    { value: 'kino_räumen', label: 'Kino räumen' },
    { value: 'kirche_räumen', label: 'Kirche räumen' },
    { value: 'gemeinde_räumen', label: 'Gemeinde räumen' },
    { value: 'verein_räumen', label: 'Verein räumen' },
    { value: 'club_räumen', label: 'Club räumen' },
    { value: 'bar_räumen', label: 'Bar räumen' },
    { value: 'café_räumen', label: 'Café räumen' },
    { value: 'bäckerei_räumen', label: 'Bäckerei räumen' },
    { value: 'metzgerei_räumen', label: 'Metzgerei räumen' },
    { value: 'supermarkt_räumen', label: 'Supermarkt räumen' },
    { value: 'tankstelle_räumen', label: 'Tankstelle räumen' },
    { value: 'autowerkstatt_räumen', label: 'Autowerkstatt räumen' },
    { value: 'fahrradladen_räumen', label: 'Fahrradladen räumen' },
    { value: 'friseur_räumen', label: 'Friseur räumen' },
    { value: 'kosmetik_räumen', label: 'Kosmetik räumen' },
    { value: 'fitness_räumen', label: 'Fitness räumen' },
    { value: 'sauna_räumen', label: 'Sauna räumen' },
    { value: 'schwimmbad_räumen', label: 'Schwimmbad räumen' },
    { value: 'spielplatz_räumen', label: 'Spielplatz räumen' },
    { value: 'park_räumen', label: 'Park räumen' },
    { value: 'friedhof_räumen', label: 'Friedhof räumen' },
    { value: 'baustelle_räumen', label: 'Baustelle räumen' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof UmzugshelferData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.moveType &&
      formData.householdSize &&
      formData.fromAddress &&
      formData.toAddress &&
      formData.distance &&
      formData.urgency &&
      formData.budgetRange &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Umzugshelfer-Projektdetails
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

          <FormField label="Umzugsart" required>
            <FormSelect
              value={formData.moveType || ''}
              onChange={value => handleInputChange('moveType', value)}
              options={moveTypeOptions}
              placeholder="Wählen Sie die Umzugsart"
            />
          </FormField>

          <FormField label="Haushaltsgröße" required>
            <FormSelect
              value={formData.householdSize || ''}
              onChange={value => handleInputChange('householdSize', value)}
              options={householdSizeOptions}
              placeholder="Wählen Sie die Haushaltsgröße"
            />
          </FormField>

          <FormField label="Stockwerk (Auszug)" required>
            <FormSelect
              value={formData.fromFloor || ''}
              onChange={value => handleInputChange('fromFloor', value)}
              options={floorOptions}
              placeholder="Wählen Sie das Stockwerk"
            />
          </FormField>

          <FormField label="Stockwerk (Einzug)" required>
            <FormSelect
              value={formData.toFloor || ''}
              onChange={value => handleInputChange('toFloor', value)}
              options={floorOptions}
              placeholder="Wählen Sie das Stockwerk"
            />
          </FormField>

          <FormField label="Aufzug (Auszug)" required>
            <FormSelect
              value={formData.fromElevator || ''}
              onChange={value => handleInputChange('fromElevator', value)}
              options={elevatorOptions}
              placeholder="Aufzug vorhanden?"
            />
          </FormField>

          <FormField label="Aufzug (Einzug)" required>
            <FormSelect
              value={formData.toElevator || ''}
              onChange={value => handleInputChange('toElevator', value)}
              options={elevatorOptions}
              placeholder="Aufzug vorhanden?"
            />
          </FormField>

          <FormField label="Entfernung" required>
            <FormSelect
              value={formData.distance || ''}
              onChange={value => handleInputChange('distance', value)}
              options={distanceOptions}
              placeholder="Wählen Sie die Entfernung"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
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

          <FormField label="Fahrzeugtyp">
            <FormSelect
              value={formData.vehicleType || ''}
              onChange={value => handleInputChange('vehicleType', value)}
              options={vehicleTypeOptions}
              placeholder="Wählen Sie den Fahrzeugtyp"
            />
          </FormField>

          <FormField label="Anzahl Helfer">
            <FormInput
              type="number"
              value={formData.numberOfHelpers?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfHelpers',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Helfer"
            />
          </FormField>

          <FormField label="Gewünschtes Datum">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschte Uhrzeit">
            <FormInput
              type="text"
              value={formData.preferredTime || ''}
              onChange={value => handleInputChange('preferredTime', value)}
              placeholder="HH:MM"
            />
          </FormField>

          <FormField label="Geschätzte Dauer">
            <FormInput
              type="text"
              value={formData.estimatedDuration || ''}
              onChange={value => handleInputChange('estimatedDuration', value)}
              placeholder="Stunden"
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

          <FormField label="Kubikmeter">
            <FormInput
              type="number"
              value={formData.cubicMeters?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'cubicMeters',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Kubikmeter"
            />
          </FormField>

          <FormField label="Anzahl Kartons">
            <FormInput
              type="number"
              value={formData.numberOfBoxes?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfBoxes',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Kartons"
            />
          </FormField>

          <FormField label="Anzahl Möbelstücke">
            <FormInput
              type="number"
              value={formData.numberOfFurniture?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfFurniture',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Möbelstücke"
            />
          </FormField>

          <FormField label="Parkplatz (Auszug)">
            <FormRadioGroup
              name="fromParking"
              value={formData.fromParking || ''}
              onChange={value => handleInputChange('fromParking', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>

          <FormField label="Parkplatz (Einzug)">
            <FormRadioGroup
              name="toParking"
              value={formData.toParking || ''}
              onChange={value => handleInputChange('toParking', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Gegenstände">
            <FormCheckboxGroup
              value={formData.specialItems || []}
              onChange={value => handleInputChange('specialItems', value)}
              options={specialItemsOptions}
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
          <FormField label="Beschreibung" required>
            <FormTextarea
              value={formData.description || ''}
              onChange={value => handleInputChange('description', value)}
              placeholder="Beschreiben Sie Ihren Umzug detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugangshinweise">
            <FormTextarea
              value={formData.accessInstructions || ''}
              onChange={value => handleInputChange('accessInstructions', value)}
              placeholder="Hinweise zum Zugang oder zur Anfahrt"
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
          <FormField label="Versicherung gewünscht">
            <FormRadioGroup
              name="insurance"
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              options={[
                { value: 'ja', label: 'Ja, Versicherung gewünscht' },
                { value: 'nein', label: 'Nein, keine Versicherung' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kostenvoranschlag gewünscht">
            <FormRadioGroup
              name="estimate"
              value={formData.estimate || ''}
              onChange={value => handleInputChange('estimate', value)}
              options={[
                { value: 'ja', label: 'Ja, Kostenvoranschlag gewünscht' },
                { value: 'nein', label: 'Nein, direkt beauftragen' },
                { value: 'abhängig', label: 'Abhängig von Kosten' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Eigenleistung möglich">
            <FormRadioGroup
              name="selfWork"
              value={formData.selfWork || ''}
              onChange={value => handleInputChange('selfWork', value)}
              options={[
                { value: 'ja', label: 'Ja, Eigenleistung möglich' },
                { value: 'nein', label: 'Nein, Vollservice' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewerblich">
            <FormRadioGroup
              name="commercial"
              value={formData.commercial || ''}
              onChange={value => handleInputChange('commercial', value)}
              options={[
                { value: 'ja', label: 'Ja, gewerblich' },
                { value: 'nein', label: 'Nein, privat' },
                { value: 'gemischt', label: 'Gemischt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Notfall">
            <FormRadioGroup
              name="emergency"
              value={formData.emergency || ''}
              onChange={value => handleInputChange('emergency', value)}
              options={[
                { value: 'ja', label: 'Ja, Notfall' },
                { value: 'nein', label: 'Nein, kein Notfall' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Flexibilität">
            <FormRadioGroup
              name="flexibility"
              value={formData.flexibility || ''}
              onChange={value => handleInputChange('flexibility', value)}
              options={[
                { value: 'hoch', label: 'Hoch' },
                { value: 'mittel', label: 'Mittel' },
                { value: 'niedrig', label: 'Niedrig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Halteverbot benötigt">
            <FormRadioGroup
              name="parkingPermit"
              value={formData.parkingPermit || ''}
              onChange={value => handleInputChange('parkingPermit', value)}
              options={[
                { value: 'ja', label: 'Ja, Halteverbot benötigt' },
                { value: 'nein', label: 'Nein, nicht benötigt' },
                { value: 'organisiert', label: 'Bereits organisiert' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Material vorhanden">
            <FormRadioGroup
              name="materialAvailable"
              value={formData.materialAvailable || ''}
              onChange={value => handleInputChange('materialAvailable', value)}
              options={[
                { value: 'ja', label: 'Ja, Material vorhanden' },
                { value: 'nein', label: 'Nein, Material benötigt' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Werkzeug vorhanden">
            <FormRadioGroup
              name="toolsAvailable"
              value={formData.toolsAvailable || ''}
              onChange={value => handleInputChange('toolsAvailable', value)}
              options={[
                { value: 'ja', label: 'Ja, Werkzeug vorhanden' },
                { value: 'nein', label: 'Nein, Werkzeug benötigt' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Terminflexibilität">
            <FormRadioGroup
              name="dateFlexibility"
              value={formData.dateFlexibility || ''}
              onChange={value => handleInputChange('dateFlexibility', value)}
              options={[
                { value: 'hoch', label: 'Hoch' },
                { value: 'mittel', label: 'Mittel' },
                { value: 'niedrig', label: 'Niedrig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zeitflexibilität">
            <FormRadioGroup
              name="timeFlexibility"
              value={formData.timeFlexibility || ''}
              onChange={value => handleInputChange('timeFlexibility', value)}
              options={[
                { value: 'hoch', label: 'Hoch' },
                { value: 'mittel', label: 'Mittel' },
                { value: 'niedrig', label: 'Niedrig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wetterbedingungen">
            <FormRadioGroup
              name="weatherConditions"
              value={formData.weatherConditions || ''}
              onChange={value => handleInputChange('weatherConditions', value)}
              options={[
                { value: 'egal', label: 'Egal' },
                { value: 'schönwetter', label: 'Nur bei schönem Wetter' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wiederholungsumzug">
            <FormRadioGroup
              name="repeatCustomer"
              value={formData.repeatCustomer || ''}
              onChange={value => handleInputChange('repeatCustomer', value)}
              options={[
                { value: 'ja', label: 'Ja, Wiederholungsumzug' },
                { value: 'nein', label: 'Nein, erstmalig' },
                { value: 'möglich', label: 'Möglich' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Empfehlung">
            <FormRadioGroup
              name="recommendation"
              value={formData.recommendation || ''}
              onChange={value => handleInputChange('recommendation', value)}
              options={[
                { value: 'ja', label: 'Ja, empfohlen' },
                { value: 'nein', label: 'Nein, nicht empfohlen' },
                { value: 'recherche', label: 'Eigene Recherche' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualität wichtig">
            <FormRadioGroup
              name="qualityImportant"
              value={formData.qualityImportant || ''}
              onChange={value => handleInputChange('qualityImportant', value)}
              options={[
                { value: 'ja', label: 'Ja, Qualität wichtig' },
                { value: 'nein', label: 'Nein, Preis wichtig' },
                { value: 'ausgewogen', label: 'Ausgewogen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Preis wichtig">
            <FormRadioGroup
              name="priceImportant"
              value={formData.priceImportant || ''}
              onChange={value => handleInputChange('priceImportant', value)}
              options={[
                { value: 'ja', label: 'Ja, Preis wichtig' },
                { value: 'nein', label: 'Nein, Qualität wichtig' },
                { value: 'ausgewogen', label: 'Ausgewogen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Schnelligkeit wichtig">
            <FormRadioGroup
              name="speedImportant"
              value={formData.speedImportant || ''}
              onChange={value => handleInputChange('speedImportant', value)}
              options={[
                { value: 'ja', label: 'Ja, Schnelligkeit wichtig' },
                { value: 'nein', label: 'Nein, Gründlichkeit wichtig' },
                { value: 'ausgewogen', label: 'Ausgewogen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sicherheit wichtig">
            <FormRadioGroup
              name="safetyImportant"
              value={formData.safetyImportant || ''}
              onChange={value => handleInputChange('safetyImportant', value)}
              options={[
                { value: 'ja', label: 'Ja, Sicherheit wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'standard', label: 'Standard' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Umweltfreundlichkeit wichtig">
            <FormRadioGroup
              name="environmentallyFriendly"
              value={formData.environmentallyFriendly || ''}
              onChange={value => handleInputChange('environmentallyFriendly', value)}
              options={[
                { value: 'ja', label: 'Ja, umweltfreundlich' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Familienfreundlichkeit wichtig">
            <FormRadioGroup
              name="familyFriendly"
              value={formData.familyFriendly || ''}
              onChange={value => handleInputChange('familyFriendly', value)}
              options={[
                { value: 'ja', label: 'Ja, familienfreundlich' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Seniorenfreundlichkeit wichtig">
            <FormRadioGroup
              name="seniorFriendly"
              value={formData.seniorFriendly || ''}
              onChange={value => handleInputChange('seniorFriendly', value)}
              options={[
                { value: 'ja', label: 'Ja, seniorenfreundlich' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Studenten-/Auszubildendenfreundlichkeit wichtig">
            <FormRadioGroup
              name="studentFriendly"
              value={formData.studentFriendly || ''}
              onChange={value => handleInputChange('studentFriendly', value)}
              options={[
                { value: 'ja', label: 'Ja, studenten-/auszubildendenfreundlich' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Behindertenfreundlichkeit wichtig">
            <FormRadioGroup
              name="disabilityFriendly"
              value={formData.disabilityFriendly || ''}
              onChange={value => handleInputChange('disabilityFriendly', value)}
              options={[
                { value: 'ja', label: 'Ja, behindertenfreundlich' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Tierfreundlichkeit wichtig">
            <FormRadioGroup
              name="petFriendly"
              value={formData.petFriendly || ''}
              onChange={value => handleInputChange('petFriendly', value)}
              options={[
                { value: 'ja', label: 'Ja, tierfreundlich' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vegetarisch/Vegan wichtig">
            <FormRadioGroup
              name="vegetarianVegan"
              value={formData.vegetarianVegan || ''}
              onChange={value => handleInputChange('vegetarianVegan', value)}
              options={[
                { value: 'ja', label: 'Ja, vegetarisch/vegan' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lokale Unterstützung wichtig">
            <FormRadioGroup
              name="localSupport"
              value={formData.localSupport || ''}
              onChange={value => handleInputChange('localSupport', value)}
              options={[
                { value: 'ja', label: 'Ja, lokale Unterstützung' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Regionale Verfügbarkeit wichtig">
            <FormRadioGroup
              name="regionalAvailability"
              value={formData.regionalAvailability || ''}
              onChange={value => handleInputChange('regionalAvailability', value)}
              options={[
                { value: 'ja', label: 'Ja, regional verfügbar' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Überregionale Verfügbarkeit wichtig">
            <FormRadioGroup
              name="nationalAvailability"
              value={formData.nationalAvailability || ''}
              onChange={value => handleInputChange('nationalAvailability', value)}
              options={[
                { value: 'ja', label: 'Ja, überregional verfügbar' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Internationale Verfügbarkeit wichtig">
            <FormRadioGroup
              name="internationalAvailability"
              value={formData.internationalAvailability || ''}
              onChange={value => handleInputChange('internationalAvailability', value)}
              options={[
                { value: 'ja', label: 'Ja, international verfügbar' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="24/7 Verfügbarkeit wichtig">
            <FormRadioGroup
              name="availability24_7"
              value={formData.availability24_7 || ''}
              onChange={value => handleInputChange('availability24_7', value)}
              options={[
                { value: 'ja', label: 'Ja, 24/7 verfügbar' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wochenend-Verfügbarkeit wichtig">
            <FormRadioGroup
              name="weekendAvailability"
              value={formData.weekendAvailability || ''}
              onChange={value => handleInputChange('weekendAvailability', value)}
              options={[
                { value: 'ja', label: 'Ja, am Wochenende verfügbar' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Feiertag-Verfügbarkeit wichtig">
            <FormRadioGroup
              name="holidayAvailability"
              value={formData.holidayAvailability || ''}
              onChange={value => handleInputChange('holidayAvailability', value)}
              options={[
                { value: 'ja', label: 'Ja, an Feiertagen verfügbar' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Notdienst-Verfügbarkeit wichtig">
            <FormRadioGroup
              name="emergencyAvailability"
              value={formData.emergencyAvailability || ''}
              onChange={value => handleInputChange('emergencyAvailability', value)}
              options={[
                { value: 'ja', label: 'Ja, Notdienst verfügbar' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sprachkenntnisse wichtig">
            <FormRadioGroup
              name="languageSkills"
              value={formData.languageSkills || ''}
              onChange={value => handleInputChange('languageSkills', value)}
              options={[
                { value: 'ja', label: 'Ja, Sprachkenntnisse wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Referenzen wichtig">
            <FormRadioGroup
              name="references"
              value={formData.references || ''}
              onChange={value => handleInputChange('references', value)}
              options={[
                { value: 'ja', label: 'Ja, Referenzen wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zertifizierungen wichtig">
            <FormRadioGroup
              name="certifications"
              value={formData.certifications || ''}
              onChange={value => handleInputChange('certifications', value)}
              options={[
                { value: 'ja', label: 'Ja, Zertifizierungen wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung wichtig">
            <FormRadioGroup
              name="experience"
              value={formData.experience || ''}
              onChange={value => handleInputChange('experience', value)}
              options={[
                { value: 'ja', label: 'Ja, Erfahrung wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bewertungen wichtig">
            <FormRadioGroup
              name="reviews"
              value={formData.reviews || ''}
              onChange={value => handleInputChange('reviews', value)}
              options={[
                { value: 'ja', label: 'Ja, Bewertungen wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default UmzugshelferForm;
