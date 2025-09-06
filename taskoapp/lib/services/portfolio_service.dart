import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

/// Service für Portfolio-Management
/// Synchronisiert mit der Web-Version
class PortfolioService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Lädt Portfolio-Items für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderPortfolio(String providerId) async {
    try {
      debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Starting load for Provider: $providerId');
      
      // Suche in companies Collection
      final companyDoc = await _firestore.collection('companies').doc(providerId).get();
      debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Company doc exists: ${companyDoc.exists}');
      
      if (companyDoc.exists) {
        final companyData = companyDoc.data()!;
        debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Company data keys: ${companyData.keys.toList()}');
        
        final step3Data = companyData['step3'] as Map<String, dynamic>? ?? {};
        debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Step3 data: $step3Data');
        debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Step3 keys: ${step3Data.keys.toList()}');
        
        final portfolioData = step3Data['portfolio'] as List<dynamic>? ?? [];
        debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Portfolio data: $portfolioData');
        debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Portfolio length: ${portfolioData.length}');
        
        if (portfolioData.isNotEmpty) {
          List<Map<String, dynamic>> portfolio = [];
          
          for (int i = 0; i < portfolioData.length; i++) {
            final item = portfolioData[i] as Map<String, dynamic>;
            debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Processing item $i: $item');
            
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
            
            debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Created portfolio item: $portfolioItem');
            portfolio.add(portfolioItem);
          }
          
          debugPrint('✅ PORTFOLIO SERVICE DEBUG - ${portfolio.length} Portfolio-Items aus companies geladen');
          debugPrint('✅ PORTFOLIO SERVICE DEBUG - Final portfolio: $portfolio');
          return portfolio;
        } else {
          debugPrint('❌ PORTFOLIO SERVICE DEBUG - Portfolio data is empty');
        }
      } else {
        debugPrint('❌ PORTFOLIO SERVICE DEBUG - Company document does not exist');
      }
      
      // Fallback: Portfolio aus separater Collection
      debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Trying fallback: separate portfolio collection');
      final portfolioQuery = await _firestore
          .collection('portfolio')
          .where('providerId', isEqualTo: providerId)
          .orderBy('completedAt', descending: true)
          .limit(20)
          .get();

      debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Fallback query returned ${portfolioQuery.docs.length} documents');
      List<Map<String, dynamic>> portfolio = [];
      
      for (final doc in portfolioQuery.docs) {
        final data = doc.data();
        debugPrint('🎨 PORTFOLIO SERVICE DEBUG - Fallback doc ${doc.id}: $data');
        
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
      
      debugPrint('✅ PORTFOLIO SERVICE DEBUG - ${portfolio.length} Portfolio-Items aus separater Collection geladen');
      debugPrint('✅ PORTFOLIO SERVICE DEBUG - Final fallback portfolio: $portfolio');
      return portfolio;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden des Portfolios: $e');
      return [];
    }
  }

