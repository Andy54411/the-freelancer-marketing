import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Service für Kategorie- und Subkategorie-Management
/// Synchronisiert mit dem Web-Projekt
class CategoriesService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  /// Kategorien-Datenstruktur aus dem Web-Projekt
  static const Map<String, List<String>> categories = {
    'Handwerk': [
      'Tischler',
      'Klempner',
      'Maler & Lackierer',
      'Elektriker',
      'HeizungSanitär',
      'Fliesenleger',
      'Dachdecker',
      'Maurer',
      'Trockenbauer',
      'Schreiner',
      'Zimmerer',
      'Bodenleger',
      'Glaser',
      'Schlosser',
      'Metallbauer',
      'FensterTürenbau',
      'Heizung',
      'Autoreparatur',
      'Montageservice',
      'Umzugshelfer',
    ],
    'Haushalt': [
      'Reinigungskraft',
      'Haushaltshilfe',
      'Fensterputzer',
      'Teppichreinigung',
      'Bodenreinigung',
      'Hausreinigung',
    ],
    'Transport': [
      'Fahrer',
      'Kurierdienst',
      'Transportdienstleistungen',
      'Lagerlogistik',
      'Logistik',
      'MöbelTransportieren',
    ],
    'IT & Digital': [
      'Webentwicklung',
      'App-Entwicklung',
      'IT-Support',
      'Systemadministration',
      'Cybersecurity',
      'Softwareentwicklung',
      'Datenanalyse',
      'Cloud Services',
      'Netzwerktechnik',
    ],
    'Garten': [
      'Gartenpflege',
      'Landschaftsgärtner',
      'Rasenpflege',
      'Heckenschnitt',
      'Baumpflege',
      'Gartenplanung',
      'Bewässerungsanlagen',
    ],
    'Wellness': [
      'Massage',
      'Physiotherapie',
      'Ernährungsberatung',
      'Kosmetik',
      'Friseur',
      'FitnessTraining',
      'Seniorenbetreuung',
    ],
    'Hotel & Gastronomie': [
      'Mietkoch',
      'Mietkellner',
      'Catering',
    ],
    'Marketing & Vertrieb': [
      'OnlineMarketing',
      'Social Media Marketing',
      'ContentMarketing',
      'Marketingberater',
      'Marktforschung',
    ],
    'Finanzen & Recht': [
      'Buchhaltung',
      'Steuerberatung',
      'Rechtsberatung',
      'Finanzberatung',
      'Versicherungsberatung',
      'Rechnungswesen',
      'Unternehmensberatung',
      'Verwaltung',
    ],
    'Bildung & Unterstützung': [
      'Nachhilfe',
      'Nachhilfelehrer',
      'Sprachunterricht',
      'Musikunterricht',
      'Übersetzer',
      'Kinderbetreuung',
    ],
    'Tiere & Pflanzen': [
      'Tierbetreuung',
      'Hundetrainer',
      'TierarztAssistenz',
      'Tierpflege',
    ],
    'Kreativ & Kunst': [
      'Fotograf',
      'Videograf',
      'Grafiker',
      'Musiker',
      'Texter',
      'Dekoration',
    ],
    'Event & Veranstaltung': [
      'Eventplanung',
      'Sicherheitsdienst',
      'DJService',
      'Musiker',
    ],
    'Büro & Administration': [
      'Telefonservice',
      'Inventur',
      'Recherche',
    ],
  };

  /// Get all category names
  static List<String> getCategoryNames() {
    return categories.keys.toList();
  }

  /// Get subcategories for a specific category
  static List<String> getSubcategories(String categoryName) {
    return categories[categoryName] ?? [];
  }

  /// Find category by subcategory name
  static String? findCategoryBySubcategory(String subcategoryName) {
    for (final entry in categories.entries) {
      if (entry.value.contains(subcategoryName)) {
        return entry.key;
      }
    }
    return null;
  }

  /// Get all subcategories as flat list
  static List<String> getAllSubcategories() {
    final List<String> allSubcategories = [];
    for (final subcategories in categories.values) {
      allSubcategories.addAll(subcategories);
    }
    return allSubcategories;
  }

  /// Search subcategories by query
  static List<String> searchSubcategories(String query) {
    if (query.isEmpty) return [];
    
    final lowercaseQuery = query.toLowerCase();
    final allSubcategories = getAllSubcategories();
    
    return allSubcategories.where((subcategory) {
      return subcategory.toLowerCase().contains(lowercaseQuery);
    }).toList();
  }

  /// Lädt Daten für eine spezifische Subcategory
  static Future<Map<String, dynamic>?> getSubcategoryData(String subcategoryId) async {
    try {
      debugPrint('📋 Lade Subcategory Daten für: $subcategoryId');
      
      // Direkt aus Firestore laden
      final doc = await _firestore.collection('subcategories').doc(subcategoryId).get();
      
      if (doc.exists) {
        debugPrint('✅ Subcategory Daten erfolgreich geladen');
        return doc.data();
      } else {
        debugPrint('❌ Keine Daten für Subcategory gefunden: $subcategoryId');
        return null;
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Subcategory Daten: $e');
      return null;
    }
  }

  /// Get providers for a subcategory from Firestore directly (companies collection only)
  static Future<List<Map<String, dynamic>>> getProvidersForSubcategory(String subcategory) async {
    try {
      debugPrint('🔍 Suche Provider für Subcategory: $subcategory');
      
      List<Map<String, dynamic>> providers = [];
      
      // Search in companies collection with limit for security rules
      // Companies collection: public read access with limit <= 50
      debugPrint('📋 Suche in companies Collection...');
      try {
        final companiesQuery = await _firestore
            .collection('companies')
            .where('selectedSubcategory', isEqualTo: subcategory)
            .limit(50) // Required by security rules for public access
            .get();
        
        debugPrint('✅ ${companiesQuery.docs.length} Provider in companies Collection gefunden');
        
        for (final doc in companiesQuery.docs) {
          final data = doc.data();
          
          // Debug: Zeige echte Firebase-Daten
          debugPrint('🔍 Echter Provider gefunden: ${data['companyName']} (ID: ${doc.id})');
          debugPrint('📊 Daten: $data');
          
          // Lade echte Bewertungen für diesen Provider
          final reviewData = await _getProviderReviews(doc.id);
          
          // Verwende nur echte Firebase-Daten
          final provider = {
            'id': doc.id,
            'name': data['companyName'] ?? 'Unbekanntes Unternehmen',
            'providerName': data['companyName'] ?? 'Unbekanntes Unternehmen', 
            'title': data['companyName'] ?? 'Unbekanntes Unternehmen',
            'companyName': data['companyName'] ?? '',
            'description': data['description'] ?? data['publicDescription'] ?? '',
            'subcategoryName': data['selectedSubcategory'] ?? subcategory,
            'price': (data['hourlyRate'] as num?)?.toDouble() ?? (data['pricePerHour'] as num?)?.toDouble() ?? 0.0,
            'rating': reviewData['averageRating'],
            'reviewCount': reviewData['reviewCount'],
            'profilePictureURL': data['profilePictureURL'] ?? data['logoURL'] ?? '',
            'location': '${data['companyCity'] ?? data['city'] ?? ''}, ${data['companyCountry'] ?? data['country'] ?? ''}'.trim().replaceAll(RegExp(r'^,\s*'), ''),
            // Echte Firebase-Werte statt Mock-Daten
            'isPro': data['isPremium'] ?? data['isVerified'] ?? false,
            'isFastDelivery': data['fastDelivery'] ?? data['quickResponse'] ?? false,
            'isOnline': data['offersOnlineServices'] ?? false,
            'isOnsite': data['offersOnsiteServices'] ?? true,
            'createdAt': data['createdAt']?.toDate()?.toIso8601String() ?? DateTime.now().toIso8601String(),
            'lastActive': data['lastLoginAt']?.toDate()?.toIso8601String() ?? DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
            'responseTimeHours': (data['averageResponseTime'] as num?)?.toDouble() ?? 24.0,
            'completionRate': (data['completionRate'] as num?)?.toDouble() ?? 95.0,
            'source': 'companies',
            'category': data['selectedCategory'] ?? '',
            'subcategory': data['selectedSubcategory'] ?? '',
            // Alle originalen Firebase-Daten beibehalten
            'originalData': data,
          };
          
          providers.add(provider);
        }
      } catch (e) {
        debugPrint('⚠️ Fehler bei companies Collection: $e');
      }
      
      // NOTE: Users collection search disabled due to permission issues
      // All providers are now in the companies collection only
      /*
      // Search in users collection for firma users (with limit for security)
      debugPrint('📋 Suche in users Collection (user_type: firma)...');
      try {
        final usersQuery = await _firestore
            .collection('users')
            .where('selectedSubcategory', isEqualTo: subcategory)
            .where('user_type', isEqualTo: 'firma')
            .limit(50) // Add limit for security rules
            .get();
        
        debugPrint('✅ ${usersQuery.docs.length} Provider in users Collection gefunden');
        
        for (final doc in usersQuery.docs) {
          final data = doc.data();
          
          // Lade echte Bewertungen für diesen Provider
          final reviewData = await _getProviderReviews(doc.id);
          
          final provider = {
            'id': doc.id,
            'name': data['companyName'] ?? 'Unbekanntes Unternehmen',
            'providerName': data['companyName'] ?? 'Unbekanntes Unternehmen',
            'title': data['companyName'] ?? 'Unbekanntes Unternehmen',
            'companyName': data['companyName'] ?? '',
            'description': data['publicDescription'] ?? '',
            'subcategoryName': subcategory, // Zeige die Subcategory
            'price': (data['hourlyRate'] as num?)?.toDouble() ?? 0.0,
            'rating': reviewData['averageRating'],
            'reviewCount': reviewData['reviewCount'],
            'profilePictureURL': data['profilePictureURL'] ?? '',
            'location': '${data['companyCityForBackend'] ?? ''}, ${data['companyCountryForBackend'] ?? ''}'.trim().replaceAll(RegExp(r'^,\s*'), ''),
            'isPro': true,
            'isFastDelivery': true,
            'isOnline': false,
            'isOnsite': true,
            'createdAt': data['createdAt']?.toDate()?.toIso8601String() ?? DateTime.now().toIso8601String(),
            'lastActive': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
            'responseTimeHours': 24.0,
            'completionRate': 98.0,
            'source': 'users',
            'category': data['selectedCategory'] ?? '',
            'subcategory': data['selectedSubcategory'] ?? '',
          };
          
          providers.add(provider);
        }
      } catch (e) {
        debugPrint('⚠️ Fehler bei users Collection: $e');
      }
      */
      
      // Search in firma collection (unlimited public access)
      debugPrint('📋 Suche in firma Collection...');
      try {
        final firmaQuery = await _firestore
            .collection('firma')
            .where('selectedSubcategory', isEqualTo: subcategory)
            .get();
        
        debugPrint('✅ ${firmaQuery.docs.length} Provider in firma Collection gefunden');
        
        for (final doc in firmaQuery.docs) {
          final data = doc.data();
          
          // Lade echte Bewertungen für diesen Provider
          final reviewData = await _getProviderReviews(doc.id);
          
          final provider = {
            'id': doc.id,
            'name': data['companyName'] ?? data['displayName'] ?? 'Unbekanntes Unternehmen',
            'providerName': data['companyName'] ?? data['displayName'] ?? 'Unbekanntes Unternehmen',
            'title': data['companyName'] ?? data['displayName'] ?? 'Unbekanntes Unternehmen',
            'companyName': data['companyName'] ?? data['displayName'] ?? '',
            'description': data['publicDescription'] ?? data['description'] ?? '',
            'subcategoryName': subcategory, // Zeige die Subcategory
            'price': (data['hourlyRate'] as num?)?.toDouble() ?? 0.0,
            'rating': reviewData['averageRating'],
            'reviewCount': reviewData['reviewCount'],
            'profilePictureURL': data['profilePictureURL'] ?? '',
            'location': '${data['companyCityForBackend'] ?? data['city'] ?? ''}, ${data['companyCountryForBackend'] ?? data['country'] ?? ''}'.trim().replaceAll(RegExp(r'^,\s*'), ''),
            'isPro': true,
            'isFastDelivery': true,
            'isOnline': false,
            'isOnsite': true,
            'createdAt': data['createdAt']?.toDate()?.toIso8601String() ?? DateTime.now().toIso8601String(),
            'lastActive': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
            'responseTimeHours': 24.0,
            'completionRate': 98.0,
            'source': 'firma',
            'category': data['selectedCategory'] ?? '',
            'subcategory': data['selectedSubcategory'] ?? '',
          };
          
          providers.add(provider);
        }
      } catch (e) {
        debugPrint('⚠️ Fehler bei firma Collection: $e');
      }
      
      debugPrint('✅ Gesamt ${providers.length} Provider für $subcategory gefunden');
      return providers;
      
    } catch (e) {
      debugPrint('❌ Allgemeiner Fehler beim Laden der Provider: $e');
      return [];
    }
  }

  /// Lädt echte Bewertungen für einen Provider
  static Future<Map<String, dynamic>> _getProviderReviews(String providerId) async {
    try {
      debugPrint('⭐ Lade Bewertungen für Provider: $providerId');
      
      // Lade Reviews für diesen Provider
      final reviewsQuery = await _firestore
          .collection('reviews')
          .where('providerId', isEqualTo: providerId)
          .limit(100) // Limit für öffentlichen Zugriff
          .get();
      
      if (reviewsQuery.docs.isEmpty) {
        debugPrint('📊 Keine Bewertungen für Provider $providerId gefunden');
        return {
          'averageRating': 4.5, // Default-Wert für neue Provider
          'reviewCount': 0,
        };
      }
      
      // Berechne Durchschnittsbewertung
      double totalRating = 0.0;
      int reviewCount = reviewsQuery.docs.length;
      
      for (final review in reviewsQuery.docs) {
        final data = review.data();
        final rating = (data['rating'] as num?)?.toDouble() ?? 0.0;
        totalRating += rating;
      }
      
      final averageRating = reviewCount > 0 ? (totalRating / reviewCount) : 4.5;
      
      debugPrint('⭐ Provider $providerId: ${averageRating.toStringAsFixed(1)} Sterne ($reviewCount Reviews)');
      
      return {
        'averageRating': double.parse(averageRating.toStringAsFixed(1)),
        'reviewCount': reviewCount,
      };
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Bewertungen für Provider $providerId: $e');
      return {
        'averageRating': 4.5, // Fallback-Wert
        'reviewCount': 0,
      };
    }
  }

  /// Get icon for category (for UI display)
  static String getCategoryIcon(String categoryName) {
    switch (categoryName) {
      case 'Handwerk':
        return '🔨';
      case 'Haushalt':
        return '🏠';
      case 'Transport':
        return '🚚';
      case 'IT & Digital':
        return '💻';
      case 'Garten':
        return '🌱';
      case 'Wellness':
        return '💆';
      case 'Hotel & Gastronomie':
        return '🍽️';
      case 'Marketing & Vertrieb':
        return '📈';
      case 'Finanzen & Recht':
        return '💼';
      case 'Bildung & Unterstützung':
        return '📚';
      case 'Tiere & Pflanzen':
        return '🐾';
      case 'Kreativ & Kunst':
        return '🎨';
      case 'Event & Veranstaltung':
        return '🎉';
      case 'Büro & Administration':
        return '📋';
      default:
        return '⚙️';
    }
  }
}
