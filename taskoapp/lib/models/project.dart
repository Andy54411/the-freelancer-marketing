import 'package:cloud_firestore/cloud_firestore.dart';

// NEU: Hilfsklassen zur Abbildung der verschachtelten Datenstrukturen aus dem Web-Backend

class BudgetRange {
  final double min;
  final double max;
  final String currency;

  BudgetRange({required this.min, required this.max, this.currency = 'EUR'});

  factory BudgetRange.fromMap(Map<String, dynamic>? map) {
    if (map == null) {
      return BudgetRange(min: 0, max: 0);
    }
    return BudgetRange(
      min: (map['min'] ?? 0).toDouble(),
      max: (map['max'] ?? 0).toDouble(),
      currency: map['currency'] ?? 'EUR',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'min': min,
      'max': max,
      'currency': currency,
    };
  }
}

class Location {
  final String type;
  final String? address;
  // In Zukunft könnten hier GeoPoint-Koordinaten stehen
  // final GeoPoint? coordinates;

  Location({required this.type, this.address});

  factory Location.fromMap(Map<String, dynamic>? map) {
    if (map == null) {
      return Location(type: 'tbd', address: null);
    }
    return Location(
      type: map['type'] ?? 'tbd',
      address: map['address'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'address': address,
    };
  }
}


class Project {
  final String id;
  final String title;
  final String description;
  final String status;
  final String? category;
  final String? subcategory; // NEU
  final String? priority;
  final double? estimatedBudget;
  final BudgetRange budgetRange; // NEU
  final String? timeline; // NEU
  final List<String> requiredServices; // NEU
  final Location location; // NEU
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String userId;
  
  // Metadaten & KI-Felder
  final String? theme;
  final Map<String, dynamic>? metadata;
  final bool aiGenerated; // NEU
  final String? originalPrompt; // NEU
  final String? source; // NEU
  final String projectType; // NEU
  final bool isPublic; // NEU

  Project({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    this.category,
    this.subcategory,
    this.priority,
    this.estimatedBudget,
    required this.budgetRange,
    this.timeline,
    required this.requiredServices,
    required this.location,
    required this.createdAt,
    this.updatedAt,
    this.theme,
    required this.userId,
    this.metadata,
    this.aiGenerated = false,
    this.originalPrompt,
    this.source,
    this.projectType = 'service_request',
    this.isPublic = true,
  });

  factory Project.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Project(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      status: data['status'] ?? 'planning',
      category: data['category'],
      subcategory: data['subcategory'],
      priority: data['priority'],
      estimatedBudget: (data['estimatedBudget'] ?? 0.0).toDouble(),
      budgetRange: BudgetRange.fromMap(data['budgetRange']),
      timeline: data['timeline'],
      requiredServices: List<String>.from(data['requiredServices'] ?? []),
      location: Location.fromMap(data['location']),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
      theme: data['theme'],
      userId: data['userId'] ?? data['customerUid'] ?? '',
      metadata: data['metadata'],
      aiGenerated: data['aiGenerated'] ?? false,
      originalPrompt: data['originalPrompt'],
      source: data['source'],
      projectType: data['projectType'] ?? 'service_request',
      isPublic: data['isPublic'] ?? true,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'description': description,
      'status': status,
      'category': category,
      'subcategory': subcategory,
      'priority': priority,
      'estimatedBudget': estimatedBudget,
      'budgetRange': budgetRange.toMap(),
      'timeline': timeline,
      'requiredServices': requiredServices,
      'location': location.toMap(),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      'theme': theme,
      'userId': userId,
      'metadata': metadata,
      'aiGenerated': aiGenerated,
      'originalPrompt': originalPrompt,
      'source': source,
      'projectType': projectType,
      'isPublic': isPublic,
    };
  }

  // copyWith wurde zur besseren Übersichtlichkeit entfernt, kann bei Bedarf wieder hinzugefügt werden.
}

class ProjectGroup {
  final String theme;
  final List<Project> projects;

  ProjectGroup({
    required this.theme,
    required this.projects,
  });
}

class Quote {
  final String id;
  final String title;
  final String description;
  final String status;
  final String? category; // NEU
  final String? subcategory; // NEU
  final double? amount;
  final BudgetRange budgetRange; // NEU
  final Location location; // NEU
  final DateTime createdAt;
  final DateTime? updatedAt; // NEU
  final String userId; // Kunde
  final String providerId; // Anbieter
  final String? projectId;
  final bool isDirectQuest; // NEU

  Quote({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    this.amount,
    required this.budgetRange,
    required this.location,
    required this.createdAt,
    this.updatedAt,
    required this.userId,
    required this.providerId,
    this.projectId,
    this.category,
    this.subcategory,
    this.isDirectQuest = false,
  });

  factory Quote.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Quote(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      status: data['status'] ?? 'pending',
      amount: (data['estimatedBudget'] ?? data['amount'] ?? 0.0).toDouble(),
      budgetRange: BudgetRange.fromMap(data['budgetRange']),
      location: Location.fromMap(data['location']),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
      userId: data['userId'] ?? data['customerUid'] ?? '',
      providerId: data['providerId'] ?? '',
      projectId: data['projectId'],
      category: data['category'],
      subcategory: data['subcategory'],
      isDirectQuest: data['isDirectQuest'] ?? false,
    );
  }
}
