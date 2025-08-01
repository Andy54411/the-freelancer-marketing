import 'package:flutter/foundation.dart';
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

  /// Get providers for a subcategory
  static Future<List<Map<String, dynamic>>> getProvidersForSubcategory(String subcategory) async {
    try {
      final data = await getSubcategoryData(subcategory);
      if (data != null && data['providers'] is List) {
        return List<Map<String, dynamic>>.from(data['providers']);
      }
      return [];
    } catch (e) {
      debugPrint('❌ Failed to get providers for subcategory: $e');
      return [];
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
