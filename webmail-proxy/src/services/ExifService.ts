/**
 * EXIF Service für Metadatenextraktion aus Fotos
 * 
 * Verwendet 'exifr' für bessere Kompatibilität mit allen Bildformaten:
 * JPEG, PNG, HEIC, HEIF, TIFF, WebP, AVIF, etc.
 * 
 * Extrahiert GPS-Koordinaten, Aufnahmedatum, Kamerainfos etc.
 */

import exifr from 'exifr';

export interface PhotoMetadata {
  width?: number;
  height?: number;
  takenAt?: number;
  latitude?: number;
  longitude?: number;
  camera?: string;
  make?: string;
  model?: string;
  orientation?: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
  display_name?: string;
}

export class ExifService {
  /**
   * Extrahiert EXIF-Metadaten aus einem Bild-Buffer
   * Unterstützt: JPEG, PNG, HEIC, HEIF, TIFF, WebP, AVIF
   */
  static async extractMetadataAsync(buffer: Buffer): Promise<PhotoMetadata> {
    try {
      // Alle EXIF-Daten extrahieren (inklusive GPS)
      const exif = await exifr.parse(buffer, {
        // Alle relevanten Segmente parsen
        tiff: true,
        exif: true,
        gps: true,
        icc: false, // ICC-Profile brauchen wir nicht
        iptc: false, // IPTC brauchen wir nicht
        xmp: false, // XMP brauchen wir nicht
        // Wichtige Tags
        pick: [
          'DateTimeOriginal', 'CreateDate', 'ModifyDate',
          'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
          'Make', 'Model', 'Orientation',
          'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight',
        ],
      });
      
      if (!exif) {
        console.log('[ExifService] Keine EXIF-Daten gefunden');
        return {};
      }
      
      const metadata: PhotoMetadata = {};
      
      // Bildgröße
      if (exif.ExifImageWidth && exif.ExifImageHeight) {
        metadata.width = exif.ExifImageWidth;
        metadata.height = exif.ExifImageHeight;
      } else if (exif.ImageWidth && exif.ImageHeight) {
        metadata.width = exif.ImageWidth;
        metadata.height = exif.ImageHeight;
      }
      
      // Aufnahmedatum
      if (exif.DateTimeOriginal) {
        const date = exif.DateTimeOriginal instanceof Date 
          ? exif.DateTimeOriginal 
          : new Date(exif.DateTimeOriginal);
        metadata.takenAt = date.getTime();
      } else if (exif.CreateDate) {
        const date = exif.CreateDate instanceof Date 
          ? exif.CreateDate 
          : new Date(exif.CreateDate);
        metadata.takenAt = date.getTime();
      }
      
      // GPS-Koordinaten (exifr liefert bereits korrigierte Werte)
      if (exif.latitude !== undefined && exif.longitude !== undefined) {
        metadata.latitude = exif.latitude;
        metadata.longitude = exif.longitude;
        console.log(`[ExifService] GPS gefunden: ${metadata.latitude}, ${metadata.longitude}`);
      } else if (exif.GPSLatitude !== undefined && exif.GPSLongitude !== undefined) {
        // Fallback: Rohe GPS-Daten
        let lat = exif.GPSLatitude as number;
        let lon = exif.GPSLongitude as number;
        
        // Korrigiere Vorzeichen basierend auf Ref
        if (exif.GPSLatitudeRef === 'S' && lat > 0) {
          lat = -lat;
        }
        if (exif.GPSLongitudeRef === 'W' && lon > 0) {
          lon = -lon;
        }
        
        metadata.latitude = lat;
        metadata.longitude = lon;
        console.log(`[ExifService] GPS (raw) gefunden: ${metadata.latitude}, ${metadata.longitude}`);
      }
      
      // Kamera-Infos
      if (exif.Make) {
        metadata.make = String(exif.Make).trim();
      }
      if (exif.Model) {
        metadata.model = String(exif.Model).trim();
        metadata.camera = metadata.make 
          ? `${metadata.make} ${metadata.model}`.trim()
          : metadata.model;
      }
      
      // Orientierung
      if (exif.Orientation) {
        metadata.orientation = Number(exif.Orientation);
      }
      
      console.log('[ExifService] Extrahiert:', {
        takenAt: metadata.takenAt ? new Date(metadata.takenAt).toISOString() : null,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        camera: metadata.camera,
      });
      
      return metadata;
    } catch (error) {
      console.warn('[ExifService] EXIF-Parsing fehlgeschlagen:', (error as Error).message);
      return {};
    }
  }
  
  /**
   * Synchrone Version für Kompatibilität (startet async intern)
   * ACHTUNG: Dies ist ein Workaround - besser extractMetadataAsync verwenden!
   */
  static extractMetadata(buffer: Buffer): PhotoMetadata {
    // Für Sync-Aufrufe: Versuche den alten exif-parser als Fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExifParser = require('exif-parser');
      const parser = ExifParser.create(buffer);
      const result = parser.parse();
      
      const metadata: PhotoMetadata = {};
      
      if (result.imageSize) {
        metadata.width = result.imageSize.width;
        metadata.height = result.imageSize.height;
      }
      
      if (result.tags) {
        if (result.tags.DateTimeOriginal) {
          metadata.takenAt = result.tags.DateTimeOriginal * 1000;
        } else if (result.tags.CreateDate) {
          metadata.takenAt = result.tags.CreateDate * 1000;
        }
        
        if (result.tags.GPSLatitude !== undefined && result.tags.GPSLongitude !== undefined) {
          metadata.latitude = result.tags.GPSLatitude;
          metadata.longitude = result.tags.GPSLongitude;
        }
        
        if (result.tags.Make) {
          metadata.make = result.tags.Make;
        }
        if (result.tags.Model) {
          metadata.model = result.tags.Model;
          metadata.camera = result.tags.Make 
            ? `${result.tags.Make} ${result.tags.Model}`.trim()
            : result.tags.Model;
        }
        
        if (result.tags.Orientation) {
          metadata.orientation = result.tags.Orientation;
        }
      }
      
      return metadata;
    } catch {
      return {};
    }
  }
  
  /**
   * Reverse Geocoding: Koordinaten zu Ortsnamen
   * Verwendet OpenStreetMap Nominatim (kostenlos, DSGVO-konform)
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=de`,
        {
          headers: {
            'User-Agent': 'Taskilo Photos/1.0 (https://taskilo.de)',
          },
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json() as NominatimResponse;
      
      // Ortsname extrahieren (Stadt/Gemeinde bevorzugen)
      if (data.address) {
        return data.address.city 
          || data.address.town 
          || data.address.village 
          || data.address.municipality
          || data.address.county
          || data.address.state
          || null;
      }
      
      return data.display_name?.split(',')[0] || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Gibt alle EXIF-Daten als Debug-Output zurück
   */
  static async getFullExifData(buffer: Buffer): Promise<Record<string, unknown>> {
    try {
      const exif = await exifr.parse(buffer, true);
      return exif || {};
    } catch {
      return {};
    }
  }
}
