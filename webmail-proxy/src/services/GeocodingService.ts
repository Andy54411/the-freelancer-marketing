/**
 * Taskilo Geocoding Service
 * 
 * Verwendet OpenStreetMap Nominatim für Reverse Geocoding.
 * Konvertiert GPS-Koordinaten in lesbare Ortsnamen.
 */

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    suburb?: string;
    neighbourhood?: string;
  };
  display_name?: string;
}

interface LocationInfo {
  locationName: string;       // Kurzname (Stadt/Ort)
  locationFull: string;       // Vollständige Adresse
  city: string | null;
  state: string | null;
  country: string | null;
}

// Cache für Geocoding-Ergebnisse (um API-Limits einzuhalten)
const geocodeCache = new Map<string, LocationInfo>();

// Rate Limiting: Nominatim erlaubt max 1 Request/Sekunde
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 Sekunden

class GeocodingServiceClass {
  private userAgent = 'Taskilo Photos/1.0 (https://taskilo.de)';

  /**
   * Reverse Geocoding: Koordinaten → Ortsname
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<LocationInfo | null> {
    if (!latitude || !longitude) {
      return null;
    }

    // Runde auf 3 Dezimalstellen für Cache (ca. 100m Genauigkeit)
    const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    
    // Aus Cache holen wenn vorhanden
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    try {
      // Rate Limiting einhalten
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await this.sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
      lastRequestTime = Date.now();

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=de`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        console.error(`Geocoding Fehler: ${response.status}`);
        return null;
      }

      const data = await response.json() as NominatimResponse;
      
      if (!data.address) {
        return null;
      }

      const addr = data.address;
      
      // Bestimme den Ortsnamen (Stadt, Gemeinde oder Landkreis)
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || null;
      const state = addr.state || null;
      const country = addr.country || null;

      // Kurzname erstellen
      let locationName = '';
      if (city) {
        locationName = city;
        if (country && country !== 'Deutschland') {
          locationName += `, ${country}`;
        }
      } else if (addr.county) {
        locationName = addr.county;
        if (country) {
          locationName += `, ${country}`;
        }
      } else if (country) {
        locationName = country;
      } else {
        locationName = 'Unbekannter Ort';
      }

      const locationInfo: LocationInfo = {
        locationName,
        locationFull: data.display_name || locationName,
        city,
        state,
        country,
      };

      // Im Cache speichern
      geocodeCache.set(cacheKey, locationInfo);

      return locationInfo;
    } catch (error) {
      console.error('Geocoding Fehler:', error);
      return null;
    }
  }

  /**
   * Batch-Geocoding für mehrere Fotos
   * Verarbeitet mit Rate Limiting
   */
  async batchGeocode(
    coordinates: Array<{ id: string; latitude: number; longitude: number }>
  ): Promise<Map<string, LocationInfo>> {
    const results = new Map<string, LocationInfo>();

    for (const coord of coordinates) {
      const info = await this.reverseGeocode(coord.latitude, coord.longitude);
      if (info) {
        results.set(coord.id, info);
      }
    }

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gruppiert Koordinaten nach ungefährem Standort
   * Verwendet Rasterung für schnelle Gruppierung ohne API-Aufruf
   */
  groupByLocation(
    photos: Array<{ id: string; latitude: number | null; longitude: number | null }>
  ): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const photo of photos) {
      if (!photo.latitude || !photo.longitude) {
        continue;
      }

      // Runde auf 2 Dezimalstellen (ca. 1km Genauigkeit)
      const key = `${photo.latitude.toFixed(2)},${photo.longitude.toFixed(2)}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(photo.id);
    }

    return groups;
  }
}

export const GeocodingService = new GeocodingServiceClass();
