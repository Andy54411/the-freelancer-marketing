'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Save,
  Calendar,
  Tag,
  FileText,
  Star,
  Link as LinkIcon,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import { categories as allCategories, getCategoryBySubcategory } from '@/data/categories';
import { getSkillsForSubcategory, getAllSkillsForCategory } from '@/data/skills';
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  imageFile?: File;
  additionalImages?: string[]; // Array für zusätzliche Bilder
  additionalImageFiles?: File[]; // Array für zusätzliche Bild-Files
  title: string;
  description: string;
  category?: string;
  featured?: boolean;
  order?: number;
  createdAt?: string;
  projectUrl?: string;
  clientName?: string;
  projectDate?: string;
  technologies?: string[];
  location?: string;
  duration?: string;
  budget?: string;
  status?: 'completed' | 'in-progress' | 'cancelled';
}

interface PortfolioItemDetailsProps {
  item: PortfolioItem;
  onSave: (item: PortfolioItem) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const PortfolioItemDetails: React.FC<PortfolioItemDetailsProps> = ({
  item,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [editedItem, setEditedItem] = useState<PortfolioItem>({
    ...item,
    additionalImages: item.additionalImages || [],
    additionalImageFiles: [],
  });
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>(
    item.technologies || []
  );
  const [customTechnology, setCustomTechnology] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    // Initialisiere mit der Kategorie des Items, falls vorhanden
    if (item.category) {
      const category = getCategoryBySubcategory(item.category);
      return category?.id || '';
    }
    return '';
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(item.category || '');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [subcategoryDropdownOpen, setSubcategoryDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);

  // Schließe Dropdowns wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setCategoryDropdownOpen(false);
        setSubcategoryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Dynamische Skills basierend auf der gewählten Kategorie und Subkategorie
  const getAvailableSkills = () => {
    if (selectedCategory && selectedSubcategory) {
      return getSkillsForSubcategory(selectedCategory, selectedSubcategory);
    } else if (selectedCategory) {
      return getAllSkillsForCategory(selectedCategory);
    }
    return []; // Keine Skills anzeigen, bis Kategorie gewählt wird
  };

  // Subkategorien für die gewählte Hauptkategorie
  const getAvailableSubcategories = () => {
    if (selectedCategory) {
      const category = allCategories.find(cat => cat.id === selectedCategory);
      return category?.subcategories || [];
    }
    return [];
  };

  const handleInputChange = (field: keyof PortfolioItem, value: any) => {
    setEditedItem(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Upload zu Firebase Storage
  const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
    const imageRef = ref(storage, path);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      setIsUploading(true);
      setUploadProgress('Hauptbild wird hochgeladen...');

      try {
        // Erstelle einen eindeutigen Pfad für das Bild
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const imagePath = `portfolio/${editedItem.id}/main/${fileName}`;

        // Upload zu Firebase Storage
        const downloadURL = await uploadImageToStorage(file, imagePath);

        setEditedItem(prev => ({
          ...prev,
          imageUrl: downloadURL,
        }));

        setUploadProgress('');
      } catch {
        setUploadProgress('Fehler beim Hochladen');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Neue Funktion für zusätzliche Bilder mit Storage Upload
  const handleAdditionalImagesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentAdditionalImages = editedItem.additionalImages || [];

    // Maximal 4 zusätzliche Bilder erlauben
    const remainingSlots = 4 - currentAdditionalImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`${filesToProcess.length} zusätzliche Bilder werden hochgeladen...`);

    try {
      const uploadPromises = filesToProcess.map(async (file, index) => {
        if (file.type.startsWith('image/')) {
          const timestamp = Date.now();
          const fileName = `${timestamp}_${index}_${file.name}`;
          const imagePath = `portfolio/${editedItem.id}/additional/${fileName}`;

          return await uploadImageToStorage(file, imagePath);
        }
        return null;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];

      setEditedItem(prev => ({
        ...prev,
        additionalImages: [...currentAdditionalImages, ...validUrls],
      }));

      setUploadProgress('');
    } catch {
      setUploadProgress('Fehler beim Hochladen');
    } finally {
      setIsUploading(false);
    }
  };

  // Funktion zum Entfernen eines zusätzlichen Bildes
  const removeAdditionalImage = (index: number) => {
    setEditedItem(prev => ({
      ...prev,
      additionalImages: prev.additionalImages?.filter((_, i) => i !== index) || [],
    }));
  };

  const addTechnology = (tech: string) => {
    if (tech && !selectedTechnologies.includes(tech)) {
      setSelectedTechnologies(prev => [...prev, tech]);
    }
  };

  const removeTechnology = (tech: string) => {
    setSelectedTechnologies(prev => prev.filter(t => t !== tech));
  };

  const addCustomTechnology = () => {
    if (customTechnology.trim()) {
      addTechnology(customTechnology.trim());
      setCustomTechnology('');
    }
  };

  const handleSave = () => {
    // Hilfsfunktion um undefined-Werte rekursiv zu entfernen
    const removeUndefined = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(removeUndefined).filter(item => item !== undefined);
      }

      if (obj !== null && typeof obj === 'object') {
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = removeUndefined(value);
          }
        });
        return cleaned;
      }

      return obj;
    };

