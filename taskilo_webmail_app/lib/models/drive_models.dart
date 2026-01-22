/// Drive File Model
class DriveFile {
  final String id;
  final String userId;
  final String? folderId;
  final String name;
  final String mimeType;
  final int size;
  final String storagePath;
  final bool isDeleted;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? thumbnailUrl;

  DriveFile({
    required this.id,
    required this.userId,
    this.folderId,
    required this.name,
    required this.mimeType,
    required this.size,
    required this.storagePath,
    this.isDeleted = false,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
    this.thumbnailUrl,
  });

  factory DriveFile.fromJson(Map<String, dynamic> json) {
    return DriveFile(
      id: json['id'] as String,
      userId: json['userId'] as String,
      folderId: json['folderId'] as String?,
      name: json['name'] as String,
      mimeType: json['mimeType'] as String,
      size: json['size'] as int,
      storagePath: json['storagePath'] as String,
      isDeleted: json['isDeleted'] as bool? ?? false,
      deletedAt: json['deletedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(json['deletedAt'] as int)
          : null,
      createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(json['updatedAt'] as int),
      thumbnailUrl: json['thumbnailUrl'] as String?,
    );
  }

  bool get isImage => mimeType.startsWith('image/');
  bool get isVideo => mimeType.startsWith('video/');
  bool get isPdf => mimeType == 'application/pdf';
  bool get isDocument => mimeType.contains('document') || 
                          mimeType.contains('word') ||
                          mimeType.contains('text');

  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    if (size < 1024 * 1024 * 1024) {
      return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  String get extension {
    final parts = name.split('.');
    return parts.length > 1 ? parts.last.toLowerCase() : '';
  }
}

/// Drive Folder Model
class DriveFolder {
  final String id;
  final String userId;
  final String? parentId;
  final String name;
  final bool isDeleted;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  DriveFolder({
    required this.id,
    required this.userId,
    this.parentId,
    required this.name,
    this.isDeleted = false,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DriveFolder.fromJson(Map<String, dynamic> json) {
    return DriveFolder(
      id: json['id'] as String,
      userId: json['userId'] as String,
      parentId: json['parentId'] as String?,
      name: json['name'] as String,
      isDeleted: json['isDeleted'] as bool? ?? false,
      deletedAt: json['deletedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(json['deletedAt'] as int)
          : null,
      createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(json['updatedAt'] as int),
    );
  }
}

/// Storage Info Model
class StorageInfo {
  final int usedBytes;
  final int maxBytes;
  final int fileCount;
  final int folderCount;

  StorageInfo({
    required this.usedBytes,
    required this.maxBytes,
    required this.fileCount,
    required this.folderCount,
  });

  factory StorageInfo.fromJson(Map<String, dynamic> json) {
    return StorageInfo(
      usedBytes: json['usedBytes'] as int,
      maxBytes: json['maxBytes'] as int,
      fileCount: json['fileCount'] as int,
      folderCount: json['folderCount'] as int,
    );
  }

  double get usagePercent => (usedBytes / maxBytes) * 100;
  
  /// Alias für usedBytes für Kompatibilität (in Bytes)
  int get used => usedBytes;
  
  /// Alias für maxBytes für Kompatibilität (in Bytes)
  int get total => maxBytes;

  String get formattedUsed {
    if (usedBytes < 1024 * 1024) {
      return '${(usedBytes / 1024).toStringAsFixed(1)} KB';
    }
    if (usedBytes < 1024 * 1024 * 1024) {
      return '${(usedBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(usedBytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  String get formattedMax {
    return '${(maxBytes / (1024 * 1024 * 1024)).toStringAsFixed(0)} GB';
  }
}

/// Breadcrumb für Navigation
class Breadcrumb {
  final String? id;
  final String name;

  Breadcrumb({this.id, required this.name});

  factory Breadcrumb.fromJson(Map<String, dynamic> json) {
    return Breadcrumb(
      id: json['id'] as String?,
      name: json['name'] as String,
    );
  }
}
