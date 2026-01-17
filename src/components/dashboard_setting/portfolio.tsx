'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Plus,
  X,
  GripVertical,
  Loader2,
  CheckCircle,
  Star,
  Calendar,
  Tag,
  Link as LinkIcon,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { UserDataForSettings } from '@/types/settings';
import Image from 'next/image';
import PortfolioItemDetails from './PortfolioItemDetails';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { categories as allCategories } from '@/data/categories';
import { getSkillsForSubcategory, getAllSkillsForCategory } from '@/data/skills';

export interface PortfolioFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string | number | boolean | null | PortfolioItem[]) => void;
  userId?: string;
}

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
  views?: number; // Echte View-Anzahl
}

const PortfolioForm: React.FC<PortfolioFormProps> = ({ formData, handleChange, userId }) => {
  // Initialize portfolio from formData only once on mount
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(() => {
    return formData.step3?.portfolio && Array.isArray(formData.step3.portfolio)
      ? formData.step3.portfolio
      : [];
  });
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Upload zu Firebase Storage
  const uploadImageToStorage = async (
    file: File,
    folder: string,
    uId: string
  ): Promise<string> => {
    const timestamp = Date.now();
    // Verwende Portfolio-kompatiblen Pfad: portfolio/{userId}/main/{timestamp}_{fileName}
    const imagePath = `${folder}/${uId}/main/${timestamp}_${file.name}`;
    const imageRef = ref(storage, imagePath);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  };
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newItem, setNewItem] = useState<PortfolioItem>({
    id: '',
    imageUrl: '',
    title: '',
    description: '',
    category: '',
    featured: false,
    additionalImages: [],
    projectUrl: '',
    clientName: '',
    projectDate: '',
    technologies: [],
    location: '',
    duration: '',
    budget: '',
    status: 'completed',
  });
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  // State für Kategorien und Skills (Add-Formular)
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [subcategoryDropdownOpen, setSubcategoryDropdownOpen] = useState(false);
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([]);
  const [customTechnology, setCustomTechnology] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);

  // Update formData when portfolio changes (use a ref to track if we should update)
  const shouldUpdateFormData = useRef(false);

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
    return [];
  };

  // Subkategorien für die gewählte Hauptkategorie
  const getAvailableSubcategories = () => {
    if (selectedCategory) {
      const category = allCategories.find(cat => cat.id === selectedCategory);
      return category?.subcategories || [];
    }
    return [];
  };

  // Funktion zum Hinzufügen zusätzlicher Bilder für neues Item
  const handleAdditionalImagesUploadNew = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentAdditionalImages = newItem.additionalImages || [];
    const remainingSlots = 4 - currentAdditionalImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    setIsUploading(true);

    try {
      const previewUrls = filesToProcess
        .filter(file => file.type.startsWith('image/'))
        .map(file => URL.createObjectURL(file));

      const additionalFiles = filesToProcess.filter(file => file.type.startsWith('image/'));

      setNewItem(prev => ({
        ...prev,
        additionalImages: [...(prev.additionalImages || []), ...previewUrls],
        additionalImageFiles: [...(prev.additionalImageFiles || []), ...additionalFiles],
      }));
    } finally {
      setIsUploading(false);
    }
  };

  // Funktion zum Entfernen eines zusätzlichen Bildes beim neuen Item
  const removeAdditionalImageNew = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      additionalImages: prev.additionalImages?.filter((_, i) => i !== index) || [],
      additionalImageFiles: prev.additionalImageFiles?.filter((_, i) => i !== index) || [],
    }));
  };

  // Skill-Funktionen für Add-Formular
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

  // Funktion zum Laden der Portfolio-Daten aus der Datenbank
  const loadPortfolioFromDatabase = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'companies', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Prüfe mehrere mögliche Speicherorte für Portfolio-Daten
        const portfolioData = data?.step3?.portfolio || data?.portfolio || data?.portfolioItems;

        if (portfolioData && Array.isArray(portfolioData) && portfolioData.length > 0) {
          setPortfolioItems(portfolioData);
          // Auch die formData aktualisieren
          handleChange('step3.portfolio', portfolioData);
        }
      }
    } catch {
      toast.error('Fehler beim Laden des Portfolios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Portfolio-Daten beim ersten Laden abrufen
    loadPortfolioFromDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    // Mark that we should start updating form data after first render
    shouldUpdateFormData.current = true;
  }, []);

  useEffect(() => {
    if (shouldUpdateFormData.current) {
      // Entferne File-Objekte bevor sie an das Formular weitergegeben werden
      const cleanPortfolio = portfolioItems.map(item => {
        const { imageFile: _imageFile, ...cleanItem } = item;
        return cleanItem;
      });
      handleChange('step3.portfolio', cleanPortfolio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioItems]);

  const handleImageUpload = async (
    files: FileList | null,
    isNewItem: boolean = false,
    itemId?: string
  ) => {
    if (!files) return;

    // For new item, only take first file
    if (isNewItem && files.length > 0) {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        // Erstelle Preview-URL (Objekt-URL statt Base64)
        const previewUrl = URL.createObjectURL(file);
        setNewItem(prev => ({
          ...prev,
          imageUrl: previewUrl,
          imageFile: file,
        }));
      }
      return;
    }

    // For multiple uploads, create multiple portfolio items
    Array.from(files).forEach((file, index) => {
      if (file && file.type.startsWith('image/') && portfolioItems.length + index < 5) {
        // Erstelle Preview-URL (Objekt-URL statt Base64)
        const previewUrl = URL.createObjectURL(file);

        if (itemId) {
          // Update existing item
          setPortfolioItems(prev =>
            prev.map(item =>
              item.id === itemId ? { ...item, imageUrl: previewUrl, imageFile: file } : item
            )
          );
        } else {
          // Create new item from multi-upload
          const item: PortfolioItem = {
            id: `${Date.now()}-${index}`,
            imageUrl: previewUrl,
            imageFile: file,
            title: `Portfolio ${portfolioItems.length + index + 1}`,
            description: '',
            category: '',
            featured: false,
            order: portfolioItems.length + index,
            createdAt: new Date().toISOString(),
          };

          setPortfolioItems(prev => [...prev, item]);
        }
      }
    });
  };

  const _handleMultipleImageUpload = (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = 5 - portfolioItems.length;
    if (remainingSlots <= 0) {
      alert('Sie haben bereits die maximale Anzahl von 5 Portfolio-Einträgen erreicht.');
      return;
    }

    const filesToProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      if (file && file.type.startsWith('image/')) {
        // Erstelle Preview-URL (Objekt-URL statt Base64)
        const previewUrl = URL.createObjectURL(file);
        const item: PortfolioItem = {
          id: `${Date.now()}-${i}`,
          imageUrl: previewUrl,
          imageFile: file,
          title: `Portfolio ${portfolioItems.length + i + 1}`,
          description: '',
          category: '',
          featured: false,
          order: portfolioItems.length + i,
          createdAt: new Date().toISOString(),
        };

        setPortfolioItems(prev => [...prev, item]);
      }
    }

    if (files.length > remainingSlots) {
      alert(
        `Nur ${remainingSlots} von ${files.length} Bildern wurden hochgeladen, da Sie maximal 5 Portfolio-Einträge haben können.`
      );
    }
  };

  // Funktion um Portfolio direkt in Datenbank zu speichern
  const savePortfolioToDatabase = async (updatedPortfolio: PortfolioItem[]) => {
    if (!userId) {
      toast.error('Benutzer-ID fehlt zum Speichern.');
      return false;
    }

    try {
      // Erst alle Bilder zu Firebase Storage hochladen
      const portfolioWithUploadedImages = await Promise.all(
        updatedPortfolio.map(async item => {
          const { imageFile, additionalImageFiles, ...itemWithoutFiles } = item;

          // Hauptbild hochladen falls File-Objekt vorhanden
          if (imageFile instanceof File) {
            try {
              const uploadedUrl = await uploadImageToStorage(imageFile, 'portfolio', userId);
              itemWithoutFiles.imageUrl = uploadedUrl;
            } catch {
              // Fallback: Object-URL entfernen, da sie nicht persistent ist
              if (itemWithoutFiles.imageUrl?.startsWith('blob:')) {
                // Setze leeren String anstatt undefined
                itemWithoutFiles.imageUrl = '';
              }
            }
          } else if (itemWithoutFiles.imageUrl?.startsWith('blob:')) {
            // Blob-URLs ohne File-Objekt entfernen (nicht persistent)
            itemWithoutFiles.imageUrl = '';
          }

          // Zusätzliche Bilder hochladen falls vorhanden
          if (additionalImageFiles && additionalImageFiles.length > 0) {
            try {
              const uploadedImages = await Promise.all(
                additionalImageFiles.map(file =>
                  file instanceof File
                    ? uploadImageToStorage(file, 'portfolio', userId)
                    : Promise.resolve(file)
                )
              );
              itemWithoutFiles.additionalImages = uploadedImages;
            } catch {
              // Ignore upload errors for additional images
            }
          } else if (itemWithoutFiles.additionalImages && itemWithoutFiles.additionalImages.length > 0) {
            // Filtere blob:-URLs aus bestehenden additionalImages heraus
            itemWithoutFiles.additionalImages = itemWithoutFiles.additionalImages.filter(
              url => !url.startsWith('blob:')
            );
          }

          return itemWithoutFiles;
        })
      );

      // Hilfsfunktion um undefined-Werte rekursiv zu entfernen
      const removeUndefined = (obj: unknown): unknown => {
        if (Array.isArray(obj)) {
          return obj.map(removeUndefined).filter(item => item !== undefined);
        }

        if (obj !== null && typeof obj === 'object') {
          const cleaned: Record<string, unknown> = {};
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

      // Entferne alle undefined-Werte rekursiv
      const cleanPortfolio = portfolioWithUploadedImages
        .map(item => removeUndefined(item))
        .filter(item => item && Object.keys(item).length > 0); // Entferne leere Objekte

      // Debug: Logge das bereinigte Portfolio

      await updateDoc(doc(db, 'companies', userId), {
        'step3.portfolio': cleanPortfolio,
        updatedAt: serverTimestamp(),
      });
      toast.success('Portfolio gespeichert!');
      return true;
    } catch {
      toast.error('Fehler beim Speichern des Portfolios.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const addPortfolioItem = async () => {
    if (portfolioItems.length >= 5) {
      toast.error('Sie können maximal 5 Portfolio-Einträge hinzufügen.');
      return;
    }

    if (!newItem.imageUrl) {
      toast.error('Bitte laden Sie ein Bild hoch.');
      return;
    }

    if (!newItem.title.trim()) {
      toast.error('Bitte geben Sie einen Titel ein.');
      return;
    }

    setIsSaving(true);
    
    const item: PortfolioItem = {
      ...newItem,
      id: Date.now().toString(),
      order: portfolioItems.length,
      createdAt: new Date().toISOString(),
      category: selectedSubcategory || selectedCategory,
      technologies: selectedTechnologies,
    };

    const updatedPortfolio = [...portfolioItems, item];

    // Direkt in Datenbank speichern
    const success = await savePortfolioToDatabase(updatedPortfolio);

    if (success) {
      setPortfolioItems(updatedPortfolio);
      setNewItem({
        id: '',
        imageUrl: '',
        title: '',
        description: '',
        category: '',
        featured: false,
        additionalImages: [],
        projectUrl: '',
        clientName: '',
        projectDate: '',
        technologies: [],
        location: '',
        duration: '',
        budget: '',
        status: 'completed',
      });
      setSelectedCategory('');
      setSelectedSubcategory('');
      setSelectedTechnologies([]);
      setIsAdding(false);
    }
    setIsSaving(false);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewItem({
      id: '',
      imageUrl: '',
      title: '',
      description: '',
      category: '',
      featured: false,
      additionalImages: [],
      projectUrl: '',
      clientName: '',
      projectDate: '',
      technologies: [],
      location: '',
      duration: '',
      budget: '',
      status: 'completed',
    });
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedTechnologies([]);
  };

  const deletePortfolioItem = async (id: string) => {
    setIsSaving(true);
    const updatedPortfolio = portfolioItems.filter(item => item.id !== id);
    const success = await savePortfolioToDatabase(updatedPortfolio);

    if (success) {
      setPortfolioItems(updatedPortfolio);
    }
  };

  const toggleFeatured = async (id: string) => {
    const updatedPortfolio = portfolioItems.map(item =>
      item.id === id ? { ...item, featured: !item.featured } : item
    );
    const success = await savePortfolioToDatabase(updatedPortfolio);

    if (success) {
      setPortfolioItems(updatedPortfolio);
    }
  };

  const openDetailsEditor = (id: string) => {
    setEditingDetailsId(id);
  };

  const handleDetailsSave = async (updatedItem: PortfolioItem) => {
    const updatedPortfolio = portfolioItems.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    const success = await savePortfolioToDatabase(updatedPortfolio);

    if (success) {
      setPortfolioItems(updatedPortfolio);
      setEditingDetailsId(null);
    }
  };

  const handleDetailsCancel = () => {
    setEditingDetailsId(null);
  };

  const handleDetailsDelete = async (id: string) => {
    const updatedPortfolio = portfolioItems.filter(item => item.id !== id);
    const success = await savePortfolioToDatabase(updatedPortfolio);

    if (success) {
      setPortfolioItems(updatedPortfolio);
      setEditingDetailsId(null);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = portfolioItems.findIndex(item => item.id === draggedItem);
    const targetIndex = portfolioItems.findIndex(item => item.id === targetId);

    const newItems = [...portfolioItems];
    const draggedItemData = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItemData);

    // Update order numbers
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    setPortfolioItems(reorderedItems);
    setDraggedItem(null);
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#14ad9f]" />
            Portfolio
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Zeigen Sie Ihre besten Arbeiten. Maximal 5 Projekte.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          disabled={portfolioItems.length >= 5 || isAdding}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-linear-to-r from-[#14ad9f] to-[#0d8a7e] text-white rounded-lg hover:from-[#0d8a7e] hover:to-[#0a7068] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Projekt hinzufügen ({portfolioItems.length}/5)
        </button>
      </div>

      {/* Add New Portfolio Item Form */}
      {isAdding && (
        <div className="relative bg-white dark:bg-gray-800 border-2 border-[#14ad9f]/20 rounded-xl p-6 shadow-lg">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={handleCancelAdd}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#14ad9f]" />
            Neues Projekt hinzufügen
          </h4>
          
          <div className="space-y-6">
            {/* Hauptbild Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Projekt-Bild <span className="text-red-500">*</span>
              </label>
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const files = e.target.files;
                    if (files && files.length === 1) {
                      handleImageUpload(files, true);
                    }
                  }}
                  className="hidden"
                />
                {newItem.imageUrl ? (
                  <div className="relative group">
                    <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-[#14ad9f] shadow-md">
                      <Image src={newItem.imageUrl} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-[#14ad9f] rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-6 py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-[#14ad9f] hover:bg-[#14ad9f]/5 transition-all duration-200">
                    <ImageIcon className="w-12 h-12 mb-3 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Bild hochladen
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Zusätzliche Bilder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Weitere Projekt-Bilder (max. 4)
              </label>
              
              {/* Vorhandene zusätzliche Bilder */}
              {newItem.additionalImages && newItem.additionalImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {newItem.additionalImages.map((imageUrl, index) => (
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
                        type="button"
                        onClick={() => removeAdditionalImageNew(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button für zusätzliche Bilder */}
              {(!newItem.additionalImages || newItem.additionalImages.length < 4) && (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                  <button
                    type="button"
                    onClick={() => additionalImagesInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#14ad9f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">
                      {isUploading ? 'Wird hochgeladen...' : 'Weitere Bilder hochladen'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {newItem.additionalImages ? 4 - newItem.additionalImages.length : 4} Bilder möglich
                    </span>
                  </button>

                  <input
                    ref={additionalImagesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => handleAdditionalImagesUploadNew(e.target.files)}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Diese Bilder werden im Portfolio-Layout unterhalb des Hauptbildes.
              </p>
            </div>

            {/* Titel und Kategorien */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Projekt-Titel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Projekt-Titel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="z.B. Küchenrenovierung"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>

                {/* Hauptkategorie Dropdown */}
                <div className="dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Tag className="w-4 h-4 inline mr-2" />
                    Hauptkategorie
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent bg-white dark:bg-gray-700 text-left flex items-center justify-between"
                    >
                      <span className={selectedCategory ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                        {selectedCategory
                          ? allCategories.find(cat => cat.id === selectedCategory)?.title
                          : 'Hauptkategorie wählen'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {categoryDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('');
                            setSelectedSubcategory('');
                            setCategoryDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500"
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
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {cat.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subkategorie Dropdown */}
                <div className="dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subkategorie
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSubcategoryDropdownOpen(!subcategoryDropdownOpen)}
                      disabled={!selectedCategory}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent bg-white dark:bg-gray-700 text-left flex items-center justify-between disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    >
                      <span className={selectedSubcategory ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                        {selectedSubcategory ||
                          (selectedCategory ? 'Subkategorie wählen' : 'Erst Hauptkategorie wählen')}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${subcategoryDropdownOpen ? 'rotate-180' : ''} ${!selectedCategory ? 'text-gray-400' : ''}`}
                      />
                    </button>

                    {subcategoryDropdownOpen && selectedCategory && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubcategory('');
                            setSubcategoryDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500"
                        >
                          Subkategorie wählen
                        </button>
                        {getAvailableSubcategories().map(subcategory => (
                          <button
                            key={subcategory}
                            type="button"
                            onClick={() => {
                              setSelectedSubcategory(subcategory);
                              setSubcategoryDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {subcategory}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Projekt-Datum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Projekt-Datum
                  </label>
                  <input
                    type="date"
                    value={newItem.projectDate || ''}
                    onChange={e => setNewItem({ ...newItem, projectDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>

                {/* Projekt-URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <LinkIcon className="w-4 h-4 inline mr-2" />
                    Projekt-URL
                  </label>
                  <input
                    type="url"
                    value={newItem.projectUrl || ''}
                    onChange={e => setNewItem({ ...newItem, projectUrl: e.target.value })}
                    placeholder="https://beispiel.de"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Kundenname */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kundenname
                  </label>
                  <input
                    type="text"
                    value={newItem.clientName || ''}
                    onChange={e => setNewItem({ ...newItem, clientName: e.target.value })}
                    placeholder="Name des Kunden"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>

                {/* Standort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Standort
                  </label>
                  <input
                    type="text"
                    value={newItem.location || ''}
                    onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                    placeholder="Stadt oder Region"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>

                {/* Projektdauer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Projektdauer
                  </label>
                  <input
                    type="text"
                    value={newItem.duration || ''}
                    onChange={e => setNewItem({ ...newItem, duration: e.target.value })}
                    placeholder="z.B. 3 Monate, 2 Wochen"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>

                {/* Budget/Preis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Budget/Preis
                  </label>
                  <input
                    type="text"
                    value={newItem.budget || ''}
                    onChange={e => setNewItem({ ...newItem, budget: e.target.value })}
                    placeholder="z.B. 5.000€, Auf Anfrage"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Projekt-Beschreibung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Projekt-Beschreibung
              </label>
              <textarea
                value={newItem.description}
                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Detaillierte Beschreibung des Projekts..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all resize-none"
              />
            </div>

            {/* Skills/Fähigkeiten */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Verwendete Skills/Fähigkeiten
                {selectedSubcategory && (
                  <span className="text-sm text-gray-500 ml-1">(für {selectedSubcategory})</span>
                )}
              </label>

              {/* Ausgewählte Skills */}
              {selectedTechnologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTechnologies.map(tech => (
                    <span
                      key={tech}
                      className="inline-flex items-center px-3 py-1 bg-[#14ad9f] text-white text-sm rounded-full"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTechnology(tech)}
                        className="ml-2 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Hinweis zur Kategorie-Auswahl */}
              {!selectedCategory && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Wähle zuerst eine Hauptkategorie und Subkategorie aus, um passende Skills anzuzeigen
                  </p>
                </div>
              )}

              {selectedCategory && !selectedSubcategory && (
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Wähle eine Subkategorie für spezifische Skills aus
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                    Oder alle Skills der Kategorie &quot;{allCategories.find(c => c.id === selectedCategory)?.title}&quot; werden angezeigt
                  </p>
                </div>
              )}

              {/* Verfügbare Skills */}
              {getAvailableSkills().length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {getAvailableSkills().map(tech => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => addTechnology(tech)}
                      disabled={selectedTechnologies.includes(tech)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                        selectedTechnologies.includes(tech)
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              )}

              {/* Eigene Fähigkeit hinzufügen */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTechnology}
                  onChange={e => setCustomTechnology(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCustomTechnology())}
                  placeholder="Eigene Fähigkeit hinzufügen"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addCustomTechnology}
                  className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#0d8a7e] transition-colors"
                >
                  Hinzufügen
                </button>
              </div>
            </div>

            {/* Status, Featured, Reihenfolge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Projekt-Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Projekt-Status
                </label>
                <select
                  value={newItem.status || 'completed'}
                  onChange={e => setNewItem({ ...newItem, status: e.target.value as 'completed' | 'in-progress' | 'cancelled' })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="completed">Abgeschlossen</option>
                  <option value="in-progress">In Bearbeitung</option>
                  <option value="cancelled">Abgebrochen</option>
                </select>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItem.featured || false}
                    onChange={e => setNewItem({ ...newItem, featured: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className={`relative w-5 h-5 rounded border-2 transition-colors ${
                      newItem.featured
                        ? 'bg-[#14ad9f] border-[#14ad9f]'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {newItem.featured && (
                      <Star
                        className="w-3 h-3 text-white absolute top-0.5 left-0.5"
                        fill="currentColor"
                      />
                    )}
                  </div>
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Als Featured markieren</span>
                </label>
              </div>

              {/* Reihenfolge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reihenfolge
                </label>
                <input
                  type="number"
                  value={newItem.order || 0}
                  onChange={e => setNewItem({ ...newItem, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="0"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <div></div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  disabled={isSaving}
                  className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={addPortfolioItem}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-linear-to-r from-[#14ad9f] to-[#0d8a7e] text-white rounded-lg hover:from-[#0d8a7e] hover:to-[#0a7068] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Projekt speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Items Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-[#14ad9f] mb-4" />
            <p className="text-sm font-medium">Portfolio wird geladen...</p>
          </div>
        ) : portfolioItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              Noch keine Projekte
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              Fügen Sie Ihr erstes Portfolio-Projekt hinzu
            </p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#14ad9f] text-white rounded-lg hover:bg-[#0d8a7e] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Erstes Projekt erstellen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {portfolioItems.map(item => (
              <PortfolioItemCard
                key={item.id}
                item={item}
                onDelete={deletePortfolioItem}
                onToggleFeatured={toggleFeatured}
                onOpenDetails={openDetailsEditor}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedItem === item.id}
                isSaving={isSaving}
              />
            ))}
          </div>
        )}
      </div>

      {portfolioItems.length > 0 && (
        <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Tipp: Erweiterte Bearbeitung
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Klicken Sie auf das Zahnrad-Symbol bei jedem Projekt für detaillierte Einstellungen wie Technologien, Kunde, Budget und Projektdauer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Item Details Modal */}
      {editingDetailsId && (
        <PortfolioItemDetails
          item={portfolioItems.find(item => item.id === editingDetailsId)!}
          onSave={handleDetailsSave}
          onCancel={handleDetailsCancel}
          onDelete={handleDetailsDelete}
        />
      )}
    </div>
  );
};

// Portfolio Item Card Component
interface PortfolioItemCardProps {
  item: PortfolioItem;
  onDelete: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  isDragging: boolean;
  isSaving?: boolean;
}

const PortfolioItemCard: React.FC<PortfolioItemCardProps> = ({
  item,
  onDelete,
  onToggleFeatured,
  onOpenDetails,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isSaving = false,
}) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, item.id)}
      className={`group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden cursor-move shadow-sm hover:shadow-lg transition-all duration-300 ${
        isDragging ? 'opacity-50 scale-95 rotate-2' : 'hover:scale-[1.02]'
      }`}
    >
      {/* Drag Handle Indicator */}
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
          <GripVertical className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Image Container */}
      <div className="relative aspect-4/3 overflow-hidden">
        {item.imageUrl ? (
          <Image 
            src={item.imageUrl} 
            alt={item.title} 
            fill 
            className="object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-wrap gap-1.5 justify-end">
          {item.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-linear-to-r from-amber-400 to-orange-500 text-white text-xs font-medium rounded-full shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}
          {item.category && (
            <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              {item.category}
            </span>
          )}
        </div>

        {/* Quick Actions Overlay */}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenDetails(item.id);
            }}
            disabled={isSaving}
            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-[#14ad9f] hover:text-white rounded-lg shadow-sm transition-colors"
            title="Details bearbeiten"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            disabled={isSaving}
            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-red-500 hover:text-white rounded-lg shadow-sm transition-colors"
            title="Löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggleFeatured(item.id);
            }}
            disabled={isSaving}
            className={`shrink-0 p-2 rounded-lg transition-all duration-200 ${
              item.featured
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-amber-500'
            }`}
            title={item.featured ? 'Featured entfernen' : 'Als Featured markieren'}
          >
            {item.featured ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfolioForm;
