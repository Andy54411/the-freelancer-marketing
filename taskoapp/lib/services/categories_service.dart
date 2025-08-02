import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

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

  /// Get providers for a subcategory from Firestore directly
  static Future<List<Map<String, dynamic>>> getProvidersForSubcategory(String subcategory) async {
    try {
      debugPrint('🔍 Suche Provider für Subcategory: $subcategory');
      
      // Check if user is authenticated
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) {
        debugPrint('❌ User nicht authentifiziert - kann nicht auf Firestore zugreifen');
        return [];
      }
      
      debugPrint('✅ User authentifiziert: ${currentUser.uid}');
      
      List<Map<String, dynamic>> providers = [];
      
      // Search in users collection with limit for security rules
      debugPrint('📋 Suche in users Collection...');
      final usersQuery = await _firestore
          .collection('users')
          .where('selectedSubcategory', isEqualTo: subcategory)
          .limit(50) // Add limit to satisfy security rules
          .get();
      
      debugPrint('✅ ${usersQuery.docs.length} Provider in users Collection gefunden');
      
      for (final doc in usersQuery.docs) {
        final data = doc.data();
        final provider = {
          'id': doc.id,
          'name': '${data['firstName'] ?? ''} ${data['lastName'] ?? ''}'.trim(),
          'companyName': data['companyName'] ?? '',
          'description': data['publicDescription'] ?? '',
          'price': (data['hourlyRate'] as num?)?.toDouble() ?? 0.0,
          'rating': 4.5, // Default rating - can be calculated from reviews later
          'reviewCount': 10, // Default review count
          'profilePictureURL': data['profilePictureURL'] ?? '',
          'location': '${data['personalCity'] ?? ''}, ${data['personalCountry'] ?? ''}'.trim().replaceAll(RegExp(r'^,\s*'), ''),
          'isPro': true,
          'isFastDelivery': (data['responseTimeGuarantee'] as num?)?.toInt() ?? 24 <= 24,
          'isOnline': false,
          'isOnsite': true,
          'createdAt': data['createdAt']?.toDate()?.toIso8601String() ?? DateTime.now().toIso8601String(),
          'lastActive': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
          'responseTimeHours': (data['responseTimeGuarantee'] as num?)?.toDouble() ?? 24.0,
          'completionRate': 95.0,
          'source': 'users',
          'category': data['selectedCategory'] ?? '',
          'subcategory': data['selectedSubcategory'] ?? '',
        };
        
        providers.add(provider);
      }
      
      // Search in companies collection with limit for security rules
      debugPrint('📋 Suche in companies Collection...');
      final companiesQuery = await _firestore
          .collection('companies')
          .where('selectedSubcategory', isEqualTo: subcategory)
          .limit(50) // Add limit to satisfy security rules
          .get();
      
      debugPrint('✅ ${companiesQuery.docs.length} Provider in companies Collection gefunden');
      
      for (final doc in companiesQuery.docs) {
        final data = doc.data();
        final provider = {
          'id': doc.id,
          'name': data['companyName'] ?? 'Unbekanntes Unternehmen',
          'companyName': data['companyName'] ?? '',
          'description': data['publicDescription'] ?? '',
          'price': (data['hourlyRate'] as num?)?.toDouble() ?? 0.0,
          'rating': 4.5,
          'reviewCount': 15,
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
          'source': 'companies',
          'category': data['selectedCategory'] ?? '',
          'subcategory': data['selectedSubcategory'] ?? '',
        };
        
        providers.add(provider);
      }
      
      debugPrint('✅ Gesamt ${providers.length} Provider für $subcategory gefunden');
      return providers;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Provider: $e');
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
