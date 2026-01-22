/// Task Model
class Task {
  final String id;
  final String userId;
  final String? listId;
  final String title;
  final String? notes;
  final DateTime? dueDate;
  final bool completed;
  final DateTime? completedAt;
  final int position;
  final int? priorityLevel;
  final DateTime createdAt;
  final DateTime updatedAt;

  Task({
    required this.id,
    required this.userId,
    this.listId,
    required this.title,
    this.notes,
    this.dueDate,
    this.completed = false,
    this.completedAt,
    this.position = 0,
    this.priorityLevel,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Alias für completed für Kompatibilität
  bool get isCompleted => completed;
  
  /// Alias für priorityLevel für Kompatibilität
  int? get priority => priorityLevel;

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as String,
      userId: json['userId'] as String,
      listId: json['listId'] as String?,
      title: json['title'] as String,
      notes: json['notes'] as String?,
      dueDate: json['dueDate'] != null
          ? DateTime.fromMillisecondsSinceEpoch(json['dueDate'] as int)
          : null,
      completed: json['completed'] as bool? ?? false,
      completedAt: json['completedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(json['completedAt'] as int)
          : null,
      position: json['position'] as int? ?? 0,
      priorityLevel: json['priority'] as int?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(json['updatedAt'] as int),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'listId': listId,
      'title': title,
      'notes': notes,
      'dueDate': dueDate?.millisecondsSinceEpoch,
      'completed': completed,
      'completedAt': completedAt?.millisecondsSinceEpoch,
      'position': position,
      'priority': priorityLevel,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'updatedAt': updatedAt.millisecondsSinceEpoch,
    };
  }

  Task copyWith({
    String? id,
    String? userId,
    String? listId,
    String? title,
    String? notes,
    DateTime? dueDate,
    bool? completed,
    bool? isCompleted,
    DateTime? completedAt,
    int? position,
    int? priorityLevel,
    int? priority,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Task(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      listId: listId ?? this.listId,
      title: title ?? this.title,
      notes: notes ?? this.notes,
      dueDate: dueDate ?? this.dueDate,
      completed: isCompleted ?? completed ?? this.completed,
      completedAt: completedAt ?? this.completedAt,
      position: position ?? this.position,
      priorityLevel: priority ?? priorityLevel ?? this.priorityLevel,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get isOverdue {
    if (dueDate == null || completed) return false;
    return dueDate!.isBefore(DateTime.now());
  }

  bool get isDueToday {
    if (dueDate == null) return false;
    final now = DateTime.now();
    return dueDate!.year == now.year &&
        dueDate!.month == now.month &&
        dueDate!.day == now.day;
  }
}

/// Task List Model
class TaskList {
  final String id;
  final String userId;
  final String name;
  final String? color;
  final int taskCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  TaskList({
    required this.id,
    required this.userId,
    required this.name,
    this.color,
    this.taskCount = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskList.fromJson(Map<String, dynamic> json) {
    return TaskList(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      color: json['color'] as String?,
      taskCount: json['taskCount'] as int? ?? 0,
      createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(json['updatedAt'] as int),
    );
  }
}
