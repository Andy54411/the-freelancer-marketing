import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String id;
  final String name;
  final String email;
  final String userType; // 'customer' or 'company'
  final bool isCompanyProfileComplete;
  final bool isUserProfileComplete;
  final String? companyName;
  final String? avatarUrl;
  final DateTime? createdAt;
  
  // Additional B2B/B2C fields
  final String? phoneNumber;
  final String? address;
  final String? city;
  final String? postalCode;
  final String? country;
  final String? description;
  final String? website;
  final List<String>? serviceCategories;
  final List<String>? serviceAreas;
  final double? hourlyRate;
  final String? stripeAccountId;
  final String? stripeCustomerId;
  final bool? isVerified;
  final bool? acceptsBusinessOrders;
  final bool? acceptsPrivateOrders;
  final Map<String, dynamic>? businessProfile;
  final Map<String, dynamic>? preferences;
  final List<String>? certifications;
  final double? rating;
  final int? totalOrders;
  final int? completedOrders;
  final DateTime? lastLoginAt;
  final Map<String, dynamic>? customClaims;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.userType,
    required this.isCompanyProfileComplete,
    required this.isUserProfileComplete,
    this.companyName,
    this.avatarUrl,
    this.createdAt,
    this.phoneNumber,
    this.address,
    this.city,
    this.postalCode,
    this.country,
    this.description,
    this.website,
    this.serviceCategories,
    this.serviceAreas,
    this.hourlyRate,
    this.stripeAccountId,
    this.stripeCustomerId,
    this.isVerified,
    this.acceptsBusinessOrders,
    this.acceptsPrivateOrders,
    this.businessProfile,
    this.preferences,
    this.certifications,
    this.rating,
    this.totalOrders,
    this.completedOrders,
    this.lastLoginAt,
    this.customClaims,
  });

  factory UserModel.fromMap(Map<String, dynamic> map, String id) {
    return UserModel(
      id: id,
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      userType: map['userType'] ?? 'customer',
      isCompanyProfileComplete: map['isCompanyProfileComplete'] ?? false,
      isUserProfileComplete: map['isUserProfileComplete'] ?? false,
      companyName: map['companyName'] ?? map['step2']?['companyName'],
      avatarUrl: map['avatarUrl'],
      createdAt: map['createdAt'] != null 
        ? DateTime.fromMillisecondsSinceEpoch(map['createdAt'].seconds * 1000)
        : null,
      phoneNumber: map['phoneNumber'] ?? map['phone'],
      address: map['address'] ?? map['street'],
      city: map['city'],
      postalCode: map['postalCode'] ?? map['zipCode'],
      country: map['country'],
      description: map['description'] ?? map['bio'],
      website: map['website'],
      serviceCategories: map['serviceCategories'] != null
          ? List<String>.from(map['serviceCategories'])
          : null,
      serviceAreas: map['serviceAreas'] != null
          ? List<String>.from(map['serviceAreas'])
          : null,
      hourlyRate: map['hourlyRate']?.toDouble(),
      stripeAccountId: map['stripeAccountId'],
      stripeCustomerId: map['stripeCustomerId'],
      isVerified: map['isVerified'],
      acceptsBusinessOrders: map['acceptsBusinessOrders'],
      acceptsPrivateOrders: map['acceptsPrivateOrders'],
      businessProfile: map['businessProfile'],
      preferences: map['preferences'],
      certifications: map['certifications'] != null
          ? List<String>.from(map['certifications'])
          : null,
      rating: map['rating']?.toDouble(),
      totalOrders: map['totalOrders'],
      completedOrders: map['completedOrders'],
      lastLoginAt: map['lastLoginAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['lastLoginAt'].seconds * 1000)
          : null,
      customClaims: map['customClaims'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      'userType': userType,
      'isCompanyProfileComplete': isCompanyProfileComplete,
      'isUserProfileComplete': isUserProfileComplete,
      'companyName': companyName,
      'avatarUrl': avatarUrl,
      'phoneNumber': phoneNumber,
      'address': address,
      'city': city,
      'postalCode': postalCode,
      'country': country,
      'description': description,
      'website': website,
      'serviceCategories': serviceCategories,
      'serviceAreas': serviceAreas,
      'hourlyRate': hourlyRate,
      'stripeAccountId': stripeAccountId,
      'stripeCustomerId': stripeCustomerId,
      'isVerified': isVerified,
      'acceptsBusinessOrders': acceptsBusinessOrders,
      'acceptsPrivateOrders': acceptsPrivateOrders,
      'businessProfile': businessProfile,
      'preferences': preferences,
      'certifications': certifications,
      'rating': rating,
      'totalOrders': totalOrders,
      'completedOrders': completedOrders,
      'customClaims': customClaims,
    };
  }

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? userType,
    bool? isCompanyProfileComplete,
    bool? isUserProfileComplete,
    String? companyName,
    String? avatarUrl,
    DateTime? createdAt,
    String? phoneNumber,
    String? address,
    String? city,
    String? postalCode,
    String? country,
    String? description,
    String? website,
    List<String>? serviceCategories,
    List<String>? serviceAreas,
    double? hourlyRate,
    String? stripeAccountId,
    String? stripeCustomerId,
    bool? isVerified,
    bool? acceptsBusinessOrders,
    bool? acceptsPrivateOrders,
    Map<String, dynamic>? businessProfile,
    Map<String, dynamic>? preferences,
    List<String>? certifications,
    double? rating,
    int? totalOrders,
    int? completedOrders,
    DateTime? lastLoginAt,
    Map<String, dynamic>? customClaims,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      userType: userType ?? this.userType,
      isCompanyProfileComplete: isCompanyProfileComplete ?? this.isCompanyProfileComplete,
      isUserProfileComplete: isUserProfileComplete ?? this.isUserProfileComplete,
      companyName: companyName ?? this.companyName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      createdAt: createdAt ?? this.createdAt,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      address: address ?? this.address,
      city: city ?? this.city,
      postalCode: postalCode ?? this.postalCode,
      country: country ?? this.country,
      description: description ?? this.description,
      website: website ?? this.website,
      serviceCategories: serviceCategories ?? this.serviceCategories,
      serviceAreas: serviceAreas ?? this.serviceAreas,
      hourlyRate: hourlyRate ?? this.hourlyRate,
      stripeAccountId: stripeAccountId ?? this.stripeAccountId,
      stripeCustomerId: stripeCustomerId ?? this.stripeCustomerId,
      isVerified: isVerified ?? this.isVerified,
      acceptsBusinessOrders: acceptsBusinessOrders ?? this.acceptsBusinessOrders,
      acceptsPrivateOrders: acceptsPrivateOrders ?? this.acceptsPrivateOrders,
      businessProfile: businessProfile ?? this.businessProfile,
      preferences: preferences ?? this.preferences,
      certifications: certifications ?? this.certifications,
      rating: rating ?? this.rating,
      totalOrders: totalOrders ?? this.totalOrders,
      completedOrders: completedOrders ?? this.completedOrders,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      customClaims: customClaims ?? this.customClaims,
    );
  }

  // Helper properties
  bool get isCompany => userType == 'company';
  bool get isCustomer => userType == 'customer';
  bool get isProvider => isCompany;
  bool get isBusinessAccount => isCompany;
  bool get isPrivateAccount => isCustomer;
  bool get hasVerifiedBusiness => isVerified == true && isCompany;
  
  String get displayName => companyName ?? name;
  
  String get fullAddress {
    final parts = [address, city, postalCode, country]
        .where((part) => part != null && part.isNotEmpty)
        .toList();
    return parts.join(', ');
  }
  
  String get initials {
    if (name.isEmpty) {
      return email.substring(0, 1).toUpperCase();
    }
    
    final words = name.trim().split(' ');
    if (words.length >= 2) {
      return '${words.first[0]}${words.last[0]}'.toUpperCase();
    } else {
      return words.first.substring(0, 1).toUpperCase();
    }
  }
  
  String get ratingDisplay {
    if (rating == null) return 'Keine Bewertung';
    return '${rating!.toStringAsFixed(1)} ⭐';
  }
  
  String get orderCompletionRate {
    if (totalOrders == null || totalOrders == 0) return '0%';
    final rate = ((completedOrders ?? 0) / totalOrders!) * 100;
    return '${rate.toStringAsFixed(0)}%';
  }

  // Business-specific helper methods
  bool canAcceptOrder(String orderType) {
    switch (orderType.toLowerCase()) {
      case 'business':
        return acceptsBusinessOrders == true;
      case 'private':
        return acceptsPrivateOrders == true;
      default:
        return true;
    }
  }
  
  bool hasServiceCategory(String category) {
    return serviceCategories?.contains(category) ?? false;
  }
  
  bool servicesArea(String postalCode) {
    if (serviceAreas == null || serviceAreas!.isEmpty) return true;
    return serviceAreas!.any((area) => postalCode.startsWith(area));
  }

  // Account type mapping for compatibility with web app
  String? get accountType {
    return isCompany ? 'provider' : 'customer';
  }
}
