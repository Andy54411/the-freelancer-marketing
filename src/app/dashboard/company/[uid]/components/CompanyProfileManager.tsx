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
} from 'react-icons/fi';
import { toast } from 'sonner';
import { CompanyMetrics } from '@/lib/companyMetrics';

// Import der neuen modularen Komponenten
import ProfileImageUpload from './profile/ProfileImageUpload';
import BasicInfoTab from './profile/BasicInfoTab';
import PublicProfileTab from './profile/PublicProfileTab';
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
        description: userData.description || '',
        country: userData.country || '',
        city: userData.city || '',
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
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        username: profile.username,
        displayName: profile.displayName,
        companyName: profile.companyName,
        profilePictureURL: profile.photoURL,
        photoURL: profile.photoURL,
        description: profile.description,
        country: profile.country,
        city: profile.city,
        hourlyRate: profile.hourlyRate,
        portfolio: profile.portfolio,
        languages: profile.languages,
        skills: profile.skills,
        education: profile.education,
        certifications: profile.certifications,
        publicDescription: profile.publicDescription,
        specialties: profile.specialties,
        servicePackages: profile.servicePackages,
        workingHours: profile.workingHours,
        instantBooking: profile.instantBooking,
        responseTimeGuarantee: profile.responseTimeGuarantee,
        faqs: profile.faqs,
        profileBannerImage: profile.profileBannerImage,
        businessLicense: profile.businessLicense,
        updatedAt: new Date(),
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
    { id: 'basic', label: 'Grunddaten', icon: FiUser },
    { id: 'skills', label: 'Skills & Bildung', icon: FiAward },
    { id: 'public', label: 'Öffentliches Profil', icon: FiEye },
    { id: 'portfolio', label: 'Portfolio', icon: FiImage },
    { id: 'location', label: 'Standort', icon: FiMapPin },
    { id: 'metrics', label: 'Statistiken', icon: FiTrendingUp },
  ];

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header mit Profilbild und Save Button */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ProfileImageUpload profile={profile} setProfile={setProfile} />
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
        {activeTab === 'basic' && <BasicInfoTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'skills' && <SkillsEducationTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'public' && <PublicProfileTab profile={profile} setProfile={setProfile} />}

        {activeTab === 'portfolio' && (
          <PortfolioManager profile={profile} setProfile={setProfile} />
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Standort</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={e =>
                    setProfile(prev => (prev ? { ...prev, country: e.target.value } : null))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stadt</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={e =>
                    setProfile(prev => (prev ? { ...prev, city: e.target.value } : null))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
              </div>
            </div>
          </div>
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
