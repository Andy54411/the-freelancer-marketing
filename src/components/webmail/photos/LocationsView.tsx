'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PhotosApiService, Photo } from '@/services/photos/PhotosApiService';
import { MapPin, ChevronRight, Loader2, RefreshCw, ChevronLeft, Database } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { PhotoEditModal } from './PhotoEditModal';
import { PhotoViewer } from './PhotoViewer';

interface LocationGroup {
  locationName: string;
  latitude: number;
  longitude: number;
  photoCount: number;
  coverPhotoId: string;
  coverPhotoUrl: string;
  photos: Photo[];
}

interface LocationsViewProps {
  userEmail: string;
}

export function LocationsView({ userEmail }: LocationsViewProps) {
  const { isDark } = useWebmailTheme();
  const [locations, setLocations] = useState<LocationGroup[]>([]);
  const [photosWithoutLocation, setPhotosWithoutLocation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [reextracting, setReextracting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationGroup | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [editModalPhotos, setEditModalPhotos] = useState<Photo[] | null>(null);

  const loadLocations = useCallback(async () => {
    if (!userEmail) return;
    
    PhotosApiService.setUserId(userEmail);
    setLoading(true);
    
    try {
      const result = await PhotosApiService.getPhotosByLocation();
      setLocations(result.locations);
      setPhotosWithoutLocation(result.photosWithoutLocation);
    } catch (error) {
      console.error('Fehler beim Laden der Orte:', error);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleGeocoding = async () => {
    setGeocoding(true);
    try {
      const result = await PhotosApiService.triggerGeocoding();
      if (result.geocoded > 0) {
        // Neu laden nach Geocoding
        await loadLocations();
      }
    } catch (error) {
      console.error('Geocoding Fehler:', error);
    } finally {
      setGeocoding(false);
    }
  };

  const handleReextractExif = async () => {
    setReextracting(true);
    try {
      const result = await PhotosApiService.reextractExif(true);
      console.log('Re-EXIF Ergebnis:', result);
      if (result.withGps > 0) {
        // Neu laden nach EXIF-Extraktion
        await loadLocations();
      }
      alert(`EXIF-Daten extrahiert:\n- Verarbeitet: ${result.processed}\n- Mit GPS: ${result.withGps}\n- Mit Datum: ${result.withDate}`);
    } catch (error) {
      console.error('Re-EXIF Fehler:', error);
    } finally {
      setReextracting(false);
    }
  };

  // Handler für PhotoViewer
  const handleEditPhoto = (photo: Photo) => {
    setEditModalPhotos([photo]);
    setSelectedPhoto(null);
  };

  // Detail-Ansicht für einen Ort
  if (selectedLocation) {
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedLocation(null)}
              className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            >
              <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-teal-600" />
              <div>
                <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedLocation.locationName}
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedLocation.photoCount} Foto{selectedLocation.photoCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fotos Grid */}
        <div className="p-6">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
            {selectedLocation.photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={PhotosApiService.getPhotoViewUrl(photo.id)}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Foto Viewer */}
        {selectedPhoto && (
          <PhotoViewer 
            photo={selectedPhoto} 
            photos={selectedLocation.photos}
            onClose={() => setSelectedPhoto(null)}
            onEdit={handleEditPhoto}
            onNavigate={setSelectedPhoto}
          />
        )}
      </div>
    );
  }

  // Hauptansicht: Alle Orte
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-teal-600" />
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Orte
          </h1>
        </div>
        
        {/* Geocoding Button */}
        {photosWithoutLocation > 0 && (
          <button
            onClick={handleGeocoding}
            disabled={geocoding}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDark 
                ? 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-800' 
                : 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-400'
            }`}
          >
            {geocoding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ermittle Ortsnamen...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Ortsnamen ermitteln ({photosWithoutLocation})
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MapPin className={`w-10 h-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h2 className={`text-xl font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Keine Orte gefunden
          </h2>
          <p className={`mb-4 max-w-md ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Lade Fotos mit GPS-Daten hoch, um sie nach Orten zu gruppieren.
            Die meisten Smartphones speichern automatisch den Aufnahmeort.
          </p>
          {/* Re-EXIF Button NUR wenn Fotos vorhanden aber keine GPS-Daten */}
          {photosWithoutLocation > 0 && (
            <button
              onClick={handleReextractExif}
              disabled={reextracting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
              }`}
            >
              {reextracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extrahiere GPS-Daten...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  GPS-Daten erneut aus {photosWithoutLocation} Fotos lesen
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations.map((location, index) => (
            <div
              key={`${location.locationName}-${index}`}
              onClick={() => setSelectedLocation(location)}
              className={`group cursor-pointer rounded-xl overflow-hidden border transition-all hover:shadow-lg ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 hover:border-teal-600' 
                  : 'bg-white border-gray-200 hover:border-teal-500'
              }`}
            >
              {/* Cover Photo */}
              <div className="relative aspect-4/3 overflow-hidden">
                <img
                  src={PhotosApiService.getPhotoViewUrl(location.coverPhotoId)}
                  alt={location.locationName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Location Badge */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="font-medium truncate">{location.locationName}</span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className={`px-4 py-3 flex items-center justify-between ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {location.photoCount} Foto{location.photoCount !== 1 ? 's' : ''}
                </span>
                <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Foto Viewer */}
      {selectedPhoto && (
        <PhotoViewer 
          photo={selectedPhoto} 
          photos={locations.flatMap(l => l.photos)}
          onClose={() => setSelectedPhoto(null)}
          onEdit={handleEditPhoto}
          onNavigate={setSelectedPhoto}
        />
      )}

      {/* Photo Edit Modal */}
      {editModalPhotos && editModalPhotos.length > 0 && (
        <PhotoEditModal
          photos={editModalPhotos}
          onClose={() => setEditModalPhotos(null)}
          onSave={(updatedPhotos) => {
            // Aktualisiere die Orte nach dem Speichern
            loadLocations();
            setEditModalPhotos(null);
          }}
        />
      )}
    </div>
  );
}