  /// Lädt Skills für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderSkills(String providerId) async {
    try {
      debugPrint('⚡ Lade Skills für Provider: $providerId');
      
      // Suche in companies Collection
      final companyDoc = await _firestore.collection('companies').doc(providerId).get();
      debugPrint('🔍 Company Dokument existiert: ${companyDoc.exists}');
      
      if (companyDoc.exists) {
        final companyData = companyDoc.data()!;
        debugPrint('🔍 Company Data Keys: ${companyData.keys.toList()}');
        
        // Skills sind direkt in der companies Collection unter 'skills'
        final skillsData = companyData['skills'] as List<dynamic>? ?? [];
        debugPrint('🔍 Skills Data Length: ${skillsData.length}');
        debugPrint('🔍 Skills Data: $skillsData');
        
        if (skillsData.isNotEmpty) {
          List<Map<String, dynamic>> skills = [];
          
          for (int i = 0; i < skillsData.length; i++) {
            final skill = skillsData[i];
            
            // Wenn es ein String ist, konvertiere es zu einem Map
            final skillItem = skill is String ? {
              'id': i.toString(),
              'name': skill,
              'skill': skill,
              'level': 'Professional',
              'description': '',
              'experience': '',
              'certifications': <dynamic>[],
              'category': '',
              'years': 0,
              'verified': false,
            } : {
              'id': (skill as Map)['id']?.toString() ?? i.toString(),
              'name': skill['name'] ?? skill['skill'] ?? 'Skill ${i + 1}',
              'level': skill['level'] ?? 'Professional',
              'description': skill['description'] ?? '',
              'experience': skill['experience'] ?? '',
              'certifications': skill['certifications'] as List<dynamic>? ?? <dynamic>[],
              'category': skill['category'] ?? '',
              'years': skill['years'] ?? 0,
              'verified': skill['verified'] ?? false,
              ...skill is Map<String, dynamic> ? skill : <String, dynamic>{},
            };
            
            skills.add(skillItem);
          }
          
          debugPrint('✅ ${skills.length} Skills aus companies geladen');
          return skills;
        } else {
          debugPrint('⚠️ Keine Skills in companies.skills gefunden');
        }
      } else {
        debugPrint('⚠️ Company Dokument nicht gefunden für ID: $providerId');
      }
      
      // Fallback zur alten skills Collection
      final skillsSnapshot = await _firestore
          .collection('skills')
          .where('providerId', isEqualTo: providerId)
          .get();
      
      if (skillsSnapshot.docs.isNotEmpty) {
        List<Map<String, dynamic>> skills = [];
        
        for (final doc in skillsSnapshot.docs) {
          final data = doc.data();
          final skillItem = {
            'id': doc.id,
            'name': data['name'] ?? data['skill'] ?? 'Skill',
            'level': data['level'] ?? 'Beginner',
            'description': data['description'] ?? '',
            'experience': data['experience'] ?? '',
            'certifications': data['certifications'] as List<dynamic>? ?? [],
            'category': data['category'] ?? '',
            'years': data['years'] ?? 0,
            'verified': data['verified'] ?? false,
            ...data,
          };
          skills.add(skillItem);
        }
        
        debugPrint('✅ ${skills.length} Skills aus separater Collection geladen');
        return skills;
      }
      
      debugPrint('⚠️ Keine Skills für Provider $providerId gefunden');
      return [];
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Skills: $e');
      return [];
    }
  }

  /// Lädt Service-Packages für einen Provider
  /// Lädt Service-Packages für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderServicePackages(String providerId) async {
    try {
      debugPrint('📦 Lade Service-Packages für Provider: $providerId');
      
      // Suche in companies Collection
      final companyDoc = await _firestore.collection('companies').doc(providerId).get();
      
      if (companyDoc.exists) {
        final companyData = companyDoc.data()!;
        final step3Data = companyData['step3'] as Map<String, dynamic>? ?? {};
        final packagesData = step3Data['servicePackages'] as List<dynamic>? ?? [];
        
        if (packagesData.isNotEmpty) {
          List<Map<String, dynamic>> packages = [];
          
          for (int i = 0; i < packagesData.length; i++) {
            final package = packagesData[i] as Map<String, dynamic>;
            
            final packageItem = {
              'id': package['id']?.toString() ?? i.toString(),
              'title': package['title'] ?? package['name'] ?? 'Service Package ${i + 1}',
              'description': package['description'] ?? '',
              'price': package['price'] ?? 0.0,
              'currency': package['currency'] ?? 'EUR',
              'duration': package['duration'] ?? '',
              'features': package['features'] as List<dynamic>? ?? [],
              'category': package['category'] ?? '',
              'popular': package['popular'] ?? false,
              'availability': package['availability'] ?? 'available',
              'minPrice': package['minPrice'] ?? package['price'] ?? 0.0,
              'maxPrice': package['maxPrice'] ?? package['price'] ?? 0.0,
              ...package,
            };
            
            packages.add(packageItem);
          }
          
          debugPrint('✅ ${packages.length} Service-Packages aus companies geladen');
          return packages;
        }
      }
      
      debugPrint('⚠️ Keine Service-Packages für Provider $providerId gefunden');
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
      
      // Suche in companies Collection
      final companyDoc = await _firestore.collection('companies').doc(providerId).get();
      
      if (companyDoc.exists) {
        final companyData = companyDoc.data()!;
        
        // Prüfe zuerst Top-Level faqs
        final topLevelFaqs = companyData['faqs'] as List<dynamic>? ?? [];
        
        // Fallback: step3.faqs
        final step3Data = companyData['step3'] as Map<String, dynamic>? ?? {};
        final step3Faqs = step3Data['faqs'] as List<dynamic>? ?? [];
        
        // Verwende die verfügbaren FAQs (Priorität: Top-Level)
        final faqsData = topLevelFaqs.isNotEmpty ? topLevelFaqs : step3Faqs;
        
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
        
        debugPrint('✅ ${faqs.length} FAQs aus companies geladen');
        return faqs;
      }
      
      // Fallback: firma Collection
      final firmaDoc = await _firestore.collection('firma').doc(providerId).get();
      
      if (firmaDoc.exists) {
        final firmaData = firmaDoc.data()!;
        final step3Data = firmaData['step3'] as Map<String, dynamic>? ?? {};
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
        
        debugPrint('✅ ${faqs.length} FAQs aus firma geladen');
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
      
      // Zuerst in companies Collection suchen
      final companyDoc = await _firestore.collection('companies').doc(providerId).get();
      
      if (companyDoc.exists) {
        final companyData = companyDoc.data()!;
        final step3Data = companyData['step3'] as Map<String, dynamic>? ?? {};
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
        
        debugPrint('✅ ${languages.length} Sprachen aus companies geladen');
        return languages;
      }
      
      // Fallback: firma Collection
      final firmaDoc = await _firestore.collection('firma').doc(providerId).get();
      
      if (firmaDoc.exists) {
        final firmaData = firmaDoc.data()!;
        final step3Data = firmaData['step3'] as Map<String, dynamic>? ?? {};
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
        
        debugPrint('✅ ${languages.length} Sprachen aus firma geladen');
        return languages;
      }
      
      return [];
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Sprachen: $e');
      return [];
    }
  }
}
