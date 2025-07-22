// src/components/ContactBlock.tsx
'use client';

import { useTaskiloContacts } from '@/hooks/useTaskiloContacts';
import { useEffect, useState } from 'react';

interface ContactBlockProps {
  variant?: 'full' | 'compact' | 'agb';
  className?: string;
}

interface ContactInfo {
  legal: string;
  support: string;
  tech: string;
  privacy: string;
  business: string;
  billing: string;
  info: string;
  disputes: string;
  press: string;
}

export const ContactBlock: React.FC<ContactBlockProps> = ({ variant = 'full', className = '' }) => {
  const { contacts, loading, error, getContactBlock } = useTaskiloContacts();
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  useEffect(() => {
    if (contacts.length > 0) {
      setContactInfo(getContactBlock());
    }
  }, [contacts, getContactBlock]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-white/20 rounded mb-2"></div>
        <div className="h-4 bg-white/20 rounded mb-2 w-3/4"></div>
        <div className="h-4 bg-white/20 rounded mb-2 w-1/2"></div>
      </div>
    );
  }

  if (error || !contactInfo) {
    return (
      <div className={`text-red-300 ${className}`}>
        <p>⚠️ Kontaktinformationen konnten nicht geladen werden.</p>
        <p className="text-xs mt-1">Fallback: legal@taskilo.com</p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`text-sm space-y-1 ${className}`}>
        <p>
          <strong>Support:</strong> {contactInfo.support}
        </p>
        <p>
          <strong>Legal:</strong> {contactInfo.legal}
        </p>
        <p>
          <strong>Privacy:</strong> {contactInfo.privacy}
        </p>
      </div>
    );
  }

  if (variant === 'agb') {
    return (
      <div className={`text-sm text-white/90 drop-shadow-lg space-y-2 ${className}`}>
        <div className="mt-4 space-y-1">
          <p>
            <strong>Weitere Kontaktmöglichkeiten:</strong>
          </p>
          <p>Allgemeiner Support: {contactInfo.support}</p>
          <p>Technischer Support: {contactInfo.tech}</p>
          <p>Datenschutzanfragen: {contactInfo.privacy}</p>
          <p>Geschäftsanfragen: {contactInfo.business}</p>
          <p>Rechnungsfragen: {contactInfo.billing}</p>
        </div>

        <div className="mt-6 space-y-2">
          <p>
            <strong>Spezielle Kontaktadressen:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
            <li>
              <strong>Allgemeine Anfragen:</strong> {contactInfo.info}
            </li>
            <li>
              <strong>Technischer Support:</strong> {contactInfo.support}
            </li>
            <li>
              <strong>Rechtliche Angelegenheiten:</strong> {contactInfo.legal}
            </li>
            <li>
              <strong>Datenschutz:</strong> {contactInfo.privacy}
            </li>
            <li>
              <strong>Beschwerden & Mediation:</strong> {contactInfo.disputes}
            </li>
            <li>
              <strong>Presse & Medien:</strong> {contactInfo.press}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-white">Hauptkontakte</h4>
          <div className="text-sm space-y-1">
            <p>
              <strong>Legal:</strong> {contactInfo.legal}
            </p>
            <p>
              <strong>Support:</strong> {contactInfo.support}
            </p>
            <p>
              <strong>Technical:</strong> {contactInfo.tech}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white">Spezielle Abteilungen</h4>
          <div className="text-sm space-y-1">
            <p>
              <strong>Privacy:</strong> {contactInfo.privacy}
            </p>
            <p>
              <strong>Business:</strong> {contactInfo.business}
            </p>
            <p>
              <strong>Billing:</strong> {contactInfo.billing}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 pt-4">
        <h4 className="font-semibold text-white mb-2">Weitere Kontakte</h4>
        <div className="text-sm space-y-1">
          <p>
            <strong>Info:</strong> {contactInfo.info}
          </p>
          <p>
            <strong>Disputes:</strong> {contactInfo.disputes}
          </p>
          <p>
            <strong>Press:</strong> {contactInfo.press}
          </p>
        </div>
      </div>
    </div>
  );
};
