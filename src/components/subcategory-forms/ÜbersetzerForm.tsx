import React, { useState, useEffect } from 'react';
import { ÜbersetzerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ÜbersetzerFormProps {
  data: ÜbersetzerData;
  onDataChange: (data: ÜbersetzerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const UbersetzerForm: React.FC<ÜbersetzerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ÜbersetzerData>(data);

  const serviceTypeOptions = [
    { value: 'schriftliche_übersetzung', label: 'Schriftliche Übersetzung' },
    { value: 'dolmetschen', label: 'Dolmetschen' },
    { value: 'simultanübersetzung', label: 'Simultanübersetzung' },
    { value: 'konsekutivübersetzung', label: 'Konsekutivübersetzung' },
    { value: 'flüsterdolmetschen', label: 'Flüsterdolmetschen' },
    { value: 'telefondolmetschen', label: 'Telefondolmetschen' },
    { value: 'videodolmetschen', label: 'Videodolmetschen' },
    { value: 'begleitdolmetschen', label: 'Begleitdolmetschen' },
    { value: 'verhandlungsdolmetschen', label: 'Verhandlungsdolmetschen' },
    { value: 'konferenzdolmetschen', label: 'Konferenzdolmetschen' },
    { value: 'gerichtsdolmetschen', label: 'Gerichtsdolmetschen' },
    { value: 'medizinisches_dolmetschen', label: 'Medizinisches Dolmetschen' },
    { value: 'technische_übersetzung', label: 'Technische Übersetzung' },
    { value: 'juristische_übersetzung', label: 'Juristische Übersetzung' },
    { value: 'medizinische_übersetzung', label: 'Medizinische Übersetzung' },
    { value: 'literarische_übersetzung', label: 'Literarische Übersetzung' },
    { value: 'marketing_übersetzung', label: 'Marketing-Übersetzung' },
    { value: 'website_übersetzung', label: 'Website-Übersetzung' },
    { value: 'software_lokalisierung', label: 'Software-Lokalisierung' },
    { value: 'untertitelung', label: 'Untertitelung' },
    { value: 'voice_over', label: 'Voice-Over' },
    { value: 'proofreading', label: 'Proofreading' },
    { value: 'lektorat', label: 'Lektorat' },
    { value: 'andere', label: 'Andere' },
  ];

  const sourceLanguageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'portugiesisch', label: 'Portugiesisch' },
    { value: 'russisch', label: 'Russisch' },
    { value: 'polnisch', label: 'Polnisch' },
    { value: 'niederländisch', label: 'Niederländisch' },
    { value: 'dänisch', label: 'Dänisch' },
    { value: 'schwedisch', label: 'Schwedisch' },
    { value: 'norwegisch', label: 'Norwegisch' },
    { value: 'finnisch', label: 'Finnisch' },
    { value: 'tschechisch', label: 'Tschechisch' },
    { value: 'slowakisch', label: 'Slowakisch' },
    { value: 'ungarisch', label: 'Ungarisch' },
    { value: 'kroatisch', label: 'Kroatisch' },
    { value: 'serbisch', label: 'Serbisch' },
    { value: 'bulgarisch', label: 'Bulgarisch' },
    { value: 'rumänisch', label: 'Rumänisch' },
    { value: 'griechisch', label: 'Griechisch' },
    { value: 'türkisch', label: 'Türkisch' },
    { value: 'arabisch', label: 'Arabisch' },
    { value: 'chinesisch', label: 'Chinesisch' },
    { value: 'japanisch', label: 'Japanisch' },
    { value: 'koreanisch', label: 'Koreanisch' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'andere', label: 'Andere' },
  ];

  const targetLanguageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'portugiesisch', label: 'Portugiesisch' },
    { value: 'russisch', label: 'Russisch' },
    { value: 'polnisch', label: 'Polnisch' },
    { value: 'niederländisch', label: 'Niederländisch' },
    { value: 'dänisch', label: 'Dänisch' },
    { value: 'schwedisch', label: 'Schwedisch' },
    { value: 'norwegisch', label: 'Norwegisch' },
    { value: 'finnisch', label: 'Finnisch' },
    { value: 'tschechisch', label: 'Tschechisch' },
    { value: 'slowakisch', label: 'Slowakisch' },
    { value: 'ungarisch', label: 'Ungarisch' },
    { value: 'kroatisch', label: 'Kroatisch' },
    { value: 'serbisch', label: 'Serbisch' },
    { value: 'bulgarisch', label: 'Bulgarisch' },
    { value: 'rumänisch', label: 'Rumänisch' },
    { value: 'griechisch', label: 'Griechisch' },
    { value: 'türkisch', label: 'Türkisch' },
    { value: 'arabisch', label: 'Arabisch' },
    { value: 'chinesisch', label: 'Chinesisch' },
    { value: 'japanisch', label: 'Japanisch' },
    { value: 'koreanisch', label: 'Koreanisch' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_100', label: 'Unter 100€' },
    { value: '100_500', label: '100€ - 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2500', label: '1000€ - 2500€' },
    { value: '2500_5000', label: '2500€ - 5000€' },
    { value: 'über_5000', label: 'Über 5000€' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const qualityLevelOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'hoch', label: 'Hoch' },
    { value: 'premium', label: 'Premium' },
    { value: 'professionell', label: 'Professionell' },
  ];

  const documentTypeOptions = [
    { value: 'verträge', label: 'Verträge' },
    { value: 'geschäftsdokumente', label: 'Geschäftsdokumente' },
    { value: 'technische_dokumentation', label: 'Technische Dokumentation' },
    { value: 'medizinische_dokumente', label: 'Medizinische Dokumente' },
    { value: 'juristische_dokumente', label: 'Juristische Dokumente' },
    { value: 'urkunden', label: 'Urkunden' },
    { value: 'zeugnisse', label: 'Zeugnisse' },
    { value: 'zertifikate', label: 'Zertifikate' },
    { value: 'ausweise', label: 'Ausweise' },
    { value: 'führerscheine', label: 'Führerscheine' },
    { value: 'pässe', label: 'Pässe' },
    { value: 'geburtsurkunden', label: 'Geburtsurkunden' },
    { value: 'heiratsurkunden', label: 'Heiratsurkunden' },
    { value: 'scheidungsurkunden', label: 'Scheidungsurkunden' },
    { value: 'sterbeurkunden', label: 'Sterbeurkunden' },
    { value: 'polizeiliches_führungszeugnis', label: 'Polizeiliches Führungszeugnis' },
    { value: 'arbeitszeugnis', label: 'Arbeitszeugnis' },
    { value: 'schulzeugnis', label: 'Schulzeugnis' },
    { value: 'universitätszeugnis', label: 'Universitätszeugnis' },
    { value: 'diplome', label: 'Diplome' },
    { value: 'berufszertifikate', label: 'Berufszertifikate' },
    { value: 'patente', label: 'Patente' },
    { value: 'marken', label: 'Marken' },
    { value: 'gebrauchsmuster', label: 'Gebrauchsmuster' },
    { value: 'bücher', label: 'Bücher' },
    { value: 'artikel', label: 'Artikel' },
    { value: 'broschüren', label: 'Broschüren' },
    { value: 'kataloge', label: 'Kataloge' },
    { value: 'handbücher', label: 'Handbücher' },
    { value: 'anleitungen', label: 'Anleitungen' },
    { value: 'präsentationen', label: 'Präsentationen' },
    { value: 'websites', label: 'Websites' },
    { value: 'software', label: 'Software' },
    { value: 'apps', label: 'Apps' },
    { value: 'andere', label: 'Andere' },
  ];

  const wordCountOptions = [
    { value: 'unter_500', label: 'Unter 500 Wörter' },
    { value: '500_1000', label: '500 - 1000 Wörter' },
    { value: '1000_2500', label: '1000 - 2500 Wörter' },
    { value: '2500_5000', label: '2500 - 5000 Wörter' },
    { value: '5000_10000', label: '5000 - 10000 Wörter' },
    { value: 'über_10000', label: 'Über 10000 Wörter' },
  ];

  const specialtyOptions = [
    { value: 'medizin', label: 'Medizin' },
    { value: 'recht', label: 'Recht' },
    { value: 'technik', label: 'Technik' },
    { value: 'wirtschaft', label: 'Wirtschaft' },
    { value: 'finanzen', label: 'Finanzen' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'it', label: 'IT' },
    { value: 'wissenschaft', label: 'Wissenschaft' },
    { value: 'literatur', label: 'Literatur' },
    { value: 'kunst', label: 'Kunst' },
    { value: 'kultur', label: 'Kultur' },
    { value: 'tourismus', label: 'Tourismus' },
    { value: 'gastronomie', label: 'Gastronomie' },
    { value: 'mode', label: 'Mode' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'sport', label: 'Sport' },
    { value: 'automobil', label: 'Automobil' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'bildung', label: 'Bildung' },
    { value: 'umwelt', label: 'Umwelt' },
    { value: 'energie', label: 'Energie' },
    { value: 'landwirtschaft', label: 'Landwirtschaft' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'beglaubigte_übersetzung', label: 'Beglaubigte Übersetzung' },
    { value: 'eilübersetzung', label: 'Eilübersetzung' },
    { value: 'proofreading', label: 'Proofreading' },
    { value: 'lektorat', label: 'Lektorat' },
    { value: 'transkription', label: 'Transkription' },
    { value: 'untertitelung', label: 'Untertitelung' },
    { value: 'voice_over', label: 'Voice-Over' },
    { value: 'lokalisierung', label: 'Lokalisierung' },
    { value: 'kulturelle_anpassung', label: 'Kulturelle Anpassung' },
    { value: 'terminologie_management', label: 'Terminologie-Management' },
    { value: 'glossar_erstellung', label: 'Glossar-Erstellung' },
    { value: 'cat_tools', label: 'CAT-Tools' },
    { value: 'translation_memory', label: 'Translation Memory' },
    { value: 'qualitätssicherung', label: 'Qualitätssicherung' },
    { value: 'projektmanagement', label: 'Projektmanagement' },
    { value: 'desktop_publishing', label: 'Desktop Publishing' },
    { value: 'formatierung', label: 'Formatierung' },
    { value: 'layout', label: 'Layout' },
    { value: 'grafik_bearbeitung', label: 'Grafik-Bearbeitung' },
    { value: 'mehrsprachige_projekte', label: 'Mehrsprachige Projekte' },
    { value: 'team_übersetzung', label: 'Team-Übersetzung' },
    { value: 'revision', label: 'Revision' },
    { value: 'vier_augen_prinzip', label: 'Vier-Augen-Prinzip' },
    { value: 'native_speaker', label: 'Native Speaker' },
    { value: 'fachübersetzer', label: 'Fachübersetzer' },
    { value: 'zertifizierte_übersetzer', label: 'Zertifizierte Übersetzer' },
    { value: 'vereidigte_übersetzer', label: 'Vereidigte Übersetzer' },
    { value: 'iso_zertifizierung', label: 'ISO-Zertifizierung' },
    { value: 'vertraulichkeit', label: 'Vertraulichkeit' },
    { value: 'nda', label: 'NDA' },
    { value: 'datenschutz', label: 'Datenschutz' },
    { value: 'gdpr', label: 'GDPR' },
    { value: 'backup', label: 'Backup' },
    { value: 'archivierung', label: 'Archivierung' },
    { value: 'support', label: 'Support' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'schulung', label: 'Schulung' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof ÜbersetzerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.sourceLanguage &&
      formData.targetLanguage &&
      formData.budgetRange &&
      formData.urgency &&
      formData.qualityLevel &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Übersetzung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Übersetzung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Übersetzung"
            />
          </FormField>

          <FormField label="Ausgangssprache" required>
            <FormSelect
              value={formData.sourceLanguage || ''}
              onChange={value => handleInputChange('sourceLanguage', value)}
              options={sourceLanguageOptions}
              placeholder="Wählen Sie die Ausgangssprache"
            />
          </FormField>

          <FormField label="Zielsprache" required>
            <FormSelect
              value={formData.targetLanguage || ''}
              onChange={value => handleInputChange('targetLanguage', value)}
              options={targetLanguageOptions}
              placeholder="Wählen Sie die Zielsprache"
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

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>

          <FormField label="Qualitätslevel" required>
            <FormSelect
              value={formData.qualityLevel || ''}
              onChange={value => handleInputChange('qualityLevel', value)}
              options={qualityLevelOptions}
              placeholder="Wählen Sie das Qualitätslevel"
            />
          </FormField>

          <FormField label="Dokumenttyp">
            <FormSelect
              value={formData.documentType || ''}
              onChange={value => handleInputChange('documentType', value)}
              options={documentTypeOptions}
              placeholder="Wählen Sie den Dokumenttyp"
            />
          </FormField>

          <FormField label="Wortanzahl">
            <FormSelect
              value={formData.wordCount || ''}
              onChange={value => handleInputChange('wordCount', value)}
              options={wordCountOptions}
              placeholder="Wählen Sie die Wortanzahl"
            />
          </FormField>

          <FormField label="Fachgebiet">
            <FormSelect
              value={formData.specialty || ''}
              onChange={value => handleInputChange('specialty', value)}
              options={specialtyOptions}
              placeholder="Wählen Sie das Fachgebiet"
            />
          </FormField>

          <FormField label="Gewünschter Liefertermin">
            <FormInput
              type="text"
              value={formData.preferredDeliveryDate || ''}
              onChange={value => handleInputChange('preferredDeliveryDate', value)}
              placeholder="TT.MM.JJJJ"
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

          <FormField label="Unternehmen">
            <FormInput
              type="text"
              value={formData.company || ''}
              onChange={value => handleInputChange('company', value)}
              placeholder="Unternehmen"
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

          <FormField label="Branche">
            <FormInput
              type="text"
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              placeholder="Branche"
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormInput
              type="text"
              value={formData.targetGroup || ''}
              onChange={value => handleInputChange('targetGroup', value)}
              placeholder="Zielgruppe"
            />
          </FormField>

          <FormField label="Verwendungszweck">
            <FormInput
              type="text"
              value={formData.purpose || ''}
              onChange={value => handleInputChange('purpose', value)}
              placeholder="Wofür wird die Übersetzung benötigt?"
            />
          </FormField>

          <FormField label="Dateiformat">
            <FormInput
              type="text"
              value={formData.fileFormat || ''}
              onChange={value => handleInputChange('fileFormat', value)}
              placeholder="z.B. PDF, Word, Excel"
            />
          </FormField>

          <FormField label="Lieferformat">
            <FormInput
              type="text"
              value={formData.deliveryFormat || ''}
              onChange={value => handleInputChange('deliveryFormat', value)}
              placeholder="Gewünschtes Lieferformat"
            />
          </FormField>

          <FormField label="Referenzmaterialien">
            <FormInput
              type="text"
              value={formData.referenceMaterials || ''}
              onChange={value => handleInputChange('referenceMaterials', value)}
              placeholder="Verfügbare Referenzmaterialien"
            />
          </FormField>

          <FormField label="Terminologie">
            <FormInput
              type="text"
              value={formData.terminology || ''}
              onChange={value => handleInputChange('terminology', value)}
              placeholder="Spezielle Terminologie"
            />
          </FormField>

          <FormField label="Stil">
            <FormInput
              type="text"
              value={formData.style || ''}
              onChange={value => handleInputChange('style', value)}
              placeholder="Gewünschter Stil"
            />
          </FormField>

          <FormField label="Zielmarkt">
            <FormInput
              type="text"
              value={formData.targetMarket || ''}
              onChange={value => handleInputChange('targetMarket', value)}
              placeholder="Zielmarkt"
            />
          </FormField>

          <FormField label="Kulturelle Anpassung">
            <FormInput
              type="text"
              value={formData.culturalAdaptation || ''}
              onChange={value => handleInputChange('culturalAdaptation', value)}
              placeholder="Kulturelle Besonderheiten"
            />
          </FormField>

          <FormField label="Beglaubigung erforderlich">
            <FormRadioGroup
              name="certification"
              value={formData.certification || ''}
              onChange={value => handleInputChange('certification', value)}
              options={[
                { value: 'ja', label: 'Ja, beglaubigte Übersetzung' },
                { value: 'nein', label: 'Nein, einfache Übersetzung' },
                { value: 'vereidigt', label: 'Vereidigte Übersetzung' },
              ]}
            />
          </FormField>

          <FormField label="Native Speaker erforderlich">
            <FormRadioGroup
              name="nativeSpeaker"
              value={formData.nativeSpeaker || ''}
              onChange={value => handleInputChange('nativeSpeaker', value)}
              options={[
                { value: 'ja', label: 'Ja, Native Speaker' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>

          <FormField label="Fachübersetzer erforderlich">
            <FormRadioGroup
              name="specialistTranslator"
              value={formData.specialistTranslator || ''}
              onChange={value => handleInputChange('specialistTranslator', value)}
              options={[
                { value: 'ja', label: 'Ja, Fachübersetzer' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>

          <FormField label="CAT-Tools gewünscht">
            <FormRadioGroup
              name="catTools"
              value={formData.catTools || ''}
              onChange={value => handleInputChange('catTools', value)}
              options={[
                { value: 'ja', label: 'Ja, CAT-Tools verwenden' },
                { value: 'nein', label: 'Nein, nicht verwenden' },
                { value: 'egal', label: 'Egal' },
              ]}
            />
          </FormField>

          <FormField label="Translation Memory gewünscht">
            <FormRadioGroup
              name="translationMemory"
              value={formData.translationMemory || ''}
              onChange={value => handleInputChange('translationMemory', value)}
              options={[
                { value: 'ja', label: 'Ja, TM verwenden' },
                { value: 'nein', label: 'Nein, nicht verwenden' },
                { value: 'erstellen', label: 'TM erstellen' },
              ]}
            />
          </FormField>

          <FormField label="Qualitätssicherung gewünscht">
            <FormRadioGroup
              name="qualityAssurance"
              value={formData.qualityAssurance || ''}
              onChange={value => handleInputChange('qualityAssurance', value)}
              options={[
                { value: 'ja', label: 'Ja, QS gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'vier_augen', label: 'Vier-Augen-Prinzip' },
              ]}
            />
          </FormField>

          <FormField label="Revision gewünscht">
            <FormRadioGroup
              name="revision"
              value={formData.revision || ''}
              onChange={value => handleInputChange('revision', value)}
              options={[
                { value: 'ja', label: 'Ja, Revision gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'optional', label: 'Optional' },
              ]}
            />
          </FormField>

          <FormField label="Proofreading gewünscht">
            <FormRadioGroup
              name="proofreading"
              value={formData.proofreading || ''}
              onChange={value => handleInputChange('proofreading', value)}
              options={[
                { value: 'ja', label: 'Ja, Proofreading gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'optional', label: 'Optional' },
              ]}
            />
          </FormField>

          <FormField label="Lektorat gewünscht">
            <FormRadioGroup
              name="editing"
              value={formData.editing || ''}
              onChange={value => handleInputChange('editing', value)}
              options={[
                { value: 'ja', label: 'Ja, Lektorat gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'optional', label: 'Optional' },
              ]}
            />
          </FormField>

          <FormField label="Lokalisierung gewünscht">
            <FormRadioGroup
              name="localization"
              value={formData.localization || ''}
              onChange={value => handleInputChange('localization', value)}
              options={[
                { value: 'ja', label: 'Ja, Lokalisierung gewünscht' },
                { value: 'nein', label: 'Nein, nur Übersetzung' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Desktop Publishing gewünscht">
            <FormRadioGroup
              name="desktopPublishing"
              value={formData.desktopPublishing || ''}
              onChange={value => handleInputChange('desktopPublishing', value)}
              options={[
                { value: 'ja', label: 'Ja, DTP gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'formatierung', label: 'Nur Formatierung' },
              ]}
            />
          </FormField>

          <FormField label="Projektmanagement gewünscht">
            <FormRadioGroup
              name="projectManagement"
              value={formData.projectManagement || ''}
              onChange={value => handleInputChange('projectManagement', value)}
              options={[
                { value: 'ja', label: 'Ja, PM gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'koordination', label: 'Nur Koordination' },
              ]}
            />
          </FormField>

          <FormField label="Vertraulichkeit erforderlich">
            <FormRadioGroup
              name="confidentiality"
              value={formData.confidentiality || ''}
              onChange={value => handleInputChange('confidentiality', value)}
              options={[
                { value: 'ja', label: 'Ja, Vertraulichkeit erforderlich' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'nda', label: 'NDA erforderlich' },
              ]}
            />
          </FormField>

          <FormField label="ISO-Zertifizierung erforderlich">
            <FormRadioGroup
              name="isoCertification"
              value={formData.isoCertification || ''}
              onChange={value => handleInputChange('isoCertification', value)}
              options={[
                { value: 'ja', label: 'Ja, ISO-Zertifizierung erforderlich' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>

          <FormField label="Backup gewünscht">
            <FormRadioGroup
              name="backup"
              value={formData.backup || ''}
              onChange={value => handleInputChange('backup', value)}
              options={[
                { value: 'ja', label: 'Ja, Backup gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'archivierung', label: 'Archivierung' },
              ]}
            />
          </FormField>

          <FormField label="Support gewünscht">
            <FormRadioGroup
              name="support"
              value={formData.support || ''}
              onChange={value => handleInputChange('support', value)}
              options={[
                { value: 'ja', label: 'Ja, Support gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'zeitlich_begrenzt', label: 'Zeitlich begrenzt' },
              ]}
            />
          </FormField>

          <FormField label="Schulung gewünscht">
            <FormRadioGroup
              name="training"
              value={formData.training || ''}
              onChange={value => handleInputChange('training', value)}
              options={[
                { value: 'ja', label: 'Ja, Schulung gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'workshop', label: 'Workshop' },
              ]}
            />
          </FormField>

          <FormField label="Beratung gewünscht">
            <FormRadioGroup
              name="consultation"
              value={formData.consultation || ''}
              onChange={value => handleInputChange('consultation', value)}
              options={[
                { value: 'ja', label: 'Ja, Beratung gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'vorab', label: 'Vorab-Beratung' },
              ]}
            />
          </FormField>

          <FormField label="Mehrsprachiges Projekt">
            <FormRadioGroup
              name="multilingualProject"
              value={formData.multilingualProject || ''}
              onChange={value => handleInputChange('multilingualProject', value)}
              options={[
                { value: 'ja', label: 'Ja, mehrsprachiges Projekt' },
                { value: 'nein', label: 'Nein, nur eine Sprache' },
                { value: 'geplant', label: 'Geplant' },
              ]}
            />
          </FormField>

          <FormField label="Rush-Job">
            <FormRadioGroup
              name="rushJob"
              value={formData.rushJob || ''}
              onChange={value => handleInputChange('rushJob', value)}
              options={[
                { value: 'ja', label: 'Ja, Rush-Job' },
                { value: 'nein', label: 'Nein, normaler Zeitrahmen' },
                { value: 'express', label: 'Express-Service' },
              ]}
            />
          </FormField>

          <FormField label="Glossar vorhanden">
            <FormRadioGroup
              name="glossaryAvailable"
              value={formData.glossaryAvailable || ''}
              onChange={value => handleInputChange('glossaryAvailable', value)}
              options={[
                { value: 'ja', label: 'Ja, Glossar vorhanden' },
                { value: 'nein', label: 'Nein, kein Glossar' },
                { value: 'erstellen', label: 'Glossar erstellen' },
              ]}
            />
          </FormField>

          <FormField label="Style Guide vorhanden">
            <FormRadioGroup
              name="styleGuide"
              value={formData.styleGuide || ''}
              onChange={value => handleInputChange('styleGuide', value)}
              options={[
                { value: 'ja', label: 'Ja, Style Guide vorhanden' },
                { value: 'nein', label: 'Nein, kein Style Guide' },
                { value: 'erstellen', label: 'Style Guide erstellen' },
              ]}
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
              placeholder="Beschreiben Sie Ihr Übersetzungsprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kontext">
            <FormTextarea
              value={formData.context || ''}
              onChange={value => handleInputChange('context', value)}
              placeholder="Kontext und Hintergrundinformationen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zielgruppe Details">
            <FormTextarea
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Detaillierte Beschreibung der Zielgruppe"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Stilrichtlinien">
            <FormTextarea
              value={formData.styleGuidelines || ''}
              onChange={value => handleInputChange('styleGuidelines', value)}
              placeholder="Spezielle Stilrichtlinien"
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
          <FormField label="Verwendete Tools">
            <FormTextarea
              value={formData.toolsUsed || ''}
              onChange={value => handleInputChange('toolsUsed', value)}
              placeholder="Bereits verwendete Tools oder Präferenzen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorherige Übersetzungen">
            <FormTextarea
              value={formData.previousTranslations || ''}
              onChange={value => handleInputChange('previousTranslations', value)}
              placeholder="Informationen zu vorherigen Übersetzungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualitätskriterien">
            <FormTextarea
              value={formData.qualityCriteria || ''}
              onChange={value => handleInputChange('qualityCriteria', value)}
              placeholder="Spezifische Qualitätskriterien"
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

export default UbersetzerForm;
