import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

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

  /// Get providers for a subcategory from Firebase Functions
  static Future<List<Map<String, dynamic>>> getProvidersForSubcategory(String subcategory) async {
    try {
      debugPrint('🔍 Suche Provider für Subcategory: $subcategory');
      
      // Configure Firebase Functions with correct region
      final functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
      final HttpsCallable callable = functions.httpsCallable('searchProvidersBySubcategory');
      
      final result = await callable.call({
        'subcategory': subcategory,
      });
      
      if (result.data != null && result.data['success'] == true) {
        final providers = result.data['providers'] as List?;
        debugPrint('✅ ${providers?.length ?? 0} Provider gefunden für $subcategory');
        
        if (providers != null) {
          // Convert to proper Map<String, dynamic> format
          return providers.map((provider) => Map<String, dynamic>.from(provider)).toList();
        }
      }
      
      debugPrint('❌ Keine Provider für Subcategory gefunden: $subcategory');
      return [];
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Provider: $e');
      
      // Fallback: Return demo data for testing when Firebase Functions are not available
      if (e.toString().contains('NOT_FOUND')) {
        debugPrint('🔄 Firebase Functions nicht verfügbar - verwende Demo-Daten für Testing');
        return _getDemoProvidersForSubcategory(subcategory);
      }
      
      return [];
    }
  }

  /// Demo data for testing when Firebase Functions are not available
  static List<Map<String, dynamic>> _getDemoProvidersForSubcategory(String subcategory) {
    // Return demo providers based on subcategory
    switch (subcategory) {
      case 'Mietkoch':
        return [
          {
            'id': 'demo-chef-1',
            'name': 'Marco Schmidt',
            'companyName': 'Gourmet Koch Service',
            'description': 'Professioneller Mietkoch mit 15 Jahren Erfahrung in der gehobenen Gastronomie. Spezialisiert auf mediterrane und moderne deutsche Küche.',
            'price': 85.0,
            'rating': 4.8,
            'reviewCount': 32,
            'profilePictureURL': '',
            'location': 'Berlin, Deutschland',
            'isPro': true,
            'isFastDelivery': true,
            'isOnline': false,
            'isOnsite': true,
            'createdAt': DateTime.now().subtract(const Duration(days: 30)).toIso8601String(),
            'lastActive': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
            'responseTimeHours': 2.0,
            'completionRate': 98.0,
          },
          {
            'id': 'demo-chef-2',
            'name': 'Sarah Weber',
            'companyName': 'Vegane Kochkunst',
            'description': 'Spezialistin für vegane und vegetarische Küche. Kocht leidenschaftlich gesunde und köstliche Mahlzeiten für besondere Anlässe.',
            'price': 75.0,
            'rating': 4.9,
            'reviewCount': 28,
            'profilePictureURL': '',
            'location': 'München, Deutschland',
            'isPro': true,
            'isFastDelivery': false,
            'isOnline': false,
            'isOnsite': true,
            'createdAt': DateTime.now().subtract(const Duration(days: 45)).toIso8601String(),
            'lastActive': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
            'responseTimeHours': 1.5,
            'completionRate': 100.0,
          },
          {
            'id': 'demo-chef-3',
            'name': 'Thomas Müller',
            'companyName': 'Event Catering Pro',
            'description': 'Erfahrener Koch für große Veranstaltungen und private Dinner. Internationale Küche mit Fokus auf asiatische Fusion.',
            'price': 95.0,
            'rating': 4.7,
            'reviewCount': 45,
            'profilePictureURL': '',
            'location': 'Hamburg, Deutschland',
            'isPro': true,
            'isFastDelivery': true,
            'isOnline': false,
            'isOnsite': true,
            'createdAt': DateTime.now().subtract(const Duration(days: 60)).toIso8601String(),
            'lastActive': DateTime.now().subtract(const Duration(minutes: 30)).toIso8601String(),
            'responseTimeHours': 3.0,
            'completionRate': 95.0,
          },
        ];
      
      case 'Elektriker':
        return [
          {
            'id': 'demo-electrician-1',
            'name': 'Klaus Bergmann',
            'companyName': 'Elektro Bergmann GmbH',
            'description': 'Meisterbetrieb für alle Elektroarbeiten. Spezialisiert auf Hausinstallationen, Smart Home und Photovoltaik.',
            'price': 65.0,
            'rating': 4.6,
            'reviewCount': 89,
            'profilePictureURL': '',
            'location': 'Frankfurt, Deutschland',
            'isPro': true,
            'isFastDelivery': true,
            'isOnline': false,
            'isOnsite': true,
            'createdAt': DateTime.now().subtract(const Duration(days: 90)).toIso8601String(),
            'lastActive': DateTime.now().subtract(const Duration(hours: 4)).toIso8601String(),
            'responseTimeHours': 4.0,
            'completionRate': 92.0,
          },
        ];
      
      default:
        return [
          {
            'id': 'demo-provider-1',
            'name': 'Demo Anbieter',
            'companyName': 'Demo Service GmbH',
            'description': 'Professioneller Service-Anbieter für $subcategory mit langjähriger Erfahrung.',
            'price': 50.0,
            'rating': 4.5,
            'reviewCount': 20,
            'profilePictureURL': '',
            'location': 'Deutschland',
            'isPro': false,
            'isFastDelivery': true,
            'isOnline': true,
            'isOnsite': true,
            'createdAt': DateTime.now().subtract(const Duration(days: 30)).toIso8601String(),
            'lastActive': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
            'responseTimeHours': 6.0,
            'completionRate': 90.0,
          },
        ];
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
