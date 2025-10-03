'use client';

import React, { useState } from 'react';
import { ProfileTabProps, PortfolioItem } from './types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Upload, Plus } from 'lucide-react';
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';

const PortfolioManager: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleAddPortfolioItem = () => {
    if (!profile) return;

    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      title: '',
      description: '',
      images: [],
      category: '',
      completedAt: new Date().toISOString().split('T')[0],
    };

    setProfile(prev =>
      prev
        ? {
            ...prev,
            portfolio: [...(prev.portfolio || []), newItem],
          }
        : null
    );
  };

  const handleRemovePortfolioItem = async (itemId: string) => {
    if (!profile) return;

    const item = profile.portfolio?.find(p => p.id === itemId);
    if (item?.images) {
      // Lösche alle Bilder aus dem Storage
      await Promise.all(
        item.images.map(async imageUrl => {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {}
        })
      );
    }

    setProfile(prev =>
      prev
        ? {
            ...prev,
            portfolio: prev.portfolio?.filter(p => p.id !== itemId) || [],
          }
        : null
    );
  };

  const handleUpdatePortfolioItem = (itemId: string, updates: Partial<PortfolioItem>) => {
    if (!profile) return;

    setProfile(prev =>
      prev
        ? {
            ...prev,
            portfolio:
              prev.portfolio?.map(item => (item.id === itemId ? { ...item, ...updates } : item)) ||
              [],
          }
        : null
    );
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!profile) return;

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `portfolio/${profile.uid}/${itemId}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      handleUpdatePortfolioItem(itemId, {
        images: [...(profile.portfolio?.find(p => p.id === itemId)?.images || []), downloadURL],
      });
    } catch (error) {
      alert('Fehler beim Upload des Bildes. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (itemId: string, imageUrl: string) => {
    if (!profile) return;

    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      const item = profile.portfolio?.find(p => p.id === itemId);
      if (item) {
        handleUpdatePortfolioItem(itemId, {
          images: item.images.filter(img => img !== imageUrl),
        });
      }
    } catch (error) {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio</h3>
        <Button
          onClick={handleAddPortfolioItem}
          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Projekt hinzufügen
        </Button>
      </div>

      <div className="space-y-6">
        {profile?.portfolio?.map(item => (
          <Card key={item.id} className="p-6">
            <div className="space-y-4">
              {/* Titel und Kategorie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Projekt-Titel
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={e => handleUpdatePortfolioItem(item.id, { title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    placeholder="z.B. Badezimmer-Renovation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
                  <input
                    type="text"
                    value={item.category}
                    onChange={e => handleUpdatePortfolioItem(item.id, { category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    placeholder="z.B. Sanitär"
                  />
                </div>
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
                <textarea
                  value={item.description}
                  onChange={e =>
                    handleUpdatePortfolioItem(item.id, { description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                  placeholder="Beschreibung des Projekts..."
                />
              </div>

              {/* Abschlussdatum */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abgeschlossen am
                </label>
                <input
                  type="date"
                  value={item.completedAt}
                  onChange={e =>
                    handleUpdatePortfolioItem(item.id, { completedAt: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
              </div>

              {/* Bilder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projekt-Bilder
                </label>

                {/* Bild-Upload */}
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('Die Datei ist zu groß. Maximal 5MB erlaubt.');
                          return;
                        }
                        handleImageUpload(item.id, file);
                      }
                    }}
                    className="hidden"
                    id={`portfolio-upload-${item.id}`}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor={`portfolio-upload-${item.id}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Wird hochgeladen...' : 'Bild hinzufügen'}
                  </label>
                </div>

                {/* Bild-Grid */}
                {item.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {item.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={imageUrl}
                          alt={`Portfolio ${index + 1}`}
                          width={200}
                          height={96}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <button
                          onClick={() => handleRemoveImage(item.id, imageUrl)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Projekt löschen */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => handleRemovePortfolioItem(item.id)}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Projekt löschen
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {(!profile?.portfolio || profile.portfolio.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>Noch keine Portfolio-Projekte hinzugefügt.</p>
            <p className="text-sm">
              Klicken Sie auf &quot;Projekt hinzufügen&quot; um zu beginnen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioManager;
