'use client';

import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  FiLoader,
  FiSave,
  FiUser,
  FiImage,
  FiMapPin,
  FiEye,
  FiTrendingUp,
  FiAward,
  FiPackage,
  FiHelpCircle,
} from 'react-icons/fi';
import { toast } from 'sonner';
import { CompanyMetrics } from '@/lib/companyMetrics';

// Import der neuen modularen Komponenten
import ImageUploadsTab from './profile/ImageUploadsTab';
import BasicInfoTab from './profile/BasicInfoTab';
import FAQTab from './profile/FAQTab';
import ServicesTab from './profile/ServicesTab';
import PortfolioManager from './profile/PortfolioManager';
import SkillsEducationTab from './profile/SkillsEducationTab';
import { EditableCompanyProfile } from './profile/types';

interface CompanyProfileManagerProps {
  userData: EditableCompanyProfile;
  companyMetrics?: CompanyMetrics | null;
  onDataSaved: () => void;
}

const CompanyProfileManager: React.FC<CompanyProfileManagerProps> = ({
  userData,
  companyMetrics,
  onDataSaved,
}) => {
  const [profile, setProfile] = useState<EditableCompanyProfile | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      const defaultWorkingHours = [
        { day: 'Montag', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Dienstag', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Mittwoch', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Donnerstag', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Freitag', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Samstag', isOpen: false, openTime: '09:00', closeTime: '17:00' },
        { day: 'Sonntag', isOpen: false, openTime: '09:00', closeTime: '17:00' },
      ];

      setProfile({
        uid: userData.uid,
        username: userData.username || '',
        displayName: userData.displayName || '',
        companyName: userData.companyName || '',
        photoURL: userData.photoURL || '',
        companyLogo: userData.companyLogo || '',
        description: userData.description || '',
        country: userData.country || '',
        city: userData.city || '',
        postalCode: userData.postalCode || '',
        street: userData.street || '',
        fullAddress: userData.fullAddress || '',
        latitude: userData.latitude || undefined,
        longitude: userData.longitude || undefined,
        hourlyRate: userData.hourlyRate || 0,
        portfolio: userData.portfolio || [],
        languages: userData.languages || [],
        skills: userData.skills || [],
        education: userData.education || [],
        certifications: userData.certifications || [],
        publicDescription: userData.publicDescription || '',
        specialties: userData.specialties || [],
        servicePackages: userData.servicePackages || [],
        workingHours: userData.workingHours || defaultWorkingHours,
        instantBooking: userData.instantBooking || false,
        responseTimeGuarantee: userData.responseTimeGuarantee || 24,
        faqs: userData.faqs || [],
        profileBannerImage: userData.profileBannerImage || '',
        businessLicense: userData.businessLicense || '',
      });
    }
  }, [userData]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const companyRef = doc(db, 'companies', profile.uid);
      await updateDoc(companyRef, {
        // Grunddaten (Company Basis-Informationen)
        companyName: profile.companyName,
        description: profile.description,
        profilePictureURL: profile.photoURL,
        companyLogo: profile.companyLogo,
        publicDescription: profile.publicDescription,

        // Standort-Daten (existierende Struktur erweitern)
        companyCountry: profile.country,
        companyCity: profile.city,
        companyPostalCode: profile.postalCode || '',
        companyStreet: profile.street || '',
        postalCode: profile.postalCode || '', // Backup für existierendes Feld
        fullAddress: profile.fullAddress || '',
        lat: profile.latitude || null,
        lng: profile.longitude || null,

        // Business-Daten
        hourlyRate: profile.hourlyRate,
        businessLicense: profile.businessLicense,

        // Skills & Bildung (neue Felder)
        languages: profile.languages,
        skills: profile.skills,
        education: profile.education,
        certifications: profile.certifications,
        specialties: profile.specialties,

        // Services & Angebote (neue Felder)
        servicePackages: profile.servicePackages,
        workingHours: profile.workingHours,
        instantBooking: profile.instantBooking,
        responseTimeGuarantee: profile.responseTimeGuarantee,

        // Portfolio & Medien (neue Felder)
        portfolio: profile.portfolio,
        profileBannerImage: profile.profileBannerImage,

        // FAQ (neue Felder)
        faqs: profile.faqs,

        // Meta-Daten (existierende Struktur)
        updatedAt: new Date(),
        profileLastUpdatedAt: new Date(),
        lastUpdated: new Date(), // Backup für existierendes Feld
      });

      toast.success('Company Profile wurde erfolgreich aktualisiert!');
      onDataSaved();
    } catch (error) {
      console.error('Fehler beim Speichern des Profils:', error);
      toast.error('Fehler beim Speichern des Profils');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
      </div>
    );
  }

  const tabs = [
    { id: 'images', label: 'Bilder & Logo', icon: FiImage },
    { id: 'basic', label: 'Grunddaten', icon: FiUser },
    { id: 'skills', label: 'Skills & Bildung', icon: FiAward },
    { id: 'services', label: 'Services & Angebote', icon: FiPackage },
    { id: 'faq', label: 'FAQ', icon: FiHelpCircle },
    { id: 'portfolio', label: 'Portfolio', icon: FiImage },
    { id: 'metrics', label: 'Statistiken', icon: FiTrendingUp },
  ];

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header mit Unternehmensinfo und Save Button */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Quick Logo Preview */}
            <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-50 flex items-center justify-center">
              {profile.companyLogo ? (
                <img
                  src={profile.companyLogo}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <FiImage className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.companyName || profile.displayName || 'Unternehmensprofil'}
              </h1>
              <p className="text-gray-600">
                {profile.city}, {profile.country}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#14ad9f] hover:bg-[#129488] text-white rounded-md font-medium flex items-center space-x-2 disabled:opacity-50"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
            <span>{saving ? 'Speichert...' : 'Speichern'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-[#14ad9f] text-[#14ad9f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'images' && <ImageUploadsTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'basic' && <BasicInfoTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'skills' && <SkillsEducationTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'services' && <ServicesTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'faq' && <FAQTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'portfolio' && (
          <PortfolioManager profile={profile} setProfile={setProfile} />
        )}

        {activeTab === 'metrics' && companyMetrics && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Unternehmens-Statistiken</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Durchschnittliche Bewertung</div>
                <div className="text-2xl font-bold text-gray-900">
                  {companyMetrics.averageRating?.toFixed(1) || 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Gesamte Aufträge</div>
                <div className="text-2xl font-bold text-gray-900">
                  {companyMetrics.totalOrders || 0}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Abschlussrate</div>
                <div className="text-2xl font-bold text-gray-900">
                  {companyMetrics.completionRate?.toFixed(1) || 0}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyProfileManager;
