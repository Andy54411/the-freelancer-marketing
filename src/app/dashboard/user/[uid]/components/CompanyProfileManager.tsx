'use client';

import React, { useEffect, useState } from 'react';
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
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
} from 'react-icons/fi';
import { toast } from 'sonner';
import Image from 'next/image';

// Erweiterte Company Profile Interface basierend auf unserem Fiverr/Malt System
interface ExtendedCompanyProfile {
  uid: string;
  username: string;
  displayName: string;
  companyName: string;
  photoURL: string;
  description: string;
  country: string;
  city: string;
  // Fiverr/Malt-ähnliche Features
  responseTime: number; // in hours
  completionRate: number; // percentage
  totalOrders: number;
  isOnline: boolean;
  badges: string[];
  hourlyRate: number;
  // Portfolio
  portfolio: PortfolioItem[];
  // Sprachen und Skills
  languages: { language: string; proficiency: string }[];
  skills: string[];
  // Zertifikate und Ausbildung
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
  onDataSaved: () => void;
}

const CompanyProfileManager: React.FC<CompanyProfileManagerProps> = ({ userData, onDataSaved }) => {
  const [profile, setProfile] = useState<ExtendedCompanyProfile | null>(null);
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
      // Initialisiere das Profil mit bestehenden Daten und Standardwerten für neue Features
      setProfile({
        uid: userData.uid,
        username: userData.username || '',
        displayName: userData.displayName || userData.firstName + ' ' + userData.lastName || '',
        companyName: userData.companyName || '',
        photoURL: userData.profilePictureURL || '',
        description: userData.description || '',
        country: userData.country || '',
        city: userData.city || '',
        responseTime: userData.responseTime || 2,
        completionRate: userData.completionRate || 95,
        totalOrders: userData.totalOrders || 0,
        isOnline: userData.isOnline ?? true,
        badges: userData.badges || [],
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
        responseTime: profile.responseTime,
        completionRate: profile.completionRate,
        totalOrders: profile.totalOrders,
        isOnline: profile.isOnline,
        badges: profile.badges,
        hourlyRate: profile.hourlyRate,
        portfolio: profile.portfolio,
        languages: profile.languages,
        skills: profile.skills,
        education: profile.education,
        certifications: profile.certifications,
        updatedAt: new Date(),
      });

      toast.success('Company Profile erfolgreich aktualisiert!');
      onDataSaved();
    } catch (error) {
      toast.error('Fehler beim Speichern des Profils');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `portfolio/${profile?.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        });
      });
    } catch (error) {
      toast.error('Fehler beim Hochladen des Bildes');
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const addPortfolioItem = async () => {
    if (!newPortfolioItem.title || !newPortfolioItem.description) {
      toast.error('Titel und Beschreibung sind erforderlich');
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

    toast.success('Portfolio-Eintrag hinzugefügt');
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
    toast.success('Portfolio-Eintrag entfernt');
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

  const addBadge = (badge: string) => {
    if (!badge.trim() || profile?.badges.includes(badge)) return;
    setProfile(prev =>
      prev
        ? {
            ...prev,
            badges: [...prev.badges, badge],
          }
        : null
    );
  };

  const removeBadge = (badge: string) => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            badges: prev.badges.filter(b => b !== badge),
          }
        : null
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
        <p className="ml-3">Profile wird geladen...</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-8">Profil konnte nicht geladen werden.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <FiUser className="text-[#14ad9f]" />
            Company Profile Management
          </h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihr professionelles Freelancer-Profil</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'basic', label: 'Grunddaten', icon: FiUser },
              { id: 'metrics', label: 'Metriken & Badges', icon: FiTrendingUp },
              { id: 'portfolio', label: 'Portfolio', icon: FiImage },
              { id: 'skills', label: 'Skills & Sprachen', icon: FiZap },
              { id: 'preview', label: 'Vorschau', icon: FiEye },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-[#14ad9f] text-[#14ad9f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={e => setProfile({ ...profile, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anzeigename
                  </label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname</label>
                  <input
                    type="text"
                    value={profile.companyName}
                    onChange={e => setProfile({ ...profile, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stundensatz (€)
                  </label>
                  <input
                    type="number"
                    value={profile.hourlyRate}
                    onChange={e => setProfile({ ...profile, hourlyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stadt</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={e => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
                  <input
                    type="text"
                    value={profile.country}
                    onChange={e => setProfile({ ...profile, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
                <textarea
                  value={profile.description}
                  onChange={e => setProfile({ ...profile, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  placeholder="Beschreiben Sie Ihre Dienstleistungen und Expertise..."
                />
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiClock size={16} />
                    Antwortzeit (Stunden)
                  </label>
                  <input
                    type="number"
                    value={profile.responseTime}
                    onChange={e => setProfile({ ...profile, responseTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiCheckCircle size={16} />
                    Erfolgsrate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={profile.completionRate}
                    onChange={e =>
                      setProfile({ ...profile, completionRate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Abgeschlossene Projekte
                  </label>
                  <input
                    type="number"
                    value={profile.totalOrders}
                    onChange={e => setProfile({ ...profile, totalOrders: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
                  <input
                    type="checkbox"
                    checked={profile.isOnline}
                    onChange={e => setProfile({ ...profile, isOnline: e.target.checked })}
                    className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
                  />
                  Online-Status anzeigen
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiAward size={16} />
                  Badges
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.badges.map(badge => (
                    <span
                      key={badge}
                      className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {badge}
                      <button onClick={() => removeBadge(badge)} className="hover:text-red-600">
                        <FiTrash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        addBadge(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  >
                    <option value="">Badge hinzufügen...</option>
                    <option value="Top Rated">Top Rated</option>
                    <option value="Fast Delivery">Fast Delivery</option>
                    <option value="Best Seller">Best Seller</option>
                    <option value="Pro Verified">Pro Verified</option>
                    <option value="Premium Quality">Premium Quality</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Portfolio Management</h3>

              {/* Neues Portfolio Item */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-3">
                  Neues Portfolio-Projekt hinzufügen
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Projekttitel"
                    value={newPortfolioItem.title}
                    onChange={e =>
                      setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Kategorie"
                    value={newPortfolioItem.category}
                    onChange={e =>
                      setNewPortfolioItem({ ...newPortfolioItem, category: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                  <textarea
                    placeholder="Projektbeschreibung"
                    value={newPortfolioItem.description}
                    onChange={e =>
                      setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })
                    }
                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                    rows={3}
                  />
                  <input
                    type="url"
                    placeholder="Projekt-URL (optional)"
                    value={newPortfolioItem.projectUrl}
                    onChange={e =>
                      setNewPortfolioItem({ ...newPortfolioItem, projectUrl: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                  <input
                    type="url"
                    placeholder="Bild-URL (optional)"
                    value={newPortfolioItem.imageUrl}
                    onChange={e =>
                      setNewPortfolioItem({ ...newPortfolioItem, imageUrl: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={addPortfolioItem}
                  className="mt-3 bg-[#14ad9f] text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
                >
                  <FiPlus size={16} />
                  Portfolio-Eintrag hinzufügen
                </button>
              </div>

              {/* Bestehende Portfolio Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.portfolio.map(item => (
                  <div
                    key={item.id}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {item.imageUrl && (
                      <div className="relative h-32 bg-gray-200">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <h5 className="font-semibold text-sm text-gray-800 mb-1">{item.title}</h5>
                      <p className="text-xs text-gray-600 mb-2">{item.category}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => removePortfolioItem(item.id!)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fähigkeiten</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.skills.map(skill => (
                    <span
                      key={skill}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-red-600">
                        <FiTrash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Neue Fähigkeit hinzufügen..."
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        addSkill(target.value);
                        target.value = '';
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sprachen</label>
                <div className="space-y-2">
                  {profile.languages.map((lang, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={lang.language}
                        onChange={e => {
                          const newLanguages = [...profile.languages];
                          newLanguages[index].language = e.target.value;
                          setProfile({ ...profile, languages: newLanguages });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                        placeholder="Sprache"
                      />
                      <select
                        value={lang.proficiency}
                        onChange={e => {
                          const newLanguages = [...profile.languages];
                          newLanguages[index].proficiency = e.target.value;
                          setProfile({ ...profile, languages: newLanguages });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                      >
                        <option value="Grundkenntnisse">Grundkenntnisse</option>
                        <option value="Konversation">Konversation</option>
                        <option value="Fließend">Fließend</option>
                        <option value="Muttersprache">Muttersprache</option>
                      </select>
                      <button
                        onClick={() => {
                          const newLanguages = profile.languages.filter((_, i) => i !== index);
                          setProfile({ ...profile, languages: newLanguages });
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors px-2"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setProfile({
                        ...profile,
                        languages: [
                          ...profile.languages,
                          { language: '', proficiency: 'Grundkenntnisse' },
                        ],
                      });
                    }}
                    className="text-[#14ad9f] hover:text-teal-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <FiPlus size={16} />
                    Sprache hinzufügen
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Profile Vorschau</h3>
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16">
                    <Image
                      src={profile.photoURL || '/default-avatar.png'}
                      alt="Profile"
                      fill
                      className="rounded-full object-cover"
                    />
                    {profile.isOnline && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{profile.displayName}</h4>
                    <p className="text-sm text-gray-600">{profile.companyName}</p>
                    <div className="flex gap-1 mt-1">
                      {profile.badges.map(badge => (
                        <span
                          key={badge}
                          className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{profile.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FiClock className="text-[#14ad9f]" size={16} />
                    <span>~{profile.responseTime}h Antwortzeit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="text-green-500" size={16} />
                    <span>{profile.completionRate}% Erfolgsrate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiTrendingUp className="text-[#14ad9f]" size={16} />
                    <span>{profile.totalOrders} Projekte</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiMapPin className="text-gray-500" size={16} />
                    <span>
                      {profile.city}, {profile.country}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-lg font-bold text-gray-800">Ab {profile.hourlyRate}€/Std.</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">So sieht Ihr Profil für Kunden aus.</p>
                <a
                  href={`/profile/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#14ad9f] hover:text-teal-600 transition-colors flex items-center gap-2 justify-center"
                >
                  <FiEye size={16} />
                  Vollständiges Profil ansehen
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer mit Save Button */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#14ad9f] text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <FiLoader className="animate-spin" size={16} /> : <FiSave size={16} />}
              {saving ? 'Speichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileManager;
