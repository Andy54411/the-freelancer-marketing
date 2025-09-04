'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, Image as ImageIcon, Trash2, Save, Eye, EyeOff, Settings } from 'lucide-react';
import { UserDataForSettings } from '@/components/dashboard/SettingsComponent';
import Image from 'next/image';
import PortfolioItemDetails from './PortfolioItemDetails';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/clients';
import { toast } from 'react-hot-toast';

export interface PortfolioFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: any) => void;
  userId?: string;
}

interface PortfolioItem {
  id: string;
  imageUrl: string;
  imageFile?: File;
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

const PortfolioForm: React.FC<PortfolioFormProps> = ({ formData, handleChange, userId }) => {
  // Initialize portfolio from formData only once on mount
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(() => {
    return formData.step3?.portfolio && Array.isArray(formData.step3.portfolio) 
      ? formData.step3.portfolio 
      : [];
  });
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newItem, setNewItem] = useState<PortfolioItem>({
    id: '',
    imageUrl: '',
    title: '',
    description: '',
    category: '',
    featured: false
  });
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Update formData when portfolio changes (use a ref to track if we should update)
  const shouldUpdateFormData = useRef(false);

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
        const portfolioData = data?.step3?.portfolio;
        
        if (portfolioData && Array.isArray(portfolioData)) {
          setPortfolioItems(portfolioData);
          // Auch die formData aktualisieren
          handleChange('step3.portfolio', portfolioData);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Portfolios:', error);
      toast.error('Fehler beim Laden des Portfolios.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Portfolio-Daten beim ersten Laden abrufen
    loadPortfolioFromDatabase();
  }, [userId]);
  
  useEffect(() => {
    // Mark that we should start updating form data after first render
    shouldUpdateFormData.current = true;
  }, []);

  useEffect(() => {
    if (shouldUpdateFormData.current) {
      // Entferne File-Objekte bevor sie an das Formular weitergegeben werden
      const cleanPortfolio = portfolioItems.map(item => {
        const { imageFile, ...cleanItem } = item;
        return cleanItem;
      });
      handleChange('step3.portfolio', cleanPortfolio);
    }
  }, [portfolioItems]);

