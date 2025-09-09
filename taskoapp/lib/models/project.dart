import 'package:cloud_firestore/cloud_firestore.dart';

class Project {
  final String id;
  final String title;
  final String description;
  final String status; // 'planning', 'active', 'completed', 'paused'
  final String? category;
  final String? priority; // 'niedrig', 'mittel', 'hoch'
  final double? estimatedBudget;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? theme; // For grouping
  final String userId;
  final Map<String, dynamic>? metadata;

  Project({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    this.category,
    this.priority,
    this.estimatedBudget,
    required this.createdAt,
    this.updatedAt,
    this.theme,
    required this.userId,
    this.metadata,
  });

  factory Project.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Project(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      status: data['status'] ?? 'planning',
      category: data['category'],
      priority: data['priority'],
      estimatedBudget: data['estimatedBudget']?.toDouble(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
      theme: data['theme'],
      userId: data['userId'] ?? '',
      metadata: data['metadata'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'description': description,
      'status': status,
      'category': category,
      'priority': priority,
      'estimatedBudget': estimatedBudget,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      'theme': theme,
      'userId': userId,
      'metadata': metadata,
    };
  }

  Project copyWith({
    String? id,
    String? title,
    String? description,
    String? status,
    String? category,
    String? priority,
    double? estimatedBudget,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? theme,
    String? userId,
    Map<String, dynamic>? metadata,
  }) {
    return Project(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      category: category ?? this.category,
      priority: priority ?? this.priority,
      estimatedBudget: estimatedBudget ?? this.estimatedBudget,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      theme: theme ?? this.theme,
      userId: userId ?? this.userId,
      metadata: metadata ?? this.metadata,
    );
  }
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
  final double? amount;
  final DateTime createdAt;
  final String userId;
  final String? projectId;

  Quote({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    this.amount,
    required this.createdAt,
    required this.userId,
    this.projectId,
  });

  factory Quote.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Quote(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      status: data['status'] ?? 'pending',
      amount: data['amount']?.toDouble(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      userId: data['userId'] ?? '',
      projectId: data['projectId'],
    );
  }
}