    // Erstelle eine saubere Kopie ohne File-Objekte
    const { imageFile: _imageFile, additionalImageFiles: _additionalImageFiles, ...cleanItem } = editedItem;

    // Kombiniere mit selectedTechnologies
    const itemWithTechnologies = {
      ...cleanItem,
      technologies: selectedTechnologies,
    };

    // Entferne alle undefined-Werte rekursiv
    const finalItem = removeUndefined(itemWithTechnologies);

    onSave(finalItem);
  };

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Portfolio-Element bearbeiten</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Projekt-Bild</label>

            <div className="relative">
              {editedItem.imageUrl ? (
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={editedItem.imageUrl}
                    alt={editedItem.title}
                    fill
                    className="object-cover"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2 text-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        <span className="text-sm">Wird hochgeladen...</span>
                      </div>
                    ) : (
                      <Upload className="w-8 h-8 text-white" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-[#14ad9f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-gray-500">
                    {isUploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
                  </span>
                </button>
              )}

              {/* Upload Progress */}
              {uploadProgress && (
                <div className="mt-2 text-sm text-[#14ad9f] flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f]"></div>
                  {uploadProgress}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleImageUpload(e.target.files)}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Additional Images Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Weitere Projekt-Bilder (max. 4)
            </label>

            {/* Existing Additional Images Grid */}
            {editedItem.additionalImages && editedItem.additionalImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {editedItem.additionalImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={`Zusätzliches Bild ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removeAdditionalImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button for Additional Images */}
            {(!editedItem.additionalImages || editedItem.additionalImages.length < 4) && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <button
                  onClick={() => additionalImagesInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#14ad9f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">
                    {isUploading ? 'Wird hochgeladen...' : 'Weitere Bilder hochladen'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {editedItem.additionalImages ? 4 - editedItem.additionalImages.length : 4}{' '}
                    Bilder möglich
                  </span>
                </button>

                <input
                  ref={additionalImagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => handleAdditionalImagesUpload(e.target.files)}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Diese Bilder werden im Portfolio-Layout unterhalb des Hauptbildes.
            </p>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Projekt-Titel
                </label>
                <input
                  type="text"
                  value={editedItem.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  placeholder="Projekt-Titel eingeben"
                />
              </div>

              <div className="dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Hauptkategorie
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white text-left flex items-center justify-between"
                  >
                    <span className={selectedCategory ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedCategory
                        ? allCategories.find(cat => cat.id === selectedCategory)?.title
                        : 'Hauptkategorie wählen'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {categoryDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('');
                          setSelectedSubcategory('');
                          setCategoryDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-500"
                      >
                        Hauptkategorie wählen
                      </button>
                      {allCategories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setSelectedSubcategory('');
                            setCategoryDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-900"
                        >
                          {cat.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subkategorie</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSubcategoryDropdownOpen(!subcategoryDropdownOpen)}
                    disabled={!selectedCategory}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white text-left flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <span className={selectedSubcategory ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedSubcategory ||
                        (selectedCategory ? 'Subkategorie wählen' : 'Erst Hauptkategorie wählen')}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${subcategoryDropdownOpen ? 'rotate-180' : ''} ${!selectedCategory ? 'text-gray-400' : ''}`}
                    />
                  </button>

                  {subcategoryDropdownOpen && selectedCategory && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubcategory('');
                          handleInputChange('category', '');
                          setSubcategoryDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-500"
                      >
                        Subkategorie wählen
                      </button>
                      {getAvailableSubcategories().map(subcategory => (
                        <button
                          key={subcategory}
                          type="button"
                          onClick={() => {
                            setSelectedSubcategory(subcategory);
                            handleInputChange('category', subcategory);
                            setSubcategoryDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-900"
                        >
                          {subcategory}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Projekt-Datum
                </label>
                <input
                  type="date"
                  value={editedItem.projectDate || ''}
                  onChange={e => handleInputChange('projectDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  Projekt-URL
                </label>
                <input
                  type="url"
                  value={editedItem.projectUrl || ''}
                  onChange={e => handleInputChange('projectUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  placeholder="https://beispiel.de"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kundenname</label>
                <input
                  type="text"
                  value={editedItem.clientName || ''}
                  onChange={e => handleInputChange('clientName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  placeholder="Name des Kunden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Standort
                </label>
                <input
                  type="text"
                  value={editedItem.location || ''}
                  onChange={e => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  placeholder="Stadt oder Region"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Projektdauer</label>
                <input
                  type="text"
                  value={editedItem.duration || ''}
                  onChange={e => handleInputChange('duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  placeholder="z.B. 3 Monate, 2 Wochen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget/Preis</label>
                <input
                  type="text"
                  value={editedItem.budget || ''}
                  onChange={e => handleInputChange('budget', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  placeholder="z.B. 5.000€, Auf Anfrage"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projekt-Beschreibung
            </label>
            <textarea
              value={editedItem.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] resize-none"
              placeholder="Detaillierte Beschreibung des Projekts..."
            />
          </div>

          {/* Technologies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verwendete Skills/Fähigkeiten
              {selectedSubcategory && (
                <span className="text-sm text-gray-500 ml-1">(für {selectedSubcategory})</span>
              )}
            </label>

            {/* Selected Technologies */}
            {selectedTechnologies.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTechnologies.map(tech => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-[#14ad9f] text-white text-sm rounded-full"
                  >
                    {tech}
                    <button
                      onClick={() => removeTechnology(tech)}
                      className="ml-2 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Category Selection Notice */}
            {!selectedCategory && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Wähle zuerst eine Hauptkategorie und Subkategorie aus, um passende Skills
                  anzuzeigen
                </p>
              </div>
            )}

            {selectedCategory && !selectedSubcategory && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Wähle eine Subkategorie für spezifische Skills aus
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Oder alle Skills der Kategorie &quot;
                  {allCategories.find(c => c.id === selectedCategory)?.title}&quot; werden angezeigt
                </p>
              </div>
            )}

            {/* Technology Selection */}
            {getAvailableSkills().length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                {getAvailableSkills().map(tech => (
                  <button
                    key={tech}
                    onClick={() => addTechnology(tech)}
                    disabled={selectedTechnologies.includes(tech)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                      selectedTechnologies.includes(tech)
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                    }`}
                  >
                    {tech}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Technology Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTechnology}
                onChange={e => setCustomTechnology(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addCustomTechnology()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="Eigene Fähigkeit hinzufügen"
              />

              <button
                onClick={addCustomTechnology}
                className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover transition-colors"
              >
                Hinzufügen
              </button>
            </div>
          </div>

          {/* Status and Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Projekt-Status</label>
              <select
                value={editedItem.status || 'completed'}
                onChange={e => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              >
                <option value="completed">Abgeschlossen</option>
                <option value="in-progress">In Bearbeitung</option>
                <option value="cancelled">Abgebrochen</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editedItem.featured || false}
                  onChange={e => handleInputChange('featured', e.target.checked)}
                  className="sr-only"
                />

                <div
                  className={`relative w-5 h-5 rounded border-2 transition-colors ${
                    editedItem.featured
                      ? 'bg-[#14ad9f] border-[#14ad9f]'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {editedItem.featured && (
                    <Star
                      className="w-3 h-3 text-white absolute top-0.5 left-0.5"
                      fill="currentColor"
                    />
                  )}
                </div>
                <span className="ml-2 text-sm text-gray-700">Als Featured markieren</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reihenfolge</label>
              <input
                type="number"
                value={editedItem.order || 0}
                onChange={e => handleInputChange('order', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div>
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Löschen
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioItemDetails;
