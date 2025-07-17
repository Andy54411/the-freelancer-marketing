import React, { useState, useEffect } from 'react';
import { NachhilfeData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface NachhilfeleherFormProps {
  data: NachhilfeData;
  onDataChange: (data: NachhilfeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const NachhilfeleherForm: React.FC<NachhilfeleherFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<NachhilfeData>(data);

  const subjectOptions = [
    { value: 'mathematik', label: 'Mathematik' },
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'latein', label: 'Latein' },
    { value: 'physik', label: 'Physik' },
    { value: 'chemie', label: 'Chemie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'geschichte', label: 'Geschichte' },
    { value: 'geographie', label: 'Geographie' },
    { value: 'informatik', label: 'Informatik' },
    { value: 'wirtschaft', label: 'Wirtschaft' },
    { value: 'buchhaltung', label: 'Buchhaltung' },
    { value: 'rechnungswesen', label: 'Rechnungswesen' },
    { value: 'philosophie', label: 'Philosophie' },
    { value: 'sozialkunde', label: 'Sozialkunde' },
    { value: 'religion', label: 'Religion' },
    { value: 'kunst', label: 'Kunst' },
    { value: 'musik', label: 'Musik' },
    { value: 'sport', label: 'Sport' },
    { value: 'andere', label: 'Andere Fächer' },
  ];

  const schoolLevelOptions = [
    { value: 'grundschule', label: 'Grundschule (1.-4. Klasse)' },
    { value: 'hauptschule', label: 'Hauptschule (5.-9. Klasse)' },
    { value: 'realschule', label: 'Realschule (5.-10. Klasse)' },
    { value: 'gymnasium', label: 'Gymnasium (5.-12. Klasse)' },
    { value: 'gesamtschule', label: 'Gesamtschule' },
    { value: 'berufsschule', label: 'Berufsschule' },
    { value: 'fachoberschule', label: 'Fachoberschule' },
    { value: 'berufsoberschule', label: 'Berufsoberschule' },
    { value: 'universität', label: 'Universität' },
    { value: 'fachhochschule', label: 'Fachhochschule' },
    { value: 'erwachsenenbildung', label: 'Erwachsenenbildung' },
  ];

  const gradeOptions = [
    { value: '1', label: '1. Klasse' },
    { value: '2', label: '2. Klasse' },
    { value: '3', label: '3. Klasse' },
    { value: '4', label: '4. Klasse' },
    { value: '5', label: '5. Klasse' },
    { value: '6', label: '6. Klasse' },
    { value: '7', label: '7. Klasse' },
    { value: '8', label: '8. Klasse' },
    { value: '9', label: '9. Klasse' },
    { value: '10', label: '10. Klasse' },
    { value: '11', label: '11. Klasse' },
    { value: '12', label: '12. Klasse' },
    { value: '13', label: '13. Klasse' },
    { value: 'studium', label: 'Studium' },
  ];

  const tutorTypeOptions = [
    { value: 'student', label: 'Student' },
    { value: 'lehrer', label: 'Lehrer' },
    { value: 'pensionär', label: 'Pensionierter Lehrer' },
    { value: 'fachkraft', label: 'Fachkraft' },
    { value: 'nachhilfeinstitut', label: 'Nachhilfeinstitut' },
    { value: 'egal', label: 'Egal' },
  ];

  const sessionTypeOptions = [
    { value: 'einzelunterricht', label: 'Einzelunterricht' },
    { value: 'gruppenunterricht', label: 'Gruppenunterricht (2-3 Schüler)' },
    { value: 'kleingruppe', label: 'Kleingruppe (4-6 Schüler)' },
    { value: 'online', label: 'Online-Nachhilfe' },
    { value: 'prüfungsvorbereitung', label: 'Prüfungsvorbereitung' },
    { value: 'hausaufgabenbetreuung', label: 'Hausaufgabenbetreuung' },
    { value: 'ferienkurs', label: 'Ferienkurs' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'mehrmals_woche', label: 'Mehrmals pro Woche' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
    { value: 'vor_prüfungen', label: 'Vor Prüfungen' },
  ];

  const durationOptions = [
    { value: '45', label: '45 Minuten' },
    { value: '60', label: '60 Minuten' },
    { value: '90', label: '90 Minuten' },
    { value: '120', label: '120 Minuten' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const locationOptions = [
    { value: 'schüler_zuhause', label: 'Beim Schüler zu Hause' },
    { value: 'lehrer_zuhause', label: 'Beim Lehrer zu Hause' },
    { value: 'öffentlich', label: 'Öffentlicher Ort (Bibliothek, Café)' },
    { value: 'online', label: 'Online' },
    { value: 'nachhilfeinstitut', label: 'Nachhilfeinstitut' },
    { value: 'schule', label: 'In der Schule' },
  ];
  const learningDifficultiesOptions = [
    { value: 'legasthenie', label: 'Legasthenie' },
    { value: 'dyskalkulie', label: 'Dyskalkulie' },
    { value: 'adhs', label: 'ADHS' },
    { value: 'ads', label: 'ADS' },
    { value: 'autismus', label: 'Autismus-Spektrum' },
    { value: 'konzentrationsschwäche', label: 'Konzentrationsschwäche' },
    { value: 'hochbegabung', label: 'Hochbegabung' },
    { value: 'keine', label: 'Keine besonderen Schwierigkeiten' },
  ];

  const currentGradeOptions = [
    { value: '1', label: 'Note 1 (sehr gut)' },
    { value: '2', label: 'Note 2 (gut)' },
    { value: '3', label: 'Note 3 (befriedigend)' },
    { value: '4', label: 'Note 4 (ausreichend)' },
    { value: '5', label: 'Note 5 (mangelhaft)' },
    { value: '6', label: 'Note 6 (ungenügend)' },
    { value: 'unbekannt', label: 'Unbekannt' },
  ];

  const goalOptions = [
    { value: 'notenverbesserung', label: 'Notenverbesserung' },
    { value: 'prüfungsvorbereitung', label: 'Prüfungsvorbereitung' },
    { value: 'abitur', label: 'Abiturvorbereitung' },
    { value: 'mittlere_reife', label: 'Mittlere Reife' },
    { value: 'hauptschulabschluss', label: 'Hauptschulabschluss' },
    { value: 'hausaufgabenhilfe', label: 'Hausaufgabenhilfe' },
    { value: 'verständnis', label: 'Verständnis verbessern' },
    { value: 'motivation', label: 'Motivation steigern' },
    { value: 'lernmethoden', label: 'Lernmethoden erlernen' },
    { value: 'selbstvertrauen', label: 'Selbstvertrauen stärken' },
  ];

  const availabilityOptions = [
    { value: 'werktags_vormittag', label: 'Werktags vormittag' },
    { value: 'werktags_nachmittag', label: 'Werktags nachmittag' },
    { value: 'werktags_abend', label: 'Werktags abend' },
    { value: 'samstag', label: 'Samstag' },
    { value: 'sonntag', label: 'Sonntag' },
    { value: 'ferien', label: 'Ferien' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof NachhilfeData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.subject &&
      formData.schoolLevel &&
      formData.grade &&
      formData.sessionType &&
      formData.frequency &&
      formData.duration &&
      formData.location &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Nachhilfe-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Fach" required>
            <FormSelect
              value={formData.subject || ''}
              onChange={value => handleInputChange('subject', value)}
              options={subjectOptions}
              placeholder="Wählen Sie das Fach"
            />
          </FormField>

          <FormField label="Schultyp" required>
            <FormSelect
              value={formData.schoolLevel || ''}
              onChange={value => handleInputChange('schoolLevel', value)}
              options={schoolLevelOptions}
              placeholder="Wählen Sie den Schultyp"
            />
          </FormField>

          <FormField label="Klassenstufe" required>
            <FormSelect
              value={formData.grade || ''}
              onChange={value => handleInputChange('grade', value)}
              options={gradeOptions}
              placeholder="Wählen Sie die Klassenstufe"
            />
          </FormField>

          <FormField label="Art der Nachhilfe" required>
            <FormSelect
              value={formData.sessionType || ''}
              onChange={value => handleInputChange('sessionType', value)}
              options={sessionTypeOptions}
              placeholder="Wählen Sie die Art der Nachhilfe"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>

          <FormField label="Dauer pro Einheit" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Dauer"
            />
          </FormField>

          <FormField label="Ort der Nachhilfe" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wählen Sie den Ort"
            />
          </FormField>
          <FormField label="Gewünschter Nachhilfelehrer">
            <FormSelect
              value={formData.tutorType || ''}
              onChange={value => handleInputChange('tutorType', value)}
              options={tutorTypeOptions}
              placeholder="Wählen Sie den Typ"
            />
          </FormField>

          <FormField label="Aktuelle Note im Fach">
            <FormSelect
              value={formData.currentGrade || ''}
              onChange={value => handleInputChange('currentGrade', value)}
              options={currentGradeOptions}
              placeholder="Wählen Sie die aktuelle Note"
            />
          </FormField>

          <FormField label="Name des Schülers">
            <FormInput
              type="text"
              value={formData.studentName || ''}
              onChange={value => handleInputChange('studentName', value)}
              placeholder="Name des Schülers"
            />
          </FormField>

          <FormField label="Alter des Schülers">
            <FormInput
              type="number"
              value={formData.studentAge?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'studentAge',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Alter des Schülers"
            />
          </FormField>

          <FormField label="Adresse">
            <FormInput
              type="text"
              value={formData.address || ''}
              onChange={value => handleInputChange('address', value)}
              placeholder="Straße, PLZ, Ort"
            />
          </FormField>

          <FormField label="Schule">
            <FormInput
              type="text"
              value={formData.school || ''}
              onChange={value => handleInputChange('school', value)}
              placeholder="Name der Schule"
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

          <FormField label="Weitere Fächer">
            <FormInput
              type="text"
              value={formData.additionalSubjects || ''}
              onChange={value => handleInputChange('additionalSubjects', value)}
              placeholder="Weitere Fächer (kommagetrennt)"
            />
          </FormField>

          <FormField label="Gewünschte Geschlecht">
            <FormInput
              type="text"
              value={formData.preferredGender || ''}
              onChange={value => handleInputChange('preferredGender', value)}
              placeholder="Männlich, Weiblich, Egal"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lernschwierigkeiten">
            <FormCheckboxGroup
              value={formData.learningDifficulties || []}
              onChange={value => handleInputChange('learningDifficulties', value)}
              options={learningDifficultiesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ziele">
            <FormCheckboxGroup
              value={formData.goals || []}
              onChange={value => handleInputChange('goals', value)}
              options={goalOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Verfügbarkeit">
            <FormCheckboxGroup
              value={formData.availability || []}
              onChange={value => handleInputChange('availability', value)}
              options={availabilityOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Nachhilfe-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lernschwierigkeiten Details">
            <FormTextarea
              value={formData.learningDifficultiesDetails || ''}
              onChange={value => handleInputChange('learningDifficultiesDetails', value)}
              placeholder="Detaillierte Beschreibung der Lernschwierigkeiten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Probleme">
            <FormTextarea
              value={formData.currentProblems || ''}
              onChange={value => handleInputChange('currentProblems', value)}
              placeholder="Welche Probleme bestehen aktuell im Fach?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Motivation des Schülers">
            <FormTextarea
              value={formData.studentMotivation || ''}
              onChange={value => handleInputChange('studentMotivation', value)}
              placeholder="Wie motiviert ist der Schüler?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lernverhalten">
            <FormTextarea
              value={formData.learningBehavior || ''}
              onChange={value => handleInputChange('learningBehavior', value)}
              placeholder="Beschreibung des Lernverhaltens"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Elternerwartungen">
            <FormTextarea
              value={formData.parentExpectations || ''}
              onChange={value => handleInputChange('parentExpectations', value)}
              placeholder="Erwartungen der Eltern"
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

        <div className="mt-4"></div>

        <div className="mt-4">
          <FormField label="Geschlecht des Schülers">
            <FormRadioGroup
              name="studentGender"
              value={formData.studentGender || ''}
              onChange={value => handleInputChange('studentGender', value)}
              options={[
                { value: 'männlich', label: 'Männlich' },
                { value: 'weiblich', label: 'Weiblich' },
                { value: 'divers', label: 'Divers' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Online-Nachhilfe möglich">
            <FormRadioGroup
              name="onlineTutoringPossible"
              value={formData.onlineTutoringPossible || ''}
              onChange={value => handleInputChange('onlineTutoringPossible', value)}
              options={[
                { value: 'ja', label: 'Ja, Online-Nachhilfe möglich' },
                { value: 'nein', label: 'Nein, nur Präsenz' },
                { value: 'beides', label: 'Beides möglich' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Hausaufgabenbetreuung">
            <FormRadioGroup
              name="homeworkSupport"
              value={formData.homeworkSupport || ''}
              onChange={value => handleInputChange('homeworkSupport', value)}
              options={[
                { value: 'ja', label: 'Ja, Hausaufgabenbetreuung gewünscht' },
                { value: 'nein', label: 'Nein, nur Nachhilfe' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Langfristige Betreuung">
            <FormRadioGroup
              name="longTermSupport"
              value={formData.longTermSupport || ''}
              onChange={value => handleInputChange('longTermSupport', value)}
              options={[
                { value: 'ja', label: 'Ja, langfristige Betreuung' },
                { value: 'nein', label: 'Nein, kurzfristig' },
                { value: 'unbekannt', label: 'Noch unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Probestunde gewünscht">
            <FormRadioGroup
              name="trialLessonRequested"
              value={formData.trialLessonRequested || ''}
              onChange={value => handleInputChange('trialLessonRequested', value)}
              options={[
                { value: 'ja', label: 'Ja, Probestunde gewünscht' },
                { value: 'nein', label: 'Nein, direkt beginnen' },
                { value: 'egal', label: 'Egal' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default NachhilfeleherForm;
