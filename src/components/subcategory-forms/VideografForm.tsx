import React, { useState, useEffect } from 'react';
import { VideografData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface VideografFormProps {
  data: VideografData;
  onDataChange: (data: VideografData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const VideografForm: React.FC<VideografFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<VideografData>(data);

  const serviceTypeOptions = [
    { value: 'hochzeitsvideo', label: 'Hochzeitsvideo' },
    { value: 'eventvideo', label: 'Eventvideo' },
    { value: 'unternehmensvideo', label: 'Unternehmensvideo' },
    { value: 'produktvideo', label: 'Produktvideo' },
    { value: 'imagefilm', label: 'Imagefilm' },
    { value: 'werbefilm', label: 'Werbefilm' },
    { value: 'dokumentation', label: 'Dokumentation' },
    { value: 'musikvideo', label: 'Musikvideo' },
    { value: 'schulungsvideo', label: 'Schulungsvideo' },
    { value: 'immobilienvideo', label: 'Immobilienvideo' },
    { value: 'drohnenaufnahmen', label: 'Drohnenaufnahmen' },
    { value: 'livestream', label: 'Livestream' },
    { value: 'interview', label: 'Interview' },
    { value: 'social_media', label: 'Social Media Video' },
    { value: 'andere', label: 'Andere' },
  ];

  const videoTypeOptions = [
    { value: 'trailer', label: 'Trailer' },
    { value: 'highlights', label: 'Highlights' },
    { value: 'vollversion', label: 'Vollversion' },
    { value: 'kurzvideo', label: 'Kurzvideo' },
    { value: 'langvideo', label: 'Langvideo' },
    { value: 'serie', label: 'Serie' },
    { value: 'einzelvideo', label: 'Einzelvideo' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_500', label: 'Unter 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2000', label: '1000€ - 2000€' },
    { value: '2000_5000', label: '2000€ - 5000€' },
    { value: '5000_10000', label: '5000€ - 10000€' },
    { value: 'über_10000', label: 'Über 10000€' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const durationOptions = [
    { value: 'unter_30s', label: 'Unter 30 Sekunden' },
    { value: '30s_1min', label: '30 Sekunden - 1 Minute' },
    { value: '1_3min', label: '1-3 Minuten' },
    { value: '3_10min', label: '3-10 Minuten' },
    { value: '10_30min', label: '10-30 Minuten' },
    { value: 'über_30min', label: 'Über 30 Minuten' },
  ];

  const qualityOptions = [
    { value: 'hd', label: 'HD (1080p)' },
    { value: '4k', label: '4K (Ultra HD)' },
    { value: '8k', label: '8K' },
    { value: 'standard', label: 'Standard' },
    { value: 'cinema', label: 'Cinema Quality' },
    { value: 'web', label: 'Web Quality' },
  ];

  const formatOptions = [
    { value: 'mp4', label: 'MP4' },
    { value: 'mov', label: 'MOV' },
    { value: 'avi', label: 'AVI' },
    { value: 'mkv', label: 'MKV' },
    { value: 'wmv', label: 'WMV' },
    { value: 'andere', label: 'Andere' },
  ];

  const styleOptions = [
    { value: 'dokumentarisch', label: 'Dokumentarisch' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'modern', label: 'Modern' },
    { value: 'klassisch', label: 'Klassisch' },
    { value: 'künstlerisch', label: 'Künstlerisch' },
    { value: 'natural', label: 'Natural' },
    { value: 'dramatisch', label: 'Dramatisch' },
    { value: 'emotional', label: 'Emotional' },
    { value: 'professionell', label: 'Professionell' },
    { value: 'casual', label: 'Casual' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'schnitt', label: 'Schnitt' },
    { value: 'farbkorrektur', label: 'Farbkorrektur' },
    { value: 'audiomischung', label: 'Audiomischung' },
    { value: 'musik', label: 'Musik' },
    { value: 'voiceover', label: 'Voice-over' },
    { value: 'untertitel', label: 'Untertitel' },
    { value: 'animationen', label: 'Animationen' },
    { value: 'titel', label: 'Titel' },
    { value: 'grafiken', label: 'Grafiken' },
    { value: 'special_effects', label: 'Special Effects' },
    { value: 'slow_motion', label: 'Slow Motion' },
    { value: 'time_lapse', label: 'Time Lapse' },
    { value: 'stabilisierung', label: 'Stabilisierung' },
    { value: 'noise_reduction', label: 'Noise Reduction' },
    { value: 'green_screen', label: 'Green Screen' },
    { value: 'multi_cam', label: 'Multi-Cam' },
    { value: 'drohne', label: 'Drohnenaufnahmen' },
    { value: 'gimbal', label: 'Gimbal' },
    { value: 'slider', label: 'Slider' },
    { value: 'steady_cam', label: 'Steady Cam' },
    { value: 'crane', label: 'Crane' },
    { value: 'dolly', label: 'Dolly' },
    { value: 'beleuchtung', label: 'Beleuchtung' },
    { value: 'ton', label: 'Ton' },
    { value: 'mikrofon', label: 'Mikrofon' },
    { value: 'audio_equipment', label: 'Audio Equipment' },
    { value: 'regie', label: 'Regie' },
    { value: 'kamera_mann', label: 'Kameramann' },
    { value: 'assistenz', label: 'Assistenz' },
    { value: 'makeup', label: 'Make-up' },
    { value: 'styling', label: 'Styling' },
    { value: 'requisiten', label: 'Requisiten' },
    { value: 'location_scouting', label: 'Location Scouting' },
    { value: 'genehmigungen', label: 'Genehmigungen' },
    { value: 'versicherung', label: 'Versicherung' },
    { value: 'transport', label: 'Transport' },
    { value: 'catering', label: 'Catering' },
    { value: 'übernachtung', label: 'Übernachtung' },
    { value: 'backup', label: 'Backup' },
    { value: 'archivierung', label: 'Archivierung' },
    { value: 'dvd', label: 'DVD' },
    { value: 'blu_ray', label: 'Blu-ray' },
    { value: 'usb', label: 'USB-Stick' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'streaming', label: 'Streaming' },
    { value: 'upload', label: 'Upload' },
    { value: 'social_media_format', label: 'Social Media Format' },
    { value: 'web_format', label: 'Web Format' },
    { value: 'mobile_format', label: 'Mobile Format' },
    { value: 'trailer_schnitt', label: 'Trailer-Schnitt' },
    { value: 'teaser', label: 'Teaser' },
    { value: 'highlights', label: 'Highlights' },
    { value: 'behind_scenes', label: 'Behind the Scenes' },
    { value: 'making_of', label: 'Making of' },
    { value: 'interview', label: 'Interview' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'case_study', label: 'Case Study' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'how_to', label: 'How-to' },
    { value: 'product_demo', label: 'Product Demo' },
    { value: 'service_demo', label: 'Service Demo' },
    { value: 'company_intro', label: 'Company Intro' },
    { value: 'team_intro', label: 'Team Intro' },
    { value: 'recruiting', label: 'Recruiting' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'training', label: 'Training' },
    { value: 'schulung', label: 'Schulung' },
    { value: 'webinar', label: 'Webinar' },
    { value: 'präsentation', label: 'Präsentation' },
    { value: 'pitch', label: 'Pitch' },
    { value: 'elevator_pitch', label: 'Elevator Pitch' },
    { value: 'crowdfunding', label: 'Crowdfunding' },
    { value: 'kickstarter', label: 'Kickstarter' },
    { value: 'indiegogo', label: 'Indiegogo' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof VideografData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.videoType &&
      formData.budgetRange &&
      formData.urgency &&
      formData.duration &&
      formData.quality &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Videograf-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Videoproduktion" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Videoproduktion"
            />
          </FormField>

          <FormField label="Video-Typ" required>
            <FormSelect
              value={formData.videoType || ''}
              onChange={value => handleInputChange('videoType', value)}
              options={videoTypeOptions}
              placeholder="Wählen Sie den Video-Typ"
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

          <FormField label="Video-Dauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Video-Dauer"
            />
          </FormField>

          <FormField label="Qualität" required>
            <FormSelect
              value={formData.quality || ''}
              onChange={value => handleInputChange('quality', value)}
              options={qualityOptions}
              placeholder="Wählen Sie die Qualität"
            />
          </FormField>

          <FormField label="Format">
            <FormSelect
              value={formData.format || ''}
              onChange={value => handleInputChange('format', value)}
              options={formatOptions}
              placeholder="Wählen Sie das Format"
            />
          </FormField>

          <FormField label="Stil">
            <FormSelect
              value={formData.style || ''}
              onChange={value => handleInputChange('style', value)}
              options={styleOptions}
              placeholder="Wählen Sie den Stil"
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

          <FormField label="Anzahl Kameras">
            <FormInput
              type="number"
              value={formData.numberOfCameras?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfCameras',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Kameras"
            />
          </FormField>

          <FormField label="Drehtage">
            <FormInput
              type="number"
              value={formData.shootingDays?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'shootingDays',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Drehtage"
            />
          </FormField>

          <FormField label="Bearbeitungszeit">
            <FormInput
              type="text"
              value={formData.editingTime || ''}
              onChange={value => handleInputChange('editingTime', value)}
              placeholder="Gewünschte Bearbeitungszeit"
            />
          </FormField>

          <FormField label="Liefertermin">
            <FormInput
              type="text"
              value={formData.deliveryDate || ''}
              onChange={value => handleInputChange('deliveryDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Musik gewünscht">
            <FormRadioGroup
              name="music"
              value={formData.music || ''}
              onChange={value => handleInputChange('music', value)}
              options={[
                { value: 'ja', label: 'Ja, Musik gewünscht' },
                { value: 'nein', label: 'Nein, keine Musik' },
                { value: 'eigene', label: 'Eigene Musik' },
                { value: 'lizenzfrei', label: 'Lizenzfreie Musik' },
              ]}
            />
          </FormField>

          <FormField label="Voice-over gewünscht">
            <FormRadioGroup
              name="voiceover"
              value={formData.voiceover || ''}
              onChange={value => handleInputChange('voiceover', value)}
              options={[
                { value: 'ja', label: 'Ja, Voice-over gewünscht' },
                { value: 'nein', label: 'Nein, kein Voice-over' },
                { value: 'professionell', label: 'Professioneller Sprecher' },
                { value: 'eigene', label: 'Eigene Stimme' },
              ]}
            />
          </FormField>

          <FormField label="Untertitel gewünscht">
            <FormRadioGroup
              name="subtitles"
              value={formData.subtitles || ''}
              onChange={value => handleInputChange('subtitles', value)}
              options={[
                { value: 'ja', label: 'Ja, Untertitel gewünscht' },
                { value: 'nein', label: 'Nein, keine Untertitel' },
                { value: 'deutsch', label: 'Deutsch' },
                { value: 'englisch', label: 'Englisch' },
                { value: 'mehrsprachig', label: 'Mehrsprachig' },
              ]}
            />
          </FormField>

          <FormField label="Animationen gewünscht">
            <FormRadioGroup
              name="animations"
              value={formData.animations || ''}
              onChange={value => handleInputChange('animations', value)}
              options={[
                { value: 'ja', label: 'Ja, Animationen gewünscht' },
                { value: 'nein', label: 'Nein, keine Animationen' },
                { value: 'logo', label: 'Logo-Animation' },
                { value: 'text', label: 'Text-Animation' },
                { value: 'grafiken', label: 'Grafik-Animation' },
              ]}
            />
          </FormField>

          <FormField label="Titel gewünscht">
            <FormRadioGroup
              name="titles"
              value={formData.titles || ''}
              onChange={value => handleInputChange('titles', value)}
              options={[
                { value: 'ja', label: 'Ja, Titel gewünscht' },
                { value: 'nein', label: 'Nein, keine Titel' },
                { value: 'einfach', label: 'Einfache Titel' },
                { value: 'animiert', label: 'Animierte Titel' },
              ]}
            />
          </FormField>

          <FormField label="Grafiken gewünscht">
            <FormRadioGroup
              name="graphics"
              value={formData.graphics || ''}
              onChange={value => handleInputChange('graphics', value)}
              options={[
                { value: 'ja', label: 'Ja, Grafiken gewünscht' },
                { value: 'nein', label: 'Nein, keine Grafiken' },
                { value: 'logo', label: 'Logo' },
                { value: 'diagramme', label: 'Diagramme' },
                { value: 'illustrationen', label: 'Illustrationen' },
              ]}
            />
          </FormField>

          <FormField label="Special Effects gewünscht">
            <FormRadioGroup
              name="specialEffects"
              value={formData.specialEffects || ''}
              onChange={value => handleInputChange('specialEffects', value)}
              options={[
                { value: 'ja', label: 'Ja, Special Effects gewünscht' },
                { value: 'nein', label: 'Nein, keine Special Effects' },
                { value: 'einfach', label: 'Einfache Effects' },
                { value: 'komplex', label: 'Komplexe Effects' },
              ]}
            />
          </FormField>

          <FormField label="Slow Motion gewünscht">
            <FormRadioGroup
              name="slowMotion"
              value={formData.slowMotion || ''}
              onChange={value => handleInputChange('slowMotion', value)}
              options={[
                { value: 'ja', label: 'Ja, Slow Motion gewünscht' },
                { value: 'nein', label: 'Nein, normale Geschwindigkeit' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Time Lapse gewünscht">
            <FormRadioGroup
              name="timeLapse"
              value={formData.timeLapse || ''}
              onChange={value => handleInputChange('timeLapse', value)}
              options={[
                { value: 'ja', label: 'Ja, Time Lapse gewünscht' },
                { value: 'nein', label: 'Nein, normale Geschwindigkeit' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Stabilisierung gewünscht">
            <FormRadioGroup
              name="stabilization"
              value={formData.stabilization || ''}
              onChange={value => handleInputChange('stabilization', value)}
              options={[
                { value: 'ja', label: 'Ja, Stabilisierung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'automatisch', label: 'Automatische Stabilisierung' },
              ]}
            />
          </FormField>

          <FormField label="Noise Reduction gewünscht">
            <FormRadioGroup
              name="noiseReduction"
              value={formData.noiseReduction || ''}
              onChange={value => handleInputChange('noiseReduction', value)}
              options={[
                { value: 'ja', label: 'Ja, Noise Reduction gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'automatisch', label: 'Automatische Reduzierung' },
              ]}
            />
          </FormField>

          <FormField label="Green Screen gewünscht">
            <FormRadioGroup
              name="greenScreen"
              value={formData.greenScreen || ''}
              onChange={value => handleInputChange('greenScreen', value)}
              options={[
                { value: 'ja', label: 'Ja, Green Screen gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Multi-Cam gewünscht">
            <FormRadioGroup
              name="multiCam"
              value={formData.multiCam || ''}
              onChange={value => handleInputChange('multiCam', value)}
              options={[
                { value: 'ja', label: 'Ja, Multi-Cam gewünscht' },
                { value: 'nein', label: 'Nein, Single-Cam' },
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

          <FormField label="Gimbal gewünscht">
            <FormRadioGroup
              name="gimbal"
              value={formData.gimbal || ''}
              onChange={value => handleInputChange('gimbal', value)}
              options={[
                { value: 'ja', label: 'Ja, Gimbal gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'abhängig', label: 'Abhängig von Aufnahme' },
              ]}
            />
          </FormField>

          <FormField label="Slider gewünscht">
            <FormRadioGroup
              name="slider"
              value={formData.slider || ''}
              onChange={value => handleInputChange('slider', value)}
              options={[
                { value: 'ja', label: 'Ja, Slider gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'abhängig', label: 'Abhängig von Aufnahme' },
              ]}
            />
          </FormField>

          <FormField label="Steady Cam gewünscht">
            <FormRadioGroup
              name="steadyCam"
              value={formData.steadyCam || ''}
              onChange={value => handleInputChange('steadyCam', value)}
              options={[
                { value: 'ja', label: 'Ja, Steady Cam gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'abhängig', label: 'Abhängig von Aufnahme' },
              ]}
            />
          </FormField>

          <FormField label="Crane gewünscht">
            <FormRadioGroup
              name="crane"
              value={formData.crane || ''}
              onChange={value => handleInputChange('crane', value)}
              options={[
                { value: 'ja', label: 'Ja, Crane gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'abhängig', label: 'Abhängig von Aufnahme' },
              ]}
            />
          </FormField>

          <FormField label="Dolly gewünscht">
            <FormRadioGroup
              name="dolly"
              value={formData.dolly || ''}
              onChange={value => handleInputChange('dolly', value)}
              options={[
                { value: 'ja', label: 'Ja, Dolly gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'abhängig', label: 'Abhängig von Aufnahme' },
              ]}
            />
          </FormField>

          <FormField label="Beleuchtung gewünscht">
            <FormRadioGroup
              name="lighting"
              value={formData.lighting || ''}
              onChange={value => handleInputChange('lighting', value)}
              options={[
                { value: 'ja', label: 'Ja, Beleuchtung gewünscht' },
                { value: 'nein', label: 'Nein, natürliches Licht' },
                { value: 'abhängig', label: 'Abhängig von Location' },
              ]}
            />
          </FormField>

          <FormField label="Ton gewünscht">
            <FormRadioGroup
              name="sound"
              value={formData.sound || ''}
              onChange={value => handleInputChange('sound', value)}
              options={[
                { value: 'ja', label: 'Ja, Ton gewünscht' },
                { value: 'nein', label: 'Nein, stumm' },
                { value: 'ambient', label: 'Ambient Sound' },
                { value: 'musik', label: 'Nur Musik' },
              ]}
            />
          </FormField>

          <FormField label="Mikrofon gewünscht">
            <FormRadioGroup
              name="microphone"
              value={formData.microphone || ''}
              onChange={value => handleInputChange('microphone', value)}
              options={[
                { value: 'ja', label: 'Ja, Mikrofon gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'lavalier', label: 'Lavalier-Mikrofon' },
                { value: 'richtmikrofon', label: 'Richtmikrofon' },
              ]}
            />
          </FormField>

          <FormField label="Audio Equipment gewünscht">
            <FormRadioGroup
              name="audioEquipment"
              value={formData.audioEquipment || ''}
              onChange={value => handleInputChange('audioEquipment', value)}
              options={[
                { value: 'ja', label: 'Ja, Audio Equipment gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'basic', label: 'Basic Equipment' },
                { value: 'professional', label: 'Professional Equipment' },
              ]}
            />
          </FormField>

          <FormField label="Regie gewünscht">
            <FormRadioGroup
              name="direction"
              value={formData.direction || ''}
              onChange={value => handleInputChange('direction', value)}
              options={[
                { value: 'ja', label: 'Ja, Regie gewünscht' },
                { value: 'nein', label: 'Nein, selbst Regie' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Kameramann gewünscht">
            <FormRadioGroup
              name="cameraman"
              value={formData.cameraman || ''}
              onChange={value => handleInputChange('cameraman', value)}
              options={[
                { value: 'ja', label: 'Ja, Kameramann gewünscht' },
                { value: 'nein', label: 'Nein, selbst filmen' },
                { value: 'mehrere', label: 'Mehrere Kameramänner' },
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
                { value: 'abhängig', label: 'Abhängig von Projekt' },
              ]}
            />
          </FormField>

          <FormField label="Make-up gewünscht">
            <FormRadioGroup
              name="makeup"
              value={formData.makeup || ''}
              onChange={value => handleInputChange('makeup', value)}
              options={[
                { value: 'ja', label: 'Ja, Make-up gewünscht' },
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

          <FormField label="Genehmigungen gewünscht">
            <FormRadioGroup
              name="permits"
              value={formData.permits || ''}
              onChange={value => handleInputChange('permits', value)}
              options={[
                { value: 'ja', label: 'Ja, Genehmigungen gewünscht' },
                { value: 'nein', label: 'Nein, bereits vorhanden' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Versicherung gewünscht">
            <FormRadioGroup
              name="insurance"
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              options={[
                { value: 'ja', label: 'Ja, Versicherung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Transport gewünscht">
            <FormRadioGroup
              name="transport"
              value={formData.transport || ''}
              onChange={value => handleInputChange('transport', value)}
              options={[
                { value: 'ja', label: 'Ja, Transport gewünscht' },
                { value: 'nein', label: 'Nein, eigener Transport' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Catering gewünscht">
            <FormRadioGroup
              name="catering"
              value={formData.catering || ''}
              onChange={value => handleInputChange('catering', value)}
              options={[
                { value: 'ja', label: 'Ja, Catering gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'selbst', label: 'Selbst organisiert' },
              ]}
            />
          </FormField>

          <FormField label="Übernachtung gewünscht">
            <FormRadioGroup
              name="accommodation"
              value={formData.accommodation || ''}
              onChange={value => handleInputChange('accommodation', value)}
              options={[
                { value: 'ja', label: 'Ja, Übernachtung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'selbst', label: 'Selbst organisiert' },
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
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'mehrfach', label: 'Mehrfach-Backup' },
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

          <FormField label="DVD gewünscht">
            <FormRadioGroup
              name="dvd"
              value={formData.dvd || ''}
              onChange={value => handleInputChange('dvd', value)}
              options={[
                { value: 'ja', label: 'Ja, DVD gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'mehrere', label: 'Mehrere Kopien' },
              ]}
            />
          </FormField>

          <FormField label="Blu-ray gewünscht">
            <FormRadioGroup
              name="bluRay"
              value={formData.bluRay || ''}
              onChange={value => handleInputChange('bluRay', value)}
              options={[
                { value: 'ja', label: 'Ja, Blu-ray gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'mehrere', label: 'Mehrere Kopien' },
              ]}
            />
          </FormField>

          <FormField label="USB-Stick gewünscht">
            <FormRadioGroup
              name="usb"
              value={formData.usb || ''}
              onChange={value => handleInputChange('usb', value)}
              options={[
                { value: 'ja', label: 'Ja, USB-Stick gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'mehrere', label: 'Mehrere Sticks' },
              ]}
            />
          </FormField>

          <FormField label="Cloud gewünscht">
            <FormRadioGroup
              name="cloud"
              value={formData.cloud || ''}
              onChange={value => handleInputChange('cloud', value)}
              options={[
                { value: 'ja', label: 'Ja, Cloud gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'passwort', label: 'Passwort-geschützt' },
              ]}
            />
          </FormField>

          <FormField label="Streaming gewünscht">
            <FormRadioGroup
              name="streaming"
              value={formData.streaming || ''}
              onChange={value => handleInputChange('streaming', value)}
              options={[
                { value: 'ja', label: 'Ja, Streaming gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'live', label: 'Live-Streaming' },
              ]}
            />
          </FormField>

          <FormField label="Upload gewünscht">
            <FormRadioGroup
              name="upload"
              value={formData.upload || ''}
              onChange={value => handleInputChange('upload', value)}
              options={[
                { value: 'ja', label: 'Ja, Upload gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'vimeo', label: 'Vimeo' },
                { value: 'social_media', label: 'Social Media' },
              ]}
            />
          </FormField>

          <FormField label="Social Media Format gewünscht">
            <FormRadioGroup
              name="socialMediaFormat"
              value={formData.socialMediaFormat || ''}
              onChange={value => handleInputChange('socialMediaFormat', value)}
              options={[
                { value: 'ja', label: 'Ja, Social Media Format gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'youtube', label: 'YouTube' },
              ]}
            />
          </FormField>

          <FormField label="Web Format gewünscht">
            <FormRadioGroup
              name="webFormat"
              value={formData.webFormat || ''}
              onChange={value => handleInputChange('webFormat', value)}
              options={[
                { value: 'ja', label: 'Ja, Web Format gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'responsive', label: 'Responsive' },
              ]}
            />
          </FormField>

          <FormField label="Mobile Format gewünscht">
            <FormRadioGroup
              name="mobileFormat"
              value={formData.mobileFormat || ''}
              onChange={value => handleInputChange('mobileFormat', value)}
              options={[
                { value: 'ja', label: 'Ja, Mobile Format gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'optimiert', label: 'Für Mobile optimiert' },
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
              placeholder="Beschreiben Sie Ihr Videoprojekt detailliert"
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
          <FormField label="Storyboard">
            <FormTextarea
              value={formData.storyboard || ''}
              onChange={value => handleInputChange('storyboard', value)}
              placeholder="Storyboard oder Ablaufplan"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Drehbuch">
            <FormTextarea
              value={formData.script || ''}
              onChange={value => handleInputChange('script', value)}
              placeholder="Drehbuch oder Skript"
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
          <FormField label="Referenzen">
            <FormTextarea
              value={formData.references || ''}
              onChange={value => handleInputChange('references', value)}
              placeholder="Referenzen oder Inspirationen"
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

export default VideografForm;
