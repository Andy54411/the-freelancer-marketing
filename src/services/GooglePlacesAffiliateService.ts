'use client';

/**
 * Google Places API Service für Affiliate-Standorte
 * Nutzt Google Maps JavaScript API direkt im Browser (funktioniert mit Client-Side API Key)
 */

export interface AffiliateChain {
  id: string;
  name: string;
  placeId: string;
  locationCount: number;
  category: string;
  logo?: string;
  website?: string;
}

export interface AffiliateCountry {
  id: string;
  name: string;
  countryCode: string;
  hasChains: boolean;
  chains: AffiliateChain[];
}

export class GooglePlacesAffiliateService {
  private static placesService: google.maps.places.PlacesService | null = null;

  /**
   * Initialisiert PlacesService (muss aufgerufen werden nachdem Google Maps geladen ist)
   */
  static initialize() {
    console.log('🔧 PlacesService initialize() called');
    console.log('  google defined:', typeof google !== 'undefined');
    console.log(
      '  google.maps defined:',
      typeof google !== 'undefined' && typeof google.maps !== 'undefined'
    );
    console.log(
      '  google.maps.places defined:',
      typeof google !== 'undefined' && google.maps?.places !== undefined
    );

    if (typeof google !== 'undefined' && google.maps?.places) {
      this.placesService = new google.maps.places.PlacesService(document.createElement('div'));
      console.log('✅ PlacesService initialized successfully');
    } else {
      console.error('❌ Cannot initialize PlacesService - Google Maps not loaded');
    }
  }

