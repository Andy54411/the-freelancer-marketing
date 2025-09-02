import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

/// Service für Portfolio-Management
/// Synchronisiert mit der Web-Version
class PortfolioService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Lädt Portfolio-Items für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderPortfolio(String providerId) async {
    try {
      debugPrint('🎨 Lade Portfolio für Provider: $providerId');
      
      // Zuerst prüfen, ob Portfolio in step3 verfügbar ist
      final userDoc = await _firestore.collection('users').doc(providerId).get();
      
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final step3Data = userData['step3'] as Map<String, dynamic>? ?? {};
        final portfolioData = step3Data['portfolio'] as List<dynamic>? ?? [];
        
        if (portfolioData.isNotEmpty) {
          List<Map<String, dynamic>> portfolio = [];
          
          for (int i = 0; i < portfolioData.length; i++) {
            final item = portfolioData[i] as Map<String, dynamic>;
            
            final portfolioItem = {
              'id': item['id']?.toString() ?? i.toString(),
              'title': item['title'] ?? 'Portfolio Item ${i + 1}',
              'description': item['description'] ?? '',
              'imageUrl': item['imageUrl'] ?? item['images']?.first ?? '',
              'images': item['images'] as List<dynamic>? ?? [item['imageUrl'] ?? ''],
              'category': item['category'] ?? '',
              'completedAt': item['completedAt'] ?? '',
              'tags': item['tags'] as List<dynamic>? ?? [],
              'clientName': item['clientName'] ?? '',
              'projectDuration': item['projectDuration'] ?? '',
              'featured': item['featured'] ?? false,
              ...item,
            };
            
            portfolio.add(portfolioItem);
          }
          
          debugPrint('✅ ${portfolio.length} Portfolio-Items aus step3 geladen');
          return portfolio;
        }
      }
      
      // Fallback: Portfolio aus separater Collection
      final portfolioQuery = await _firestore
          .collection('portfolio')
          .where('providerId', isEqualTo: providerId)
          .orderBy('completedAt', descending: true)
          .limit(20)
          .get();

      List<Map<String, dynamic>> portfolio = [];
      
      for (final doc in portfolioQuery.docs) {
        final data = doc.data();
        
        final portfolioItem = {
          'id': doc.id,
          'title': data['title'] ?? 'Projekt',
          'description': data['description'] ?? '',
          'imageUrl': data['imageUrl'] ?? data['images']?.first ?? '',
          'images': data['images'] as List<dynamic>? ?? [],
          'category': data['category'] ?? '',
          'completedAt': data['completedAt'] ?? '',
          'tags': data['tags'] as List<dynamic>? ?? [],
          'clientName': data['clientName'] ?? '',
          'projectDuration': data['projectDuration'] ?? '',
          'featured': data['featured'] ?? false,
          ...data,
        };
        
        portfolio.add(portfolioItem);
      }
      
