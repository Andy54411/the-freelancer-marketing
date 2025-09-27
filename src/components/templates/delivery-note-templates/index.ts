export { default as DeliveryNoteTemplate } from '../invoice-templates/ProfessionalBusinessTemplate';

export const AVAILABLE_DELIVERY_NOTE_TEMPLATES = [
  {
    id: 'professional-business',
    name: 'Professionelles Geschäftstemplate',
    description: 'Klassisches Template für Geschäftsdokumente',
  },
];

// Universelles Template für Lieferscheine (delivery notes)
// Verwendet das gleiche ProfessionalBusinessTemplate wie Rechnungen und Angebote