  /**
   * Wrapper für TextSearch als Promise
   */
  private static textSearchPromise(
    request: google.maps.places.TextSearchRequest
  ): Promise<google.maps.places.PlaceResult[]> {
    console.log('🔍 textSearchPromise called:', request.query);
    console.log('  placesService exists:', !!this.placesService);

    if (!this.placesService) {
      console.log('⚠️ PlacesService not found, trying to initialize...');
      this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        console.error('❌ PlacesService still not initialized after init attempt');
        reject(new Error('PlacesService not initialized'));
        return;
      }

      console.log('📤 Calling textSearch for:', request.query);
      this.placesService.textSearch(request, (results, status) => {
        console.log('📥 textSearch callback - Status:', status, 'Results:', results?.length || 0);

        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          console.log('✅ Search successful:', results.length, 'results');
          resolve(results);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.log('⚠️ Zero results for:', request.query);
          resolve([]);
        } else {
          console.error('❌ Search failed with status:', status);
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  }
  /**
   * Lädt Affiliate-Ketten für ein bestimmtes Land - NUR echte Google Places Daten
   */
  static async getChainsByCountry(countryCode: string): Promise<AffiliateChain[]> {
    try {
      return await this.searchChainsByCategory(countryCode);
    } catch (error) {
      console.error('Fehler beim Laden der Affiliate-Ketten:', error);
      throw error;
    }
  }

  /**
   * Sucht nach Ketten nach Kategorien - Nutzt Google Maps JavaScript API
   */
  private static async searchChainsByCategory(countryCode: string): Promise<AffiliateChain[]> {
    console.log('🌍 searchChainsByCategory START for:', countryCode);
    const chains: AffiliateChain[] = [];
    const seenPlaceIds = new Set<string>();
    const countryName = this.getCountryName(countryCode);
    console.log('  Country name:', countryName);

    // Kategorien für die Suche
    const categories = [
      { query: 'supermarket', category: 'grocery' },
      { query: 'grocery store', category: 'grocery' },
      { query: 'restaurant chain', category: 'restaurant' },
      { query: 'fast food', category: 'fast_food' },
      { query: 'coffee shop', category: 'cafe' },
      { query: 'pharmacy', category: 'pharmacy' },
      { query: 'clothing store', category: 'clothing' },
      { query: 'department store', category: 'department_store' },
      { query: 'gas station', category: 'gas_station' },
      { query: 'bank', category: 'bank' },
    ];

    console.log('  Starting search for', categories.length, 'categories...');

    for (const { query, category } of categories) {
      try {
        const searchQuery = `${query} in ${countryName}`;
        console.log(`\n🔎 Searching category: "${searchQuery}"`);

        const results = await this.textSearchPromise({
          query: searchQuery,
        });

        console.log(`  Found ${results.length} results for "${searchQuery}"`);
        if (results.length > 0) {
          console.log('  First result data:', {
            name: results[0].name,
            place_id: results[0].place_id,
            user_ratings_total: results[0].user_ratings_total,
            types: results[0].types,
            business_status: results[0].business_status,
          });
        }

        for (const place of results) {
          if (place.place_id && !seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id);

            const ratingsTotal = place.user_ratings_total || 0;
            const estimatedCount = this.estimateLocationCount(ratingsTotal, countryCode);

            console.log(
              `    Adding chain: ${place.name} - ratings: ${ratingsTotal}, estimated locations: ${estimatedCount}`
            );

            chains.push({
              id: place.place_id,
              name: place.name || 'Unknown',
              placeId: place.place_id,
              locationCount: estimatedCount,
              category: category,
            });
          }
        }
      } catch (error) {
        console.error(`❌ Fehler bei der Suche in Kategorie "${query}":`, error);
      }
    }

    console.log('\n🏁 searchChainsByCategory COMPLETE');
    console.log('  Total chains found:', chains.length);
    console.log('  Unique place IDs:', seenPlaceIds.size);

    return chains.sort((a, b) => b.locationCount - a.locationCount);
  }

  /**
   * Gibt Ländernamen für countryCode zurück
   */
  private static getCountryName(countryCode: string): string {
    const names: { [key: string]: string } = {
      US: 'United States',
      DE: 'Germany',
      GB: 'United Kingdom',
      FR: 'France',
      IT: 'Italy',
      ES: 'Spain',
      NL: 'Netherlands',
      CA: 'Canada',
      AU: 'Australia',
      JP: 'Japan',
    };
    return names[countryCode] || 'World';
  }

  /**
   * Schätzt Standort-Anzahl basierend auf Bewertungen
   */
  private static estimateLocationCount(userRatingsTotal: number, countryCode: string): number {
    if (!userRatingsTotal) return 1;

    // Grober Algorithmus: mehr Bewertungen = mehr Standorte
    const baseMultiplier = countryCode === 'US' ? 50 : countryCode === 'DE' ? 20 : 10;
    const estimated = Math.floor(userRatingsTotal / baseMultiplier);

    // Mindestens 1, maximal 50.000
    return Math.max(1, Math.min(50000, estimated));
  }

  /**
   * Lädt alle verfügbaren Länder mit Ketten
   */
  static async getAvailableCountries(): Promise<AffiliateCountry[]> {
    const countries = [
      { id: 'usa', name: 'USA', countryCode: 'US' },
      { id: 'germany', name: 'Deutschland', countryCode: 'DE' },
      { id: 'uk', name: 'Vereinigtes Königreich', countryCode: 'GB' },
      { id: 'france', name: 'Frankreich', countryCode: 'FR' },
      { id: 'italy', name: 'Italien', countryCode: 'IT' },
      { id: 'spain', name: 'Spanien', countryCode: 'ES' },
      { id: 'netherlands', name: 'Niederlande', countryCode: 'NL' },
      { id: 'canada', name: 'Kanada', countryCode: 'CA' },
      { id: 'australia', name: 'Australien', countryCode: 'AU' },
      { id: 'japan', name: 'Japan', countryCode: 'JP' },
    ];

    const result: AffiliateCountry[] = [];

    for (const country of countries) {
      const chains = await this.getChainsByCountry(country.countryCode);

      result.push({
        id: country.id,
        name: country.name,
        countryCode: country.countryCode,
        hasChains: chains.length > 0,
        chains: chains,
      });
    }

    return result;
  }

  /**
   * Sucht nach Ketten basierend auf Suchbegriff - Nutzt Google Maps JavaScript API
   */
  static async searchChains(query: string, countryCode?: string): Promise<AffiliateChain[]> {
    try {
      const searchQuery = countryCode ? `${query} in ${this.getCountryName(countryCode)}` : query;

      const results = await this.textSearchPromise({
        query: searchQuery,
      });

      return results.map(place => ({
        id: place.place_id || '',
        name: place.name || 'Unknown',
        placeId: place.place_id || '',
        locationCount: this.estimateLocationCount(
          place.user_ratings_total || 0,
          countryCode || 'US'
        ),
        category: 'retail',
      }));
    } catch (error) {
      console.error('Fehler bei der Ketten-Suche:', error);
      return [];
    }
  }
}