  const handleImageUpload = (files: FileList | null, isNewItem: boolean = false, itemId?: string) => {
    if (!files) return;

    // For new item, only take first file
    if (isNewItem && files.length > 0) {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setNewItem(prev => ({ 
            ...prev, 
            imageUrl, 
            imageFile: file 
          }));
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    // For multiple uploads, create multiple portfolio items
    Array.from(files).forEach((file, index) => {
      if (file && file.type.startsWith('image/') && portfolioItems.length + index < 5) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          
          if (itemId) {
            // Update existing item
            setPortfolioItems(prev => 
              prev.map(item => 
                item.id === itemId 
                  ? { ...item, imageUrl, imageFile: file }
                  : item
              )
            );
          } else {
            // Create new item from multi-upload
            const item: PortfolioItem = {
              id: `${Date.now()}-${index}`,
              imageUrl,
              imageFile: file,
              title: `Portfolio ${portfolioItems.length + index + 1}`,
              description: '',
              category: '',
              featured: false,
              order: portfolioItems.length + index,
              createdAt: new Date().toISOString()
            };
            
            setPortfolioItems(prev => [...prev, item]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleMultipleImageUpload = (files: FileList | null) => {
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
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          const item: PortfolioItem = {
            id: `${Date.now()}-${i}`,
            imageUrl,
            imageFile: file,
            title: `Portfolio ${portfolioItems.length + i + 1}`,
            description: '',
            category: '',
            featured: false,
            order: portfolioItems.length + i,
            createdAt: new Date().toISOString()
          };
          
          setPortfolioItems(prev => [...prev, item]);
        };
        reader.readAsDataURL(file);
      }
    }

    if (files.length > remainingSlots) {
      alert(`Nur ${remainingSlots} von ${files.length} Bildern wurden hochgeladen, da Sie maximal 5 Portfolio-Einträge haben können.`);
    }
  };

  // Funktion um Portfolio direkt in Datenbank zu speichern
  const savePortfolioToDatabase = async (updatedPortfolio: PortfolioItem[]) => {
    if (!userId) {
      toast.error('Benutzer-ID fehlt zum Speichern.');
      return false;
    }

    try {
      // Entferne File-Objekte vor dem Speichern (Firestore unterstützt keine File-Objekte)
      const cleanPortfolio = updatedPortfolio.map(item => {
        const { imageFile, ...cleanItem } = item;
        return cleanItem;
      });

      await updateDoc(doc(db, 'companies', userId), {
        'step3.portfolio': cleanPortfolio,
        updatedAt: serverTimestamp()
      });
      toast.success('Portfolio gespeichert!');
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern des Portfolios:', error);
      toast.error('Fehler beim Speichern des Portfolios.');
      return false;
    }
  };

  const addPortfolioItem = async () => {
    if (portfolioItems.length >= 5) {
      alert('Sie können maximal 5 Portfolio-Einträge hinzufügen.');
      return;
    }

    if (newItem.imageUrl && newItem.title.trim()) {
      const item: PortfolioItem = {
        ...newItem,
        id: Date.now().toString(),
        order: portfolioItems.length,
        createdAt: new Date().toISOString()
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
          featured: false 
        });
        setIsAdding(false);
      }
    }
  };

  const deletePortfolioItem = async (id: string) => {
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
      order: index
    }));

    setPortfolioItems(reorderedItems);
    setDraggedItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Portfolio
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Zeigen Sie Ihre besten Arbeiten (maximal 5 Einträge).
          </p>
          <p className="text-sm text-[#14ad9f] font-medium mt-1">
            Klicken Sie auf das Zahnrad-Symbol für detaillierte Bearbeitung
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          disabled={portfolioItems.length >= 5}
          className="px-3 py-2 text-sm bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Hinzufügen ({portfolioItems.length}/5)
        </button>
      </div>

      {/* Add New Portfolio Item Form */}
      {isAdding && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bild hochladen *
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 1) {
                      // Multiple files - create multiple items
                      handleMultipleImageUpload(files);
                      setIsAdding(false);
                    } else if (files && files.length === 1) {
                      // Single file - for the current form
                      handleImageUpload(files, true);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-[#14ad9f] transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Bilder auswählen (einzeln oder mehrere)</span>
                </div>
              </label>
              {newItem.imageUrl && (
                <div className="mt-3">
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border border-gray-200">
                    <Image
                      src={newItem.imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="z.B. Küchenrenovierung"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategorie
                </label>
                <input
                  type="text"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  placeholder="z.B. Handwerk, Design"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Beschreiben Sie dieses Projekt..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newItem.featured}
                  onChange={(e) => setNewItem({ ...newItem, featured: e.target.checked })}
                  className="mr-2 text-[#14ad9f] focus:ring-[#14ad9f]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Featured (wird prominent angezeigt)
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={addPortfolioItem}
                disabled={!newItem.imageUrl || !newItem.title.trim()}
                className="px-3 py-2 text-sm bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Hinzufügen
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewItem({ id: '', imageUrl: '', title: '', description: '', category: '', featured: false });
                }}
                className="px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Items Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-3"></div>
            <p className="text-sm">Portfolio wird geladen...</p>
          </div>
        ) : portfolioItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Noch keine Portfolio-Einträge erstellt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioItems.map((item) => (
              <PortfolioItemCard
                key={item.id}
                item={item}
                onDelete={deletePortfolioItem}
                onToggleFeatured={toggleFeatured}
                onOpenDetails={openDetailsEditor}
                onImageUpload={(file) => {
                  const fileList = new DataTransfer();
                  fileList.items.add(file);
                  handleImageUpload(fileList.files, false, item.id);
                }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedItem === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {portfolioItems.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Ihre Portfolio-Einträge werden auf Ihrem öffentlichen Profil angezeigt. 
            Featured Einträge werden besonders hervorgehoben.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            <strong>Tipp:</strong> Klicken Sie auf das <Settings className="w-3 h-3 inline mx-1" /> Symbol für erweiterte Bearbeitung 
            (Technologien, Kunde, Budget, Projektdauer, etc.)
          </p>
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
  onImageUpload: (file: File, isNewItem: boolean, itemId?: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  isDragging: boolean;
}

const PortfolioItemCard: React.FC<PortfolioItemCardProps> = ({
  item,
  onDelete,
  onToggleFeatured,
  onOpenDetails,
  onImageUpload,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, item.id)}
      className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden cursor-move ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div className="relative aspect-video">
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          {item.featured && (
            <span className="px-2 py-1 bg-[#14ad9f] text-white text-xs rounded-full">
              Featured
            </span>
          )}
          {item.category && (
            <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full">
              {item.category}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">
            {item.title}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleFeatured(item.id)}
              className={`p-1 rounded text-xs transition-colors ${
                item.featured 
                  ? 'bg-[#14ad9f] text-white hover:bg-[#129488]' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={item.featured ? 'Featured entfernen' : 'Als Featured markieren'}
            >
              {item.featured ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button
              onClick={() => onOpenDetails(item.id)}
              className="p-1 text-gray-600 dark:text-gray-300 hover:text-[#14ad9f] transition-colors"
              title="Details bearbeiten (Technologien, Kunde, Budget, etc.)"
            >
              <Settings className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {item.description && (
          <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default PortfolioForm;