      debugPrint('✅ ${portfolio.length} Portfolio-Items aus separater Collection geladen');
      return portfolio;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden des Portfolios: $e');
      return [];
    }
  }

  /// Lädt Skills für einen Provider
  static Future<List<String>> getProviderSkills(String providerId) async {
    try {
      debugPrint('🔧 Lade Skills für Provider: $providerId');
      
      final userDoc = await _firestore.collection('users').doc(providerId).get();
      
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        
        // Skills aus step3
        final step3Data = userData['step3'] as Map<String, dynamic>? ?? {};
        final step3Skills = step3Data['skills'] as List<dynamic>? ?? [];
        
        // Skills aus Root-Level
        final rootSkills = userData['skills'] as List<dynamic>? ?? [];
        
        // Specialties
        final specialties = step3Data['specialties'] as List<dynamic>? ?? [];
        
        // Alle Skills kombinieren und deduplizieren
        Set<String> allSkills = {};
        
        for (final skill in step3Skills) {
          if (skill != null && skill.toString().trim().isNotEmpty) {
            allSkills.add(skill.toString().trim());
          }
        }
        
        for (final skill in rootSkills) {
          if (skill != null && skill.toString().trim().isNotEmpty) {
            allSkills.add(skill.toString().trim());
          }
        }
        
        for (final specialty in specialties) {
          if (specialty != null && specialty.toString().trim().isNotEmpty) {
            allSkills.add(specialty.toString().trim());
          }
        }
        
        final skillsList = allSkills.toList()..sort();
        debugPrint('✅ ${skillsList.length} Skills geladen');
        return skillsList;
      }
      
      return [];
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Skills: $e');
      return [];
    }
  }

  /// Lädt Service-Packages für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderServicePackages(String providerId) async {
    try {
      debugPrint('📦 Lade Service-Packages für Provider: $providerId');
      
      final userDoc = await _firestore.collection('users').doc(providerId).get();
      
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final step3Data = userData['step3'] as Map<String, dynamic>? ?? {};
        final packagesData = step3Data['servicePackages'] as List<dynamic>? ?? [];
        
        List<Map<String, dynamic>> packages = [];
        
        for (int i = 0; i < packagesData.length; i++) {
          final package = packagesData[i] as Map<String, dynamic>;
          
          final servicePackage = {
            'id': package['id']?.toString() ?? i.toString(),
            'title': package['title'] ?? 'Service Package ${i + 1}',
            'description': package['description'] ?? '',
            'price': (package['price'] as num?)?.toDouble() ?? 0.0,
            'duration': package['duration'] ?? '',
            'features': package['features'] as List<dynamic>? ?? [],
            'popular': package['popular'] ?? false,
            'deliveryTime': package['deliveryTime'] ?? package['duration'] ?? '',
            'revisions': package['revisions'] ?? 'Unbegrenzt',
            ...package,
          };
          
          packages.add(servicePackage);
        }
        
        debugPrint('✅ ${packages.length} Service-Packages geladen');
        return packages;
      }
      
      return [];
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Service-Packages: $e');
      return [];
    }
  }

  /// Lädt FAQs für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderFAQs(String providerId) async {
    try {
      debugPrint('❓ Lade FAQs für Provider: $providerId');
      
      final userDoc = await _firestore.collection('users').doc(providerId).get();
      
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final step3Data = userData['step3'] as Map<String, dynamic>? ?? {};
        final faqsData = step3Data['faqs'] as List<dynamic>? ?? [];
        
        List<Map<String, dynamic>> faqs = [];
        
        for (int i = 0; i < faqsData.length; i++) {
          final faq = faqsData[i] as Map<String, dynamic>;
          
          final faqItem = {
            'id': faq['id']?.toString() ?? i.toString(),
            'question': faq['question'] ?? 'Frage ${i + 1}',
            'answer': faq['answer'] ?? '',
            'category': faq['category'] ?? 'Allgemein',
            'order': faq['order'] ?? i,
            ...faq,
          };
          
          faqs.add(faqItem);
        }
        
        // Nach order sortieren
        faqs.sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));
        
        debugPrint('✅ ${faqs.length} FAQs geladen');
        return faqs;
      }
      
      return [];
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der FAQs: $e');
      return [];
    }
  }

  /// Lädt Sprachen für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderLanguages(String providerId) async {
    try {
      debugPrint('🌍 Lade Sprachen für Provider: $providerId');
      
      final userDoc = await _firestore.collection('users').doc(providerId).get();
      
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final step3Data = userData['step3'] as Map<String, dynamic>? ?? {};
        final languagesData = step3Data['languages'] as List<dynamic>? ?? [];
        
        List<Map<String, dynamic>> languages = [];
        
        for (final lang in languagesData) {
          if (lang is Map<String, dynamic>) {
            final language = {
              'language': lang['language'] ?? '',
              'proficiency': lang['proficiency'] ?? 'Fließend',
              'native': lang['native'] ?? false,
              ...lang,
            };
            languages.add(language);
          }
        }
        
        debugPrint('✅ ${languages.length} Sprachen geladen');
        return languages;
      }
      
      return [];
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Sprachen: $e');
      return [];
    }
  }
}
