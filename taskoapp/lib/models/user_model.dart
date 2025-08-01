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
    return TaskiloUser(
      uid: doc.id,
      email: data['email'] ?? '',
      displayName: data['displayName'],
      photoURL: data['photoURL'],
      phone: data['phone'],
      userType: UserType.values.firstWhere(
        (type) => type.name == data['userType'],
        orElse: () => UserType.customer,
      ),
      isVerified: data['isVerified'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      lastLoginAt: (data['lastLoginAt'] as Timestamp?)?.toDate(),
      profile: data['profile'] != null 
          ? UserProfile.fromMap(data['profile'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'email': email,
      'displayName': displayName,
      'photoURL': photoURL,
      'phone': phone,
      'userType': userType.name,
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
  customer,
  serviceProvider,
  admin
}

class UserProfile {
  final String? firstName;
  final String? lastName;
  final String? address;
  final String? city;
  final String? postalCode;
  final String? country;
  final String? bio;
  final List<String>? skills;
  final double? rating;
  final int? completedJobs;
  final bool? isAvailable;

  const UserProfile({
    this.firstName,
    this.lastName,
    this.address,
    this.city,
    this.postalCode,
    this.country,
    this.bio,
    this.skills,
    this.rating,
    this.completedJobs,
    this.isAvailable,
  });

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      firstName: map['firstName'],
      lastName: map['lastName'],
      address: map['address'],
      city: map['city'],
      postalCode: map['postalCode'],
      country: map['country'],
      bio: map['bio'],
      skills: map['skills'] != null ? List<String>.from(map['skills']) : null,
      rating: map['rating']?.toDouble(),
      completedJobs: map['completedJobs'],
      isAvailable: map['isAvailable'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'firstName': firstName,
      'lastName': lastName,
      'address': address,
      'city': city,
      'postalCode': postalCode,
      'country': country,
      'bio': bio,
      'skills': skills,
      'rating': rating,
      'completedJobs': completedJobs,
      'isAvailable': isAvailable,
    };
  }

  String get fullName => '${firstName ?? ''} ${lastName ?? ''}'.trim();
}
