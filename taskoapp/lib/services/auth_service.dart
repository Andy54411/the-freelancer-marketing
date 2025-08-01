import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Stream für aktuellen User
  Stream<TaskiloUser?> get userStream {
    return _auth.authStateChanges().asyncMap((firebaseUser) async {
      if (firebaseUser == null) return null;
      
      // Lade User-Daten aus Firestore
      final userDoc = await _firestore.collection('users').doc(firebaseUser.uid).get();
      
      if (userDoc.exists) {
        return TaskiloUser.fromFirestore(userDoc);
      } else {
        // Erstelle neuen User in Firestore wenn noch nicht vorhanden
        final newUser = TaskiloUser.fromFirebaseUser(firebaseUser);
        await _firestore.collection('users').doc(firebaseUser.uid).set(newUser.toFirestore());
        return newUser;
      }
    });
  }

  // Aktueller User
  TaskiloUser? get currentUser {
    final firebaseUser = _auth.currentUser;
    if (firebaseUser == null) return null;
    return TaskiloUser.fromFirebaseUser(firebaseUser);
  }

  // Email & Password Login
  Future<TaskiloUser?> signInWithEmailAndPassword(String email, String password) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      
      if (credential.user != null) {
        await _updateLastLoginTime(credential.user!.uid);
        return await _getUserFromFirestore(credential.user!.uid);
      }
      return null;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Email & Password Registrierung
  Future<TaskiloUser?> createUserWithEmailAndPassword(
    String email, 
    String password, 
    {String? displayName, UserType userType = UserType.customer}
  ) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      
      if (credential.user != null) {
        // Aktualisiere Display Name wenn angegeben
        if (displayName != null) {
          await credential.user!.updateDisplayName(displayName);
        }
        
        // Erstelle User-Dokument in Firestore
        final user = TaskiloUser.fromFirebaseUser(credential.user!, 
          profile: const UserProfile()
        ).copyWith(userType: userType);
        
        await _firestore.collection('users').doc(credential.user!.uid).set(user.toFirestore());
        
        // Sende Email-Verifikation
        await credential.user!.sendEmailVerification();
        
        return user;
      }
      return null;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Password Reset
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Email Verifikation erneut senden
  Future<void> sendEmailVerification() async {
    final user = _auth.currentUser;
    if (user != null && !user.emailVerified) {
      await user.sendEmailVerification();
    }
  }

  // User Profile Update
  Future<void> updateUserProfile({
    String? displayName,
    String? photoURL,
    UserProfile? profile,
  }) async {
    final user = _auth.currentUser;
    if (user == null) return;

    // Firebase Auth Profile Update
    if (displayName != null || photoURL != null) {
      await user.updateProfile(
        displayName: displayName,
        photoURL: photoURL,
      );
    }

    // Firestore User Document Update
    final updates = <String, dynamic>{};
    if (displayName != null) updates['displayName'] = displayName;
    if (photoURL != null) updates['photoURL'] = photoURL;
    if (profile != null) updates['profile'] = profile.toMap();

    if (updates.isNotEmpty) {
      await _firestore.collection('users').doc(user.uid).update(updates);
    }
  }

  // Sign Out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Delete Account
  Future<void> deleteAccount() async {
    final user = _auth.currentUser;
    if (user == null) return;

    // Lösche User-Dokument aus Firestore
    await _firestore.collection('users').doc(user.uid).delete();
    
    // Lösche Firebase Auth User
    await user.delete();
  }

  // Private Helper Methods
  Future<TaskiloUser?> _getUserFromFirestore(String uid) async {
    final userDoc = await _firestore.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return TaskiloUser.fromFirestore(userDoc);
    }
    return null;
  }

  Future<void> _updateLastLoginTime(String uid) async {
    await _firestore.collection('users').doc(uid).update({
      'lastLoginAt': Timestamp.now(),
    });
  }

  String _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return 'Kein Benutzer mit dieser E-Mail gefunden.';
      case 'wrong-password':
        return 'Falsches Passwort.';
      case 'email-already-in-use':
        return 'Diese E-Mail wird bereits verwendet.';
      case 'weak-password':
        return 'Das Passwort ist zu schwach.';
      case 'invalid-email':
        return 'Ungültige E-Mail-Adresse.';
      case 'user-disabled':
        return 'Dieser Benutzer wurde deaktiviert.';
      case 'too-many-requests':
        return 'Zu viele Anfragen. Versuchen Sie es später erneut.';
      case 'operation-not-allowed':
        return 'Diese Operation ist nicht erlaubt.';
      default:
        return 'Ein unbekannter Fehler ist aufgetreten: ${e.message}';
    }
  }
}
