import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class TaskiloUser {
  final String uid;
  final String email;
  final String? displayName;
  final String? photoURL;
  final String? phone;
  final UserType userType;
  final bool isVerified;
  final DateTime createdAt;
  final DateTime? lastLoginAt;
  final UserProfile? profile;

  const TaskiloUser({
    required this.uid,
    required this.email,
    this.displayName,
    this.photoURL,
    this.phone,
    required this.userType,
    required this.isVerified,
    required this.createdAt,
    this.lastLoginAt,
    this.profile,
  });

  factory TaskiloUser.fromFirebaseUser(User firebaseUser, {UserProfile? profile}) {
    return TaskiloUser(
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      phone: firebaseUser.phoneNumber,
      userType: UserType.customer, // Default, wird später aus Firestore geladen
      isVerified: firebaseUser.emailVerified,
      createdAt: firebaseUser.metadata.creationTime ?? DateTime.now(),
      lastLoginAt: firebaseUser.metadata.lastSignInTime,
      profile: profile,
    );
  }

  factory TaskiloUser.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    
    // Konvertiere Datenbank-Werte zu UserType Enum
    UserType userTypeValue;
    final dbUserType = data['user_type'] ?? data['userType']; // Unterstütze beide Felder für Migration
    switch (dbUserType) {
      case 'kunde':
      case 'customer': // Fallback für alte Daten
        userTypeValue = UserType.customer;
        break;
      case 'firma':
      case 'serviceProvider': // Fallback für alte Daten
        userTypeValue = UserType.serviceProvider;
        break;
      case 'admin':
        userTypeValue = UserType.admin;
        break;
      default:
        userTypeValue = UserType.customer; // Default fallback
    }
    
    return TaskiloUser(
      uid: doc.id,
      email: data['email'] ?? '',
      displayName: data['displayName'],
      photoURL: data['photoURL'],
      phone: data['phone'],
      userType: userTypeValue,
      isVerified: data['isVerified'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      lastLoginAt: (data['lastLoginAt'] as Timestamp?)?.toDate(),
      profile: data['profile'] != null 
          ? UserProfile.fromMap(data['profile'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    // Konvertiere UserType zu konsistenten Datenbank-Werten
    String userTypeValue;
    switch (userType) {
      case UserType.customer:
        userTypeValue = 'kunde';
        break;
      case UserType.serviceProvider:
        userTypeValue = 'firma';
        break;
      case UserType.admin:
        userTypeValue = 'admin';
        break;
    }
    
    return {
      'email': email,
      'displayName': displayName,
      'photoURL': photoURL,
      'phone': phone,
      'user_type': userTypeValue,  // Verwende user_type statt userType
      'isVerified': isVerified,
      'createdAt': Timestamp.fromDate(createdAt),
      'lastLoginAt': lastLoginAt != null ? Timestamp.fromDate(lastLoginAt!) : null,
      'profile': profile?.toMap(),
    };
  }

  TaskiloUser copyWith({
    String? uid,
    String? email,
    String? displayName,
    String? photoURL,
    String? phone,
    UserType? userType,
    bool? isVerified,
    DateTime? createdAt,
    DateTime? lastLoginAt,
    UserProfile? profile,
  }) {
    return TaskiloUser(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      photoURL: photoURL ?? this.photoURL,
      phone: phone ?? this.phone,
      userType: userType ?? this.userType,
      isVerified: isVerified ?? this.isVerified,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      profile: profile ?? this.profile,
    );
  }
}

enum UserType {
  customer,    // entspricht 'kunde' in der Web-Version
  serviceProvider,  // entspricht 'anbieter' in der Web-Version
  admin
}

class UserProfile {
  final String? firstName;
  final String? lastName;
  final String? address;
  final String? street;
  final String? city;
  final String? postalCode;
  final String? country;
  final String? phoneNumber;
  final String? bio;
  final List<String>? skills;
  final double? rating;
  final int? completedJobs;
  final bool? isAvailable;
  final bool? agreesToNewsletter;
  final DateTime? dateOfBirth;

  const UserProfile({
    this.firstName,
    this.lastName,
    this.address,
    this.street,
    this.city,
    this.postalCode,
    this.country,
    this.phoneNumber,
    this.bio,
    this.skills,
    this.rating,
    this.completedJobs,
    this.isAvailable,
    this.agreesToNewsletter,
    this.dateOfBirth,
  });

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      firstName: map['firstName'],
      lastName: map['lastName'],
      address: map['address'],
      street: map['street'],
      city: map['city'],
      postalCode: map['postalCode'],
      country: map['country'],
      phoneNumber: map['phoneNumber'],
      bio: map['bio'],
      skills: map['skills'] != null ? List<String>.from(map['skills']) : null,
      rating: map['rating']?.toDouble(),
      completedJobs: map['completedJobs'],
      isAvailable: map['isAvailable'],
      agreesToNewsletter: map['agreesToNewsletter'],
      dateOfBirth: map['dateOfBirth'] != null 
          ? (map['dateOfBirth'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'firstName': firstName,
      'lastName': lastName,
      'address': address,
      'street': street,
      'city': city,
      'postalCode': postalCode,
      'country': country,
      'phoneNumber': phoneNumber,
      'bio': bio,
      'skills': skills,
      'rating': rating,
      'completedJobs': completedJobs,
      'isAvailable': isAvailable,
      'agreesToNewsletter': agreesToNewsletter,
      'dateOfBirth': dateOfBirth != null 
          ? Timestamp.fromDate(dateOfBirth!)
          : null,
    };
  }

  String get fullName => '${firstName ?? ''} ${lastName ?? ''}'.trim();
}
