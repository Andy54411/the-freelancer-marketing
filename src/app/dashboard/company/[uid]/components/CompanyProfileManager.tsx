'use client';

import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import {
  FiLoader,
  FiSave,
  FiUser,
  FiImage,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiZap,
  FiAward,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiStar,
  FiShield,
} from 'react-icons/fi';
import { toast } from 'sonner';
import Image from 'next/image';
import { CompanyMetrics } from '@/lib/companyMetrics';

// Vereinfachtes Profile Interface (ohne automatische Metriken)
interface EditableCompanyProfile {
  uid: string;
  username: string;
  displayName: string;
  companyName: string;
  photoURL: string;
  description: string;
  country: string;
  city: string;
  hourlyRate: number;
  portfolio: PortfolioItem[];
  languages: { language: string; proficiency: string }[];
  skills: string[];
  education: { school: string; degree: string; year: string }[];
  certifications: { name: string; from: string; year: string }[];
}

interface PortfolioItem {
  id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  projectUrl?: string;
  category: string;
}

interface CompanyProfileManagerProps {
  userData: any;
  companyMetrics?: CompanyMetrics | null;
  onDataSaved: () => void;
}

const CompanyProfileManager: React.FC<CompanyProfileManagerProps> = ({
  userData,
  companyMetrics,
  onDataSaved,
}) => {
  const [profile, setProfile] = useState<EditableCompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [newPortfolioItem, setNewPortfolioItem] = useState<PortfolioItem>({
    title: '',
    description: '',
    category: '',
    imageUrl: '',
    projectUrl: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (userData) {
      setProfile({
        uid: userData.uid,
        username: userData.username || '',
        displayName:
          userData.displayName ||
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
          '',
        companyName: userData.companyName || '',
        photoURL: userData.profilePictureURL || '',
        description: userData.description || '',
        country: userData.country || '',
        city: userData.city || '',
        hourlyRate: userData.hourlyRate || 50,
        portfolio: userData.portfolio || [],
        languages: userData.languages || [{ language: 'Deutsch', proficiency: 'Muttersprache' }],
        skills: userData.skills || [],
        education: userData.education || [],
        certifications: userData.certifications || [],
      });
      setLoading(false);
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
        description: profile.description,
        country: profile.country,
        city: profile.city,
        hourlyRate: profile.hourlyRate,
        portfolio: profile.portfolio,
        languages: profile.languages,
        skills: profile.skills,
        education: profile.education,
        certifications: profile.certifications,
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

  // Portfolio-Management Funktionen
  const addPortfolioItem = async () => {
    if (!newPortfolioItem.title || !newPortfolioItem.description) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    const portfolioItem: PortfolioItem = {
      ...newPortfolioItem,
      id: Date.now().toString(),
    };

    setProfile(prev =>
      prev
        ? {
            ...prev,
            portfolio: [...prev.portfolio, portfolioItem],
          }
        : null
    );

    setNewPortfolioItem({
      title: '',
      description: '',
      category: '',
      imageUrl: '',
      projectUrl: '',
    });

    toast.success('Portfolio-Item hinzugefügt');
  };

  const removePortfolioItem = (id: string) => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            portfolio: prev.portfolio.filter(item => item.id !== id),
          }
        : null
    );
  };

  const addSkill = (skill: string) => {
    if (!skill.trim() || profile?.skills.includes(skill)) return;
    setProfile(prev =>
      prev
        ? {
            ...prev,
            skills: [...prev.skills, skill],
          }
        : null
    );
  };

  const removeSkill = (skill: string) => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            skills: prev.skills.filter(s => s !== skill),
          }
        : null
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
        <span className="ml-3">Lade Profile...</span>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center p-8 text-red-500">Fehler beim Laden des Profils</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'basic', label: 'Grunddaten', icon: FiUser },
            { id: 'metrics', label: 'Metriken', icon: FiTrendingUp },
            { id: 'portfolio', label: 'Portfolio', icon: FiImage },
            { id: 'skills', label: 'Skills & Sprachen', icon: FiAward },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-[#14ad9f] text-[#14ad9f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname</label>
              <input
                type="text"
                value={profile.companyName}
                onChange={e =>
                  setProfile(prev => (prev ? { ...prev, companyName: e.target.value } : null))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
              <textarea
                value={profile.description}
                onChange={e =>
                  setProfile(prev => (prev ? { ...prev, description: e.target.value } : null))
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                placeholder="Beschreibe deine Dienstleistungen und Expertise..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stundensatz (€)
              </label>
              <input
                type="number"
                value={profile.hourlyRate}
                onChange={e =>
                  setProfile(prev =>
                    prev ? { ...prev, hourlyRate: parseFloat(e.target.value) || 0 } : null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiShield className="text-[#14ad9f]" />
              Automatische Leistungsmetriken
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Diese Metriken werden automatisch basierend auf Ihren tatsächlichen Aktivitäten
              berechnet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FiClock className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Antwortzeit</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ~{companyMetrics?.responseTime || 24}h
              </p>
              <p className="text-xs text-gray-500">Durchschnittlich</p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FiCheckCircle className="text-green-500" />
                <span className="text-sm font-medium text-gray-700">Erfolgsrate</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {companyMetrics?.completionRate || 0}%
              </p>
              <p className="text-xs text-gray-500">Abgeschlossene Projekte</p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FiTrendingUp className="text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Aufträge</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{companyMetrics?.totalOrders || 0}</p>
              <p className="text-xs text-gray-500">Gesamt</p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FiStar className="text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">Bewertung</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {companyMetrics?.averageRating || 0}★
              </p>
              <p className="text-xs text-gray-500">Durchschnitt</p>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Verdiente Badges</h4>
            <div className="flex flex-wrap gap-2">
              {(companyMetrics?.badges || ['New Member']).map(badge => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                >
                  <FiAward size={12} />
                  {badge}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Badges werden automatisch vergeben basierend auf Ihrer Leistung und
              Kundenzufriedenheit.
            </p>
          </div>

          {/* Online Status */}
          <div className="mt-6 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${companyMetrics?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
            ></div>
            <span className="text-sm text-gray-700">
              {companyMetrics?.isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="text-xs text-gray-500">(basierend auf letzter Aktivität)</span>
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* Portfolio Items anzeigen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.portfolio.map(item => (
              <div key={item.id} className="bg-white border rounded-lg overflow-hidden">
                {item.imageUrl && (
                  <div className="h-32 bg-gray-200">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={300}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{item.category}</p>
                  <button
                    onClick={() => removePortfolioItem(item.id!)}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    <FiTrash2 className="inline mr-1" /> Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Neues Portfolio Item hinzufügen */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Neues Portfolio-Item hinzufügen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Titel"
                value={newPortfolioItem.title}
                onChange={e => setNewPortfolioItem(prev => ({ ...prev, title: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              />
              <input
                type="text"
                placeholder="Kategorie"
                value={newPortfolioItem.category}
                onChange={e => setNewPortfolioItem(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              />
              <textarea
                placeholder="Beschreibung"
                value={newPortfolioItem.description}
                onChange={e =>
                  setNewPortfolioItem(prev => ({ ...prev, description: e.target.value }))
                }
                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                rows={3}
              />
              <input
                type="url"
                placeholder="Projekt-URL (optional)"
                value={newPortfolioItem.projectUrl}
                onChange={e =>
                  setNewPortfolioItem(prev => ({ ...prev, projectUrl: e.target.value }))
                }
                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              />
            </div>
            <button
              onClick={addPortfolioItem}
              className="mt-4 bg-[#14ad9f] text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors flex items-center gap-2"
            >
              <FiPlus /> Hinzufügen
            </button>
          </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Skills */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Fähigkeiten</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.skills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="text-red-500 hover:text-red-700 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Neue Fähigkeit hinzufügen"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    addSkill(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              />
            </div>
          </div>

          {/* Sprachen */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Sprachen</h4>
            <div className="space-y-2">
              {profile.languages.map((lang, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="font-medium">{lang.language}</span>
                  <span className="text-sm text-gray-600">- {lang.proficiency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#14ad9f] text-white px-6 py-2 rounded-md hover:bg-teal-600 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
          {saving ? 'Speichere...' : 'Profil speichern'}
        </button>
      </div>
    </div>
  );
};

export default CompanyProfileManager;
