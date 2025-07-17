import React, { useState, useEffect } from 'react';
import { SicherheitsdienstData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface SicherheitsdienstFormProps {
  data: SicherheitsdienstData;
  onDataChange: (data: SicherheitsdienstData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SicherheitsdienstForm: React.FC<SicherheitsdienstFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SicherheitsdienstData>(data);

  const serviceTypeOptions = [
    { value: 'objektschutz', label: 'Objektschutz' },
    { value: 'personenschutz', label: 'Personenschutz' },
    { value: 'veranstaltungsschutz', label: 'Veranstaltungsschutz' },
    { value: 'werkschutz', label: 'Werkschutz' },
    { value: 'revierdienst', label: 'Revierdienst' },
    { value: 'streifendienst', label: 'Streifendienst' },
    { value: 'pfortnerdienst', label: 'Pförtnerdienst' },
    { value: 'empfangsdienst', label: 'Empfangsdienst' },
    { value: 'videoüberwachung', label: 'Videoüberwachung' },
    { value: 'alarmverfolgung', label: 'Alarmverfolgung' },
    { value: 'geld_werttransport', label: 'Geld- und Werttransport' },
    { value: 'ladendetektiv', label: 'Ladendetektiv' },
    { value: 'baustelle_bewachung', label: 'Baustellen-Bewachung' },
    { value: 'flughafen_sicherheit', label: 'Flughafen-Sicherheit' },
    { value: 'maritime_sicherheit', label: 'Maritime Sicherheit' },
    { value: 'cyber_security', label: 'Cyber Security' },
    { value: 'brandschutz', label: 'Brandschutz' },
    { value: 'notruf_leitstelle', label: 'Notruf-Leitstelle' },
    { value: 'sicherheitsberatung', label: 'Sicherheitsberatung' },
    { value: 'krisenmanagement', label: 'Krisenmanagement' },
    { value: 'bodyguard', label: 'Bodyguard' },
    { value: 'andere', label: 'Andere' },
  ];

  const securityLevelOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'erhöht', label: 'Erhöht' },
    { value: 'hoch', label: 'Hoch' },
    { value: 'sehr_hoch', label: 'Sehr hoch' },
  ];
  const locationTypeOptions = [
    { value: 'bürogebäude', label: 'Bürogebäude' },
    { value: 'wohnanlage', label: 'Wohnanlage' },
    { value: 'einzelhandel', label: 'Einzelhandel' },
    { value: 'industrie', label: 'Industrieanlage' },
    { value: 'baustelle', label: 'Baustelle' },
    { value: 'veranstaltung', label: 'Veranstaltung' },
    { value: 'krankenhaus', label: 'Krankenhaus' },
    { value: 'schule', label: 'Schule' },
    { value: 'flughafen', label: 'Flughafen' },
    { value: 'bahnhof', label: 'Bahnhof' },
    { value: 'bank', label: 'Bank' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'museum', label: 'Museum' },
    { value: 'kirchliche_einrichtung', label: 'Kirchliche Einrichtung' },
    { value: 'andere', label: 'Andere' },
  ];

  const shiftTypeOptions = [
    { value: 'tagdienst', label: 'Tagdienst' },
    { value: 'nachtdienst', label: 'Nachtdienst' },
    { value: 'wechselschicht', label: 'Wechselschicht' },
    { value: 'bereitschaftsdienst', label: 'Bereitschaftsdienst' },
    { value: 'dauerdienst', label: 'Dauerdienst' },
    { value: 'bedarfsdienst', label: 'Bedarfsdienst' },
  ];

  const durationOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'tage', label: 'Wenige Tage' },
    { value: 'wochen', label: 'Wenige Wochen' },
    { value: 'monate', label: 'Wenige Monate' },
    { value: 'jahr', label: 'Ein Jahr' },
    { value: 'langfristig', label: 'Langfristig' },
    { value: 'unbefristet', label: 'Unbefristet' },
  ];

  const numberOfGuardsOptions = [
    { value: '1', label: '1 Person' },
    { value: '2', label: '2 Personen' },
    { value: '3_5', label: '3-5 Personen' },
    { value: '6_10', label: '6-10 Personen' },
    { value: '11_20', label: '11-20 Personen' },
    { value: 'über_20', label: 'Über 20 Personen' },
  ];

  const qualificationOptions = [
    { value: 'grundausbildung', label: 'Grundausbildung' },
    { value: 'sachkundeprüfung', label: 'Sachkundeprüfung (§34a GewO)' },
    { value: 'geprüfte_schutz_sicherheitskraft', label: 'Geprüfte Schutz- und Sicherheitskraft' },
    { value: 'meister', label: 'Meister für Schutz und Sicherheit' },
    { value: 'spezialausbildung', label: 'Spezialausbildung' },
    { value: 'waffenschein', label: 'Waffenschein' },
    { value: 'erste_hilfe', label: 'Erste Hilfe' },
    { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
    { value: 'andere', label: 'Andere' },
  ];

  const equipmentOptions = [
    { value: 'uniform', label: 'Uniform' },
    { value: 'sicherheitsweste', label: 'Sicherheitsweste' },
    { value: 'funkgerät', label: 'Funkgerät' },
    { value: 'taschenlampe', label: 'Taschenlampe' },
    { value: 'schlagstock', label: 'Schlagstock' },
    { value: 'pfefferspray', label: 'Pfefferspray' },
    { value: 'handfesseln', label: 'Handfesseln' },
    { value: 'schutzweste', label: 'Schutzweste' },
    { value: 'helm', label: 'Helm' },
    { value: 'sicherheitsschuhe', label: 'Sicherheitsschuhe' },
    { value: 'handschuhe', label: 'Handschuhe' },
    { value: 'warnweste', label: 'Warnweste' },
    { value: 'kamera', label: 'Kamera' },
    { value: 'dokumentation', label: 'Dokumentationsgeräte' },
    { value: 'fahrzeug', label: 'Fahrzeug' },
    { value: 'hund', label: 'Diensthund' },
    { value: 'andere', label: 'Andere' },
  ];

  const specialServicesOptions = [
    { value: 'hundeführer', label: 'Hundeführer' },
    { value: 'sprengstoff_spürhund', label: 'Sprengstoff-Spürhund' },
    { value: 'drogen_spürhund', label: 'Drogen-Spürhund' },
    { value: 'brandschutz', label: 'Brandschutz' },
    { value: 'erste_hilfe', label: 'Erste Hilfe' },
    { value: 'deeskalation', label: 'Deeskalation' },
    { value: 'konfliktmanagement', label: 'Konfliktmanagement' },
    { value: 'crowd_control', label: 'Crowd Control' },
    { value: 'vip_schutz', label: 'VIP-Schutz' },
    { value: 'nahkampf', label: 'Nahkampf' },
    { value: 'selbstverteidigung', label: 'Selbstverteidigung' },
    { value: 'observation', label: 'Observation' },
    { value: 'surveillance', label: 'Surveillance' },
    { value: 'ermittlung', label: 'Ermittlung' },
    { value: 'dokumentation', label: 'Dokumentation' },
    { value: 'protokollierung', label: 'Protokollierung' },
    { value: 'berichterstattung', label: 'Berichterstattung' },
    { value: 'kommunikation', label: 'Kommunikation' },
    { value: 'mehrsprachig', label: 'Mehrsprachig' },
    { value: 'it_kenntnisse', label: 'IT-Kenntnisse' },
    { value: 'technik_bedienung', label: 'Technik-Bedienung' },
    { value: 'überwachungstechnik', label: 'Überwachungstechnik' },
    { value: 'alarmanlagen', label: 'Alarmanlagen' },
    { value: 'zutrittskontrolle', label: 'Zutrittskontrolle' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'sicherheitsanalyse', label: 'Sicherheitsanalyse' },
    { value: 'risikobeurteilung', label: 'Risikobeurteilung' },
    { value: 'sicherheitskonzept', label: 'Sicherheitskonzept' },
    { value: 'notfallplan', label: 'Notfallplan' },
    { value: 'evakuierungsplan', label: 'Evakuierungsplan' },
    { value: 'brandschutzordnung', label: 'Brandschutzordnung' },
    { value: 'sicherheitsschulung', label: 'Sicherheitsschulung' },
    { value: 'mitarbeiterschulung', label: 'Mitarbeiterschulung' },
    { value: 'brandschutzschulung', label: 'Brandschutzschulung' },
    { value: 'erste_hilfe_kurs', label: 'Erste-Hilfe-Kurs' },
    { value: 'sicherheitsberatung', label: 'Sicherheitsberatung' },
    { value: 'technik_beratung', label: 'Technik-Beratung' },
    { value: 'installation', label: 'Installation' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'instandhaltung', label: 'Instandhaltung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'überwachung', label: 'Überwachung' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'fernüberwachung', label: 'Fernüberwachung' },
    { value: 'videoanalyse', label: 'Videoanalyse' },
    { value: 'movement_detection', label: 'Movement Detection' },
    { value: 'gesichtserkennung', label: 'Gesichtserkennung' },
    { value: 'kennzeichenerkennung', label: 'Kennzeichenerkennung' },
    { value: 'zutrittskontrolle', label: 'Zutrittskontrolle' },
    { value: 'zeiterfassung', label: 'Zeiterfassung' },
    { value: 'besucherverwaltung', label: 'Besucherverwaltung' },
    { value: 'parkplatzmanagement', label: 'Parkplatzmanagement' },
    { value: 'objektverwaltung', label: 'Objektverwaltung' },
    { value: 'facility_management', label: 'Facility Management' },
    { value: 'cleaning_service', label: 'Cleaning Service' },
    { value: 'hausmeisterdienst', label: 'Hausmeisterdienst' },
    { value: 'empfangsdienst', label: 'Empfangsdienst' },
    { value: 'telefonservice', label: 'Telefonservice' },
    { value: 'post_verwaltung', label: 'Post-Verwaltung' },
    { value: 'schlüsseldienst', label: 'Schlüsseldienst' },
    { value: 'schlossdienst', label: 'Schlossdienst' },
    { value: 'pannenservice', label: 'Pannenservice' },
    { value: 'winterdienst', label: 'Winterdienst' },
    { value: 'gartenservice', label: 'Gartenservice' },
    { value: 'reinigungsservice', label: 'Reinigungsservice' },
    { value: 'transportservice', label: 'Transportservice' },
    { value: 'kurierservice', label: 'Kurierservice' },
    { value: 'logistik', label: 'Logistik' },
    { value: 'lagerung', label: 'Lagerung' },
    { value: 'archivierung', label: 'Archivierung' },
    { value: 'dokumentation', label: 'Dokumentation' },
    { value: 'berichtswesen', label: 'Berichtswesen' },
    { value: 'statistik', label: 'Statistik' },
    { value: 'qualitätskontrolle', label: 'Qualitätskontrolle' },
    { value: 'audit', label: 'Audit' },
    { value: 'zertifizierung', label: 'Zertifizierung' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'datenschutz', label: 'Datenschutz' },
    { value: 'informationssicherheit', label: 'Informationssicherheit' },
    { value: 'cyber_security', label: 'Cyber Security' },
    { value: 'penetration_testing', label: 'Penetration Testing' },
    { value: 'vulnerability_assessment', label: 'Vulnerability Assessment' },
    { value: 'security_awareness', label: 'Security Awareness' },
    { value: 'incident_response', label: 'Incident Response' },
    { value: 'forensik', label: 'Forensik' },
    { value: 'ermittlung', label: 'Ermittlung' },
    { value: 'aufklärung', label: 'Aufklärung' },
    { value: 'prävention', label: 'Prävention' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof SicherheitsdienstData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.securityLevel &&
      formData.locationType &&
      formData.shiftType &&
      formData.duration &&
      formData.numberOfGuards &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sicherheitsdienst-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Sicherheitsdienstes" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Sicherheitsdienstes"
            />
          </FormField>

          <FormField label="Sicherheitslevel" required>
            <FormSelect
              value={formData.securityLevel || ''}
              onChange={value => handleInputChange('securityLevel', value)}
              options={securityLevelOptions}
              placeholder="Wählen Sie das Sicherheitslevel"
            />
          </FormField>

          <FormField label="Objekt-Typ" required>
            <FormSelect
              value={formData.locationType || ''}
              onChange={value => handleInputChange('locationType', value)}
              options={locationTypeOptions}
              placeholder="Wählen Sie den Objekt-Typ"
            />
          </FormField>

          <FormField label="Schichtart" required>
            <FormSelect
              value={formData.shiftType || ''}
              onChange={value => handleInputChange('shiftType', value)}
              options={shiftTypeOptions}
              placeholder="Wählen Sie die Schichtart"
            />
          </FormField>

          <FormField label="Einsatzdauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Einsatzdauer"
            />
          </FormField>

          <FormField label="Anzahl Sicherheitskräfte" required>
            <FormSelect
              value={formData.numberOfGuards || ''}
              onChange={value => handleInputChange('numberOfGuards', value)}
              options={numberOfGuardsOptions}
              placeholder="Wählen Sie die Anzahl"
            />
          </FormField>

          <FormField label="Gewünschter Starttermin">
            <FormInput
              type="text"
              value={formData.preferredStartDate || ''}
              onChange={value => handleInputChange('preferredStartDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschter Endtermin">
            <FormInput
              type="text"
              value={formData.preferredEndDate || ''}
              onChange={value => handleInputChange('preferredEndDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
          <FormField label="Adresse">
            <FormInput
              type="text"
              value={formData.address || ''}
              onChange={value => handleInputChange('address', value)}
              placeholder="Adresse des Objekts"
            />
          </FormField>

          <FormField label="Objektgröße">
            <FormInput
              type="text"
              value={formData.objectSize || ''}
              onChange={value => handleInputChange('objectSize', value)}
              placeholder="Größe des Objekts (m²)"
            />
          </FormField>

          <FormField label="Stockwerke">
            <FormInput
              type="text"
              value={formData.floors || ''}
              onChange={value => handleInputChange('floors', value)}
              placeholder="Anzahl Stockwerke"
            />
          </FormField>

          <FormField label="Zugänge">
            <FormInput
              type="text"
              value={formData.entrances || ''}
              onChange={value => handleInputChange('entrances', value)}
              placeholder="Anzahl Eingänge/Ausgänge"
            />
          </FormField>

          <FormField label="Mitarbeiteranzahl">
            <FormInput
              type="text"
              value={formData.employeeCount || ''}
              onChange={value => handleInputChange('employeeCount', value)}
              placeholder="Anzahl Mitarbeiter im Objekt"
            />
          </FormField>

          <FormField label="Besucherfrequenz">
            <FormInput
              type="text"
              value={formData.visitorFrequency || ''}
              onChange={value => handleInputChange('visitorFrequency', value)}
              placeholder="Besucherfrequenz pro Tag"
            />
          </FormField>

          <FormField label="Öffnungszeiten">
            <FormInput
              type="text"
              value={formData.operatingHours || ''}
              onChange={value => handleInputChange('operatingHours', value)}
              placeholder="Öffnungszeiten"
            />
          </FormField>

          <FormField label="Einsatzzeiten">
            <FormInput
              type="text"
              value={formData.workingHours || ''}
              onChange={value => handleInputChange('workingHours', value)}
              placeholder="Gewünschte Einsatzzeiten"
            />
          </FormField>

          <FormField label="Besondere Bereiche">
            <FormInput
              type="text"
              value={formData.specialAreas || ''}
              onChange={value => handleInputChange('specialAreas', value)}
              placeholder="Besondere zu überwachende Bereiche"
            />
          </FormField>

          <FormField label="Wertgegenstände">
            <FormInput
              type="text"
              value={formData.valuables || ''}
              onChange={value => handleInputChange('valuables', value)}
              placeholder="Wertgegenstände im Objekt"
            />
          </FormField>

          <FormField label="Gefahrenstoffe">
            <FormInput
              type="text"
              value={formData.hazardousMaterials || ''}
              onChange={value => handleInputChange('hazardousMaterials', value)}
              placeholder="Gefahrenstoffe oder besondere Risiken"
            />
          </FormField>

          <FormField label="Vorhandene Sicherheitstechnik">
            <FormInput
              type="text"
              value={formData.existingSecurity || ''}
              onChange={value => handleInputChange('existingSecurity', value)}
              placeholder="Vorhandene Sicherheitstechnik"
            />
          </FormField>

          <FormField label="Bewaffnung erforderlich">
            <FormRadioGroup
              name="armedService"
              value={formData.armedService || ''}
              onChange={value => handleInputChange('armedService', value)}
              options={[
                { value: 'ja', label: 'Ja, bewaffnet' },
                { value: 'nein', label: 'Nein, unbewaffnet' },
                { value: 'teilweise', label: 'Teilweise bewaffnet' },
              ]}
            />
          </FormField>

          <FormField label="Uniformierung gewünscht">
            <FormRadioGroup
              name="uniformed"
              value={formData.uniformed || ''}
              onChange={value => handleInputChange('uniformed', value)}
              options={[
                { value: 'ja', label: 'Ja, uniformiert' },
                { value: 'nein', label: 'Nein, zivil' },
                { value: 'teilweise', label: 'Teilweise uniformiert' },
              ]}
            />
          </FormField>

          <FormField label="Diensthund gewünscht">
            <FormRadioGroup
              name="dogService"
              value={formData.dogService || ''}
              onChange={value => handleInputChange('dogService', value)}
              options={[
                { value: 'ja', label: 'Ja, Diensthund gewünscht' },
                { value: 'nein', label: 'Nein, kein Diensthund' },
                { value: 'spürhund', label: 'Spürhund' },
                { value: 'schutzhund', label: 'Schutzhund' },
              ]}
            />
          </FormField>

          <FormField label="Fahrzeug erforderlich">
            <FormRadioGroup
              name="vehicleRequired"
              value={formData.vehicleRequired || ''}
              onChange={value => handleInputChange('vehicleRequired', value)}
              options={[
                { value: 'ja', label: 'Ja, Fahrzeug erforderlich' },
                { value: 'nein', label: 'Nein, kein Fahrzeug' },
                { value: 'streifenwagen', label: 'Streifenwagen' },
                { value: 'motorrad', label: 'Motorrad' },
              ]}
            />
          </FormField>

          <FormField label="Weiterbildung erforderlich">
            <FormRadioGroup
              name="trainingRequired"
              value={formData.trainingRequired || ''}
              onChange={value => handleInputChange('trainingRequired', value)}
              options={[
                { value: 'ja', label: 'Ja, Weiterbildung erforderlich' },
                { value: 'nein', label: 'Nein, keine Weiterbildung' },
                { value: 'objektspezifisch', label: 'Objektspezifische Einweisung' },
              ]}
            />
          </FormField>

          <FormField label="Notfallplan vorhanden">
            <FormRadioGroup
              name="emergencyPlan"
              value={formData.emergencyPlan || ''}
              onChange={value => handleInputChange('emergencyPlan', value)}
              options={[
                { value: 'ja', label: 'Ja, Notfallplan vorhanden' },
                { value: 'nein', label: 'Nein, kein Notfallplan' },
                { value: 'erstellen', label: 'Erstellen erforderlich' },
              ]}
            />
          </FormField>

          <FormField label="Brandschutz erforderlich">
            <FormRadioGroup
              name="fireProtection"
              value={formData.fireProtection || ''}
              onChange={value => handleInputChange('fireProtection', value)}
              options={[
                { value: 'ja', label: 'Ja, Brandschutz erforderlich' },
                { value: 'nein', label: 'Nein, kein Brandschutz' },
                { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
              ]}
            />
          </FormField>

          <FormField label="Erste Hilfe erforderlich">
            <FormRadioGroup
              name="firstAid"
              value={formData.firstAid || ''}
              onChange={value => handleInputChange('firstAid', value)}
              options={[
                { value: 'ja', label: 'Ja, Erste Hilfe erforderlich' },
                { value: 'nein', label: 'Nein, keine Erste Hilfe' },
                { value: 'ersthelfer', label: 'Ersthelfer' },
              ]}
            />
          </FormField>

          <FormField label="Videoüberwachung">
            <FormRadioGroup
              name="videoSurveillance"
              value={formData.videoSurveillance || ''}
              onChange={value => handleInputChange('videoSurveillance', value)}
              options={[
                { value: 'ja', label: 'Ja, Videoüberwachung' },
                { value: 'nein', label: 'Nein, keine Videoüberwachung' },
                { value: 'live_monitoring', label: 'Live-Monitoring' },
                { value: 'aufzeichnung', label: 'Aufzeichnung' },
              ]}
            />
          </FormField>

          <FormField label="Zutrittskontrolle">
            <FormRadioGroup
              name="accessControl"
              value={formData.accessControl || ''}
              onChange={value => handleInputChange('accessControl', value)}
              options={[
                { value: 'ja', label: 'Ja, Zutrittskontrolle' },
                { value: 'nein', label: 'Nein, keine Zutrittskontrolle' },
                { value: 'elektronisch', label: 'Elektronische Kontrolle' },
                { value: 'manuell', label: 'Manuelle Kontrolle' },
              ]}
            />
          </FormField>

          <FormField label="Alarmverfolgung">
            <FormRadioGroup
              name="alarmResponse"
              value={formData.alarmResponse || ''}
              onChange={value => handleInputChange('alarmResponse', value)}
              options={[
                { value: 'ja', label: 'Ja, Alarmverfolgung' },
                { value: 'nein', label: 'Nein, keine Alarmverfolgung' },
                { value: 'sofort', label: 'Sofortige Reaktion' },
                { value: 'verzögert', label: 'Verzögerte Reaktion' },
              ]}
            />
          </FormField>

          <FormField label="Berichterstattung">
            <FormRadioGroup
              name="reporting"
              value={formData.reporting || ''}
              onChange={value => handleInputChange('reporting', value)}
              options={[
                { value: 'täglich', label: 'Tägliche Berichte' },
                { value: 'wöchentlich', label: 'Wöchentliche Berichte' },
                { value: 'monatlich', label: 'Monatliche Berichte' },
                { value: 'ereignisbezogen', label: 'Ereignisbezogene Berichte' },
              ]}
            />
          </FormField>

          <FormField label="Mehrsprachigkeit">
            <FormRadioGroup
              name="multilingual"
              value={formData.multilingual || ''}
              onChange={value => handleInputChange('multilingual', value)}
              options={[
                { value: 'ja', label: 'Ja, mehrsprachig erforderlich' },
                { value: 'nein', label: 'Nein, nur Deutsch' },
                { value: 'englisch', label: 'Deutsch und Englisch' },
              ]}
            />
          </FormField>

          <FormField label="Geschlecht bevorzugt">
            <FormRadioGroup
              name="genderPreference"
              value={formData.genderPreference || ''}
              onChange={value => handleInputChange('genderPreference', value)}
              options={[
                { value: 'egal', label: 'Egal' },
                { value: 'männlich', label: 'Männlich' },
                { value: 'weiblich', label: 'Weiblich' },
                { value: 'gemischt', label: 'Gemischtes Team' },
              ]}
            />
          </FormField>

          <FormField label="Altersgruppe bevorzugt">
            <FormRadioGroup
              name="agePreference"
              value={formData.agePreference || ''}
              onChange={value => handleInputChange('agePreference', value)}
              options={[
                { value: 'egal', label: 'Egal' },
                { value: 'jung', label: 'Jung (18-30)' },
                { value: 'erfahren', label: 'Erfahren (30-50)' },
                { value: 'senior', label: 'Senior (50+)' },
              ]}
            />
          </FormField>

          <FormField label="Langfristige Zusammenarbeit">
            <FormRadioGroup
              name="longTermContract"
              value={formData.longTermContract || ''}
              onChange={value => handleInputChange('longTermContract', value)}
              options={[
                { value: 'ja', label: 'Ja, langfristige Zusammenarbeit' },
                { value: 'nein', label: 'Nein, einmalig' },
                { value: 'möglich', label: 'Möglich bei Zufriedenheit' },
              ]}
            />
          </FormField>

          <FormField label="Vertragsart">
            <FormRadioGroup
              name="contractType"
              value={formData.contractType || ''}
              onChange={value => handleInputChange('contractType', value)}
              options={[
                { value: 'rahmenvertrag', label: 'Rahmenvertrag' },
                { value: 'projektvertrag', label: 'Projektvertrag' },
                { value: 'stundenvertrag', label: 'Stundenvertrag' },
                { value: 'pauschale', label: 'Pauschale' },
              ]}
            />
          </FormField>

          <FormField label="Versicherung">
            <FormRadioGroup
              name="insurance"
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              options={[
                { value: 'vollversicherung', label: 'Vollversicherung' },
                { value: 'haftpflicht', label: 'Haftpflichtversicherung' },
                { value: 'berufsunfähigkeit', label: 'Berufsunfähigkeitsversicherung' },
                { value: 'keine', label: 'Keine besondere Versicherung' },
              ]}
            />
          </FormField>

          <FormField label="Zertifizierung">
            <FormCheckboxGroup
              value={formData.certification || []}
              onChange={value => handleInputChange('certification', value)}
              options={[
                { value: 'iso', label: 'ISO-Zertifizierung' },
                { value: 'din', label: 'DIN-Zertifizierung' },
                { value: 'bdsw', label: 'BDSW-Mitgliedschaft' },
                { value: 'keine', label: 'Keine Zertifizierung' },
              ]}
            />
          </FormField>

          <FormField label="Haftung">
            <FormRadioGroup
              name="liability"
              value={formData.liability || ''}
              onChange={value => handleInputChange('liability', value)}
              options={[
                { value: 'vollhaftung', label: 'Vollhaftung' },
                { value: 'begrenzte_haftung', label: 'Begrenzte Haftung' },
                { value: 'ausschluss', label: 'Haftungsausschluss' },
              ]}
            />
          </FormField>

          <FormField label="Datenschutz">
            <FormRadioGroup
              name="dataProtection"
              value={formData.dataProtection || ''}
              onChange={value => handleInputChange('dataProtection', value)}
              options={[
                { value: 'gdpr', label: 'GDPR-konform' },
                { value: 'standard', label: 'Standard-Datenschutz' },
                { value: 'erhöht', label: 'Erhöhter Datenschutz' },
              ]}
            />
          </FormField>

          <FormField label="Schweigepflicht">
            <FormRadioGroup
              name="confidentiality"
              value={formData.confidentiality || ''}
              onChange={value => handleInputChange('confidentiality', value)}
              options={[
                { value: 'ja', label: 'Ja, Schweigepflicht erforderlich' },
                { value: 'nein', label: 'Nein, keine Schweigepflicht' },
                { value: 'nda', label: 'NDA erforderlich' },
              ]}
            />
          </FormField>

          <FormField label="Sicherheitsüberprüfung">
            <FormRadioGroup
              name="securityClearance"
              value={formData.securityClearance || ''}
              onChange={value => handleInputChange('securityClearance', value)}
              options={[
                { value: 'ja', label: 'Ja, Sicherheitsüberprüfung erforderlich' },
                { value: 'nein', label: 'Nein, keine Überprüfung' },
                { value: 'erweitert', label: 'Erweiterte Überprüfung' },
              ]}
            />
          </FormField>

          <FormField label="Führungszeugnis">
            <FormRadioGroup
              name="criminalRecord"
              value={formData.criminalRecord || ''}
              onChange={value => handleInputChange('criminalRecord', value)}
              options={[
                { value: 'ja', label: 'Ja, Führungszeugnis erforderlich' },
                { value: 'nein', label: 'Nein, kein Führungszeugnis' },
                { value: 'erweitert', label: 'Erweitertes Führungszeugnis' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erforderliche Qualifikationen">
            <FormCheckboxGroup
              value={formData.qualifications || []}
              onChange={value => handleInputChange('qualifications', value)}
              options={qualificationOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Ausrüstung">
            <FormCheckboxGroup
              value={formData.equipment || []}
              onChange={value => handleInputChange('equipment', value)}
              options={equipmentOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezialleistungen">
            <FormCheckboxGroup
              value={formData.specialServices || []}
              onChange={value => handleInputChange('specialServices', value)}
              options={specialServicesOptions}
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
              value={formData.description || ''}
              onChange={value => handleInputChange('description', value)}
              placeholder="Beschreiben Sie Ihren Sicherheitsbedarf detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sicherheitsrisiken">
            <FormTextarea
              value={formData.securityRisks || ''}
              onChange={value => handleInputChange('securityRisks', value)}
              placeholder="Bekannte Sicherheitsrisiken oder Bedrohungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bisherige Vorfälle">
            <FormTextarea
              value={formData.previousIncidents || ''}
              onChange={value => handleInputChange('previousIncidents', value)}
              placeholder="Bisherige Sicherheitsvorfälle"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Spezielle Anforderungen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Einsatzbereiche">
            <FormTextarea
              value={formData.workAreas || ''}
              onChange={value => handleInputChange('workAreas', value)}
              placeholder="Detaillierte Beschreibung der Einsatzbereiche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Verantwortlichkeiten">
            <FormTextarea
              value={formData.responsibilities || ''}
              onChange={value => handleInputChange('responsibilities', value)}
              placeholder="Verantwortlichkeiten und Aufgaben"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kommunikation">
            <FormTextarea
              value={formData.communication || ''}
              onChange={value => handleInputChange('communication', value)}
              placeholder="Kommunikationswege und -zeiten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Eskalation">
            <FormTextarea
              value={formData.escalation || ''}
              onChange={value => handleInputChange('escalation', value)}
              placeholder="Eskalationsprozess bei Vorfällen"
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

export default SicherheitsdienstForm;
