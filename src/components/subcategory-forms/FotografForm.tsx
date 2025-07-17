import React, { useState, useEffect } from 'react';
import { FotografData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface FotografFormProps {
  data: FotografData;
  onDataChange: (data: FotografData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FotografForm: React.FC<FotografFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FotografData>(data);

  const serviceTypeOptions = [
    { value: 'hochzeitsfotografie', label: 'Hochzeitsfotografie' },
    { value: 'portraitfotografie', label: 'Portraitfotografie' },
    { value: 'eventfotografie', label: 'Eventfotografie' },
    { value: 'businessfotografie', label: 'Businessfotografie' },
    { value: 'produktfotografie', label: 'Produktfotografie' },
    { value: 'immobilienfotografie', label: 'Immobilienfotografie' },
    { value: 'tierfotografie', label: 'Tierfotografie' },
    { value: 'babyfotografie', label: 'Babyfotografie' },
    { value: 'familienfotografie', label: 'Familienfotografie' },
    { value: 'modefotografie', label: 'Modefotografie' },
    { value: 'sportfotografie', label: 'Sportfotografie' },
    { value: 'landschaftsfotografie', label: 'Landschaftsfotografie' },
    { value: 'architektur', label: 'Architekturfotografie' },
    { value: 'bewerbungsfotos', label: 'Bewerbungsfotos' },
    { value: 'passfotos', label: 'Passfotos' },
    { value: 'andere', label: 'Andere' },
  ];

  const shootingTypeOptions = [
    { value: 'studio', label: 'Studio' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'location', label: 'On Location' },
    { value: 'zuhause', label: 'Zuhause' },
    { value: 'büro', label: 'Büro' },
    { value: 'event', label: 'Event' },
    { value: 'reise', label: 'Reise' },
    { value: 'gemischt', label: 'Gemischt' },
  ];
  const durationOptions = [
    { value: 'unter_1h', label: 'Unter 1 Stunde' },
    { value: '1_2h', label: '1-2 Stunden' },
    { value: '2_4h', label: '2-4 Stunden' },
    { value: '4_8h', label: '4-8 Stunden' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'mehrere_tage', label: 'Mehrere Tage' },
  ];

  const numberOfPeopleOptions = [
    { value: '1', label: '1 Person' },
    { value: '2', label: '2 Personen' },
    { value: '3_5', label: '3-5 Personen' },
    { value: '6_10', label: '6-10 Personen' },
    { value: '11_20', label: '11-20 Personen' },
    { value: 'über_20', label: 'Über 20 Personen' },
  ];

  const styleOptions = [
    { value: 'natürlich', label: 'Natürlich' },
    { value: 'klassisch', label: 'Klassisch' },
    { value: 'modern', label: 'Modern' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'romantisch', label: 'Romantisch' },
    { value: 'glamourös', label: 'Glamourös' },
    { value: 'künstlerisch', label: 'Künstlerisch' },
    { value: 'dokumentarisch', label: 'Dokumentarisch' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'kreativ', label: 'Kreativ' },
    { value: 'editorial', label: 'Editorial' },
    { value: 'andere', label: 'Andere' },
  ];

  const deliveryFormatOptions = [
    { value: 'digital', label: 'Digital' },
    { value: 'print', label: 'Prints' },
    { value: 'both', label: 'Digital & Prints' },
    { value: 'album', label: 'Album' },
    { value: 'canvas', label: 'Canvas' },
    { value: 'usb', label: 'USB-Stick' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'bildbearbeitung', label: 'Bildbearbeitung' },
    { value: 'retusche', label: 'Retusche' },
    { value: 'farbkorrektur', label: 'Farbkorrektur' },
    { value: 'schwarz_weiss', label: 'Schwarz-Weiß-Bearbeitung' },
    { value: 'album_design', label: 'Album-Design' },
    { value: 'prints', label: 'Prints' },
    { value: 'canvas', label: 'Canvas-Druck' },
    { value: 'poster', label: 'Poster' },
    { value: 'kalender', label: 'Kalender' },
    { value: 'fotobuch', label: 'Fotobuch' },
    { value: 'usb_stick', label: 'USB-Stick' },
    { value: 'online_galerie', label: 'Online-Galerie' },
    { value: 'slideshow', label: 'Slideshow' },
    { value: 'video', label: 'Video' },
    { value: 'zeitlupe', label: 'Zeitlupe' },
    { value: 'drohne', label: 'Drohnenaufnahmen' },
    { value: 'make_up', label: 'Make-up Artist' },
    { value: 'hairstyling', label: 'Hairstyling' },
    { value: 'styling', label: 'Styling' },
    { value: 'requisiten', label: 'Requisiten' },
    { value: 'location_scouting', label: 'Location Scouting' },
    { value: 'assistenz', label: 'Assistenz' },
    { value: 'zweiter_fotograf', label: 'Zweiter Fotograf' },
    { value: 'backup', label: 'Backup' },
    { value: 'express_bearbeitung', label: 'Express-Bearbeitung' },
    { value: 'rush_order', label: 'Rush Order' },
    { value: 'preview', label: 'Preview' },
    { value: 'proof', label: 'Proof' },
    { value: 'korrektur', label: 'Korrektur' },
    { value: 'nachbestellung', label: 'Nachbestellung' },
    { value: 'archivierung', label: 'Archivierung' },
    { value: 'restaurierung', label: 'Restaurierung' },
    { value: 'digitalisierung', label: 'Digitalisierung' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof FotografData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.shootingType &&
      formData.duration &&
      formData.numberOfPeople &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fotograf-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Fotografie" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Fotografie"
            />
          </FormField>

          <FormField label="Shooting-Typ" required>
            <FormSelect
              value={formData.shootingType || ''}
              onChange={value => handleInputChange('shootingType', value)}
              options={shootingTypeOptions}
              placeholder="Wählen Sie den Shooting-Typ"
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

          <FormField label="Anzahl Personen" required>
            <FormSelect
              value={formData.numberOfPeople || ''}
              onChange={value => handleInputChange('numberOfPeople', value)}
              options={numberOfPeopleOptions}
              placeholder="Wählen Sie die Anzahl der Personen"
            />
          </FormField>

          <FormField label="Gewünschter Stil">
            <FormSelect
              value={formData.style || ''}
              onChange={value => handleInputChange('style', value)}
              options={styleOptions}
              placeholder="Wählen Sie den gewünschten Stil"
            />
          </FormField>

          <FormField label="Lieferformat">
            <FormSelect
              value={formData.deliveryFormat || ''}
              onChange={value => handleInputChange('deliveryFormat', value)}
              options={deliveryFormatOptions}
              placeholder="Wählen Sie das Lieferformat"
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

          <FormField label="Location">
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="Gewünschte Location"
            />
          </FormField>
          <FormField label="Anzahl Bilder">
            <FormInput
              type="number"
              value={formData.numberOfImages?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfImages',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gewünschte Anzahl Bilder"
            />
          </FormField>

          <FormField label="Bearbeitungszeit">
            <FormInput
              type="text"
              value={formData.processingTime || ''}
              onChange={value => handleInputChange('processingTime', value)}
              placeholder="Gewünschte Bearbeitungszeit"
            />
          </FormField>

          <FormField label="Nutzungsrechte">
            <FormRadioGroup
              name="usageRights"
              value={formData.usageRights || ''}
              onChange={value => handleInputChange('usageRights', value)}
              options={[
                { value: 'privat', label: 'Privat' },
                { value: 'kommerziell', label: 'Kommerziell' },
                { value: 'beide', label: 'Beide' },
              ]}
            />
          </FormField>

          <FormField label="Bildbearbeitung gewünscht">
            <FormRadioGroup
              name="editing"
              value={formData.editing || ''}
              onChange={value => handleInputChange('editing', value)}
              options={[
                { value: 'ja', label: 'Ja, Bildbearbeitung gewünscht' },
                { value: 'nein', label: 'Nein, unbearbeitete Bilder' },
                { value: 'basic', label: 'Basic-Bearbeitung' },
                { value: 'erweitert', label: 'Erweiterte Bearbeitung' },
              ]}
            />
          </FormField>

          <FormField label="Probe-Shooting gewünscht">
            <FormRadioGroup
              name="testShoot"
              value={formData.testShoot || ''}
              onChange={value => handleInputChange('testShoot', value)}
              options={[
                { value: 'ja', label: 'Ja, Probe-Shooting gewünscht' },
                { value: 'nein', label: 'Nein, direkt Hauptshooting' },
                { value: 'abhängig', label: 'Abhängig von Kosten' },
              ]}
            />
          </FormField>

          <FormField label="Zweites Shooting gewünscht">
            <FormRadioGroup
              name="secondShoot"
              value={formData.secondShoot || ''}
              onChange={value => handleInputChange('secondShoot', value)}
              options={[
                { value: 'ja', label: 'Ja, zweites Shooting gewünscht' },
                { value: 'nein', label: 'Nein, nur ein Shooting' },
                { value: 'möglich', label: 'Möglich' },
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
                { value: 'nein', label: 'Nein, kein Backup' },
                { value: 'standard', label: 'Standard-Backup' },
              ]}
            />
          </FormField>

          <FormField label="Online-Galerie gewünscht">
            <FormRadioGroup
              name="onlineGallery"
              value={formData.onlineGallery || ''}
              onChange={value => handleInputChange('onlineGallery', value)}
              options={[
                { value: 'ja', label: 'Ja, Online-Galerie gewünscht' },
                { value: 'nein', label: 'Nein, keine Online-Galerie' },
                { value: 'passwort', label: 'Passwort-geschützt' },
              ]}
            />
          </FormField>

          <FormField label="Prints gewünscht">
            <FormRadioGroup
              name="prints"
              value={formData.prints || ''}
              onChange={value => handleInputChange('prints', value)}
              options={[
                { value: 'ja', label: 'Ja, Prints gewünscht' },
                { value: 'nein', label: 'Nein, nur digital' },
                { value: 'später', label: 'Später entscheiden' },
              ]}
            />
          </FormField>

          <FormField label="Album gewünscht">
            <FormRadioGroup
              name="album"
              value={formData.album || ''}
              onChange={value => handleInputChange('album', value)}
              options={[
                { value: 'ja', label: 'Ja, Album gewünscht' },
                { value: 'nein', label: 'Nein, kein Album' },
                { value: 'fotobuch', label: 'Fotobuch' },
              ]}
            />
          </FormField>

          <FormField label="Make-up Artist gewünscht">
            <FormRadioGroup
              name="makeupArtist"
              value={formData.makeupArtist || ''}
              onChange={value => handleInputChange('makeupArtist', value)}
              options={[
                { value: 'ja', label: 'Ja, Make-up Artist gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Hairstyling gewünscht">
            <FormRadioGroup
              name="hairstyling"
              value={formData.hairstyling || ''}
              onChange={value => handleInputChange('hairstyling', value)}
              options={[
                { value: 'ja', label: 'Ja, Hairstyling gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Styling gewünscht">
            <FormRadioGroup
              name="styling"
              value={formData.styling || ''}
              onChange={value => handleInputChange('styling', value)}
              options={[
                { value: 'ja', label: 'Ja, Styling gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Requisiten gewünscht">
            <FormRadioGroup
              name="props"
              value={formData.props || ''}
              onChange={value => handleInputChange('props', value)}
              options={[
                { value: 'ja', label: 'Ja, Requisiten gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'eigene', label: 'Eigene Requisiten' },
              ]}
            />
          </FormField>

          <FormField label="Location Scouting gewünscht">
            <FormRadioGroup
              name="locationScouting"
              value={formData.locationScouting || ''}
              onChange={value => handleInputChange('locationScouting', value)}
              options={[
                { value: 'ja', label: 'Ja, Location Scouting gewünscht' },
                { value: 'nein', label: 'Nein, Location bekannt' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Assistenz gewünscht">
            <FormRadioGroup
              name="assistant"
              value={formData.assistant || ''}
              onChange={value => handleInputChange('assistant', value)}
              options={[
                { value: 'ja', label: 'Ja, Assistenz gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'abhängig', label: 'Abhängig von Shooting' },
              ]}
            />
          </FormField>

          <FormField label="Zweiter Fotograf gewünscht">
            <FormRadioGroup
              name="secondPhotographer"
              value={formData.secondPhotographer || ''}
              onChange={value => handleInputChange('secondPhotographer', value)}
              options={[
                { value: 'ja', label: 'Ja, zweiter Fotograf gewünscht' },
                { value: 'nein', label: 'Nein, nur ein Fotograf' },
                { value: 'abhängig', label: 'Abhängig von Event' },
              ]}
            />
          </FormField>

          <FormField label="Drohne gewünscht">
            <FormRadioGroup
              name="drone"
              value={formData.drone || ''}
              onChange={value => handleInputChange('drone', value)}
              options={[
                { value: 'ja', label: 'Ja, Drohne gewünscht' },
                { value: 'nein', label: 'Nein, keine Drohne' },
                { value: 'abhängig', label: 'Abhängig von Location' },
              ]}
            />
          </FormField>

          <FormField label="Video gewünscht">
            <FormRadioGroup
              name="video"
              value={formData.video || ''}
              onChange={value => handleInputChange('video', value)}
              options={[
                { value: 'ja', label: 'Ja, Video gewünscht' },
                { value: 'nein', label: 'Nein, nur Fotos' },
                { value: 'kurze_clips', label: 'Kurze Clips' },
              ]}
            />
          </FormField>

          <FormField label="Zeitlupe gewünscht">
            <FormRadioGroup
              name="slowMotion"
              value={formData.slowMotion || ''}
              onChange={value => handleInputChange('slowMotion', value)}
              options={[
                { value: 'ja', label: 'Ja, Zeitlupe gewünscht' },
                { value: 'nein', label: 'Nein, normale Geschwindigkeit' },
                { value: 'beides', label: 'Beides' },
              ]}
            />
          </FormField>

          <FormField label="Slideshow gewünscht">
            <FormRadioGroup
              name="slideshow"
              value={formData.slideshow || ''}
              onChange={value => handleInputChange('slideshow', value)}
              options={[
                { value: 'ja', label: 'Ja, Slideshow gewünscht' },
                { value: 'nein', label: 'Nein, keine Slideshow' },
                { value: 'mit_musik', label: 'Mit Musik' },
              ]}
            />
          </FormField>

          <FormField label="Express-Bearbeitung gewünscht">
            <FormRadioGroup
              name="expressEditing"
              value={formData.expressEditing || ''}
              onChange={value => handleInputChange('expressEditing', value)}
              options={[
                { value: 'ja', label: 'Ja, Express-Bearbeitung gewünscht' },
                { value: 'nein', label: 'Nein, normale Bearbeitung' },
                { value: 'abhängig', label: 'Abhängig von Kosten' },
              ]}
            />
          </FormField>

          <FormField label="Rush Order gewünscht">
            <FormRadioGroup
              name="rushOrder"
              value={formData.rushOrder || ''}
              onChange={value => handleInputChange('rushOrder', value)}
              options={[
                { value: 'ja', label: 'Ja, Rush Order gewünscht' },
                { value: 'nein', label: 'Nein, normale Bearbeitung' },
                { value: 'abhängig', label: 'Abhängig von Kosten' },
              ]}
            />
          </FormField>

          <FormField label="Preview gewünscht">
            <FormRadioGroup
              name="preview"
              value={formData.preview || ''}
              onChange={value => handleInputChange('preview', value)}
              options={[
                { value: 'ja', label: 'Ja, Preview gewünscht' },
                { value: 'nein', label: 'Nein, finales Ergebnis' },
                { value: 'auswahl', label: 'Für Auswahl' },
              ]}
            />
          </FormField>

          <FormField label="Proof gewünscht">
            <FormRadioGroup
              name="proof"
              value={formData.proof || ''}
              onChange={value => handleInputChange('proof', value)}
              options={[
                { value: 'ja', label: 'Ja, Proof gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'digital', label: 'Digital' },
              ]}
            />
          </FormField>

          <FormField label="Korrektur gewünscht">
            <FormRadioGroup
              name="correction"
              value={formData.correction || ''}
              onChange={value => handleInputChange('correction', value)}
              options={[
                { value: 'ja', label: 'Ja, Korrektur möglich' },
                { value: 'nein', label: 'Nein, finales Ergebnis' },
                { value: 'einmalig', label: 'Einmalig' },
              ]}
            />
          </FormField>

          <FormField label="Nachbestellung möglich">
            <FormRadioGroup
              name="reorder"
              value={formData.reorder || ''}
              onChange={value => handleInputChange('reorder', value)}
              options={[
                { value: 'ja', label: 'Ja, Nachbestellung möglich' },
                { value: 'nein', label: 'Nein, einmalige Bestellung' },
                { value: 'zeitlich_begrenzt', label: 'Zeitlich begrenzt' },
              ]}
            />
          </FormField>

          <FormField label="Archivierung gewünscht">
            <FormRadioGroup
              name="archiving"
              value={formData.archiving || ''}
              onChange={value => handleInputChange('archiving', value)}
              options={[
                { value: 'ja', label: 'Ja, Archivierung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'zeitlich_begrenzt', label: 'Zeitlich begrenzt' },
              ]}
            />
          </FormField>

          <FormField label="Restaurierung gewünscht">
            <FormRadioGroup
              name="restoration"
              value={formData.restoration || ''}
              onChange={value => handleInputChange('restoration', value)}
              options={[
                { value: 'ja', label: 'Ja, Restaurierung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Digitalisierung gewünscht">
            <FormRadioGroup
              name="digitization"
              value={formData.digitization || ''}
              onChange={value => handleInputChange('digitization', value)}
              options={[
                { value: 'ja', label: 'Ja, Digitalisierung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
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
              placeholder="Beschreiben Sie Ihr Fotoprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Stilwünsche">
            <FormTextarea
              value={formData.stylePreferences || ''}
              onChange={value => handleInputChange('stylePreferences', value)}
              placeholder="Besondere Stilwünsche oder Vorstellungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Outfit-Wünsche">
            <FormTextarea
              value={formData.outfitPreferences || ''}
              onChange={value => handleInputChange('outfitPreferences', value)}
              placeholder="Gewünschte Outfits oder Kleidungsstil"
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
          <FormField label="Inspiration">
            <FormTextarea
              value={formData.inspiration || ''}
              onChange={value => handleInputChange('inspiration', value)}
              placeholder="Inspiration oder Referenzen"
              rows={3}
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
      </div>
    </div>
  );
};

export default FotografForm;
