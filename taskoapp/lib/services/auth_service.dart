import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user_model.dart';
import 'offer_notification_service.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    // Korrekte OAuth Client ID aus google-services.json verwenden
    clientId: '1022290879475-ca1lvf8o1sau2f1gakf4qro1ondrfpti.apps.googleusercontent.com',
  );

  // Stream für aktuellen User
  Stream<TaskiloUser?> get userStream {
    return _auth.authStateChanges().asyncMap((firebaseUser) async {
      debugPrint('AUTH_SERVICE: authStateChanged - firebaseUser = ${firebaseUser != null ? "VORHANDEN (${firebaseUser.email})" : "NULL"}');
      
      if (firebaseUser == null) {
        debugPrint('AUTH_SERVICE: Kein User - return null');
        return null;
      }
      
      // Lade User-Daten aus Firestore
      final userDoc = await _firestore.collection('users').doc(firebaseUser.uid).get();
      
      if (userDoc.exists) {
        debugPrint('AUTH_SERVICE: User-Dokument gefunden - TaskiloUser erstellt');
        return TaskiloUser.fromFirestore(userDoc);
      } else {
        debugPrint('AUTH_SERVICE: User-Dokument nicht gefunden - erstelle neues');
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
        final user = await _getUserFromFirestore(credential.user!.uid);
        
        // Starte Offer Monitoring für eingeloggte User
        if (user != null) {
          await OfferNotificationService.startOfferMonitoring();
        }
        
        return user;
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

    // Erweiterte User Registrierung (Web-kompatibel)
  Future<TaskiloUser?> registerUser({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String phoneNumber,
    required String street,
    required String city,
    required String postalCode,
    required String country,
    required bool termsAccepted,
    required bool privacyAccepted,
    required bool newsletterSubscribed,
    UserType userType = UserType.customer,
  }) async {
    try {
      // Debug: Firebase Auth Status
      debugPrint('🔍 Firebase Auth Status Check:');
      debugPrint('   Current User: ${FirebaseAuth.instance.currentUser}');
      debugPrint('   🔧 App Name: ${FirebaseAuth.instance.app.name}');
      debugPrint('   🆔 App Options: ${FirebaseAuth.instance.app.options.projectId}');
      
      debugPrint('Starte Benutzerregistrierung...');
      debugPrint('📧 Email: $email');
      debugPrint('Name: $firstName $lastName');

      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        // Aktualisiere Display Name
        await credential.user!.updateDisplayName('$firstName $lastName');

        // Erstelle User-Profile
        final profile = UserProfile(
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          street: street,
          city: city,
          postalCode: postalCode,
          country: country,
        );

        // Erstelle User-Dokument in Firestore
        final user = TaskiloUser.fromFirebaseUser(credential.user!, profile: profile)
            .copyWith(userType: userType);

        await _firestore.collection('users').doc(credential.user!.uid).set(user.toFirestore());

        // Newsletter-Anmeldung wenn gewünscht
        if (newsletterSubscribed) {
          await _addToNewsletter(email, firstName, lastName);
        }

        // Sende Email-Verifikation
        await credential.user!.sendEmailVerification();

        debugPrint('✅ Benutzerregistrierung erfolgreich abgeschlossen');
        return user;
      }
      return null;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      debugPrint('❌ Unerwarteter Fehler bei Registrierung: $e');
      throw 'Ein unerwarteter Fehler ist aufgetreten.';
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

  // Google Sign In - VOLLSTÄNDIGE IMPLEMENTATION
  Future<TaskiloUser?> signInWithGoogle() async {
    try {
      debugPrint('🔍 Starte Google Sign-In...');
      
      // 0. Erst ausloggen falls bereits eingeloggt
      await _googleSignIn.signOut();
      
      // 1. Google Sign-In starten
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) {
        debugPrint('❌ Google Sign-In vom Benutzer abgebrochen');
        return null; // User hat den Sign-In abgebrochen
      }
      
      debugPrint('✅ Google-Account ausgewählt: ${googleUser.email}');
      
      // 2. Google Authentication Details abrufen
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      debugPrint('🔑 Access Token: ${googleAuth.accessToken != null ? "✅" : "❌"}');
      debugPrint('🔑 ID Token: ${googleAuth.idToken != null ? "✅" : "❌"}');
      
      if (googleAuth.accessToken == null || googleAuth.idToken == null) {
        debugPrint('❌ Google Auth Tokens sind null');
        throw 'Google-Authentifizierung fehlgeschlagen: Tokens nicht erhalten';
      }
      
      // 3. Firebase Credential erstellen
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      
      debugPrint('🔑 Firebase-Credential erstellt');
      
      // 4. Bei Firebase anmelden
      final userCredential = await _auth.signInWithCredential(credential);
      
      if (userCredential.user != null) {
        debugPrint('✅ Firebase-Anmeldung erfolgreich');
        
        // 5. Prüfe ob User bereits in Firestore existiert
        final existingUser = await _getUserFromFirestore(userCredential.user!.uid);
        
        if (existingUser != null) {
          debugPrint('📂 Bestehender User gefunden');
          await _updateLastLoginTime(userCredential.user!.uid);
          
          // Starte Offer Monitoring für eingeloggte User
          await OfferNotificationService.startOfferMonitoring();
          
          return existingUser;
        } else {
          debugPrint('👤 Neuer User - erstelle Firestore-Dokument');
          
          // 6. Neuen User mit Google-Daten erstellen
          final names = googleUser.displayName?.split(' ') ?? ['', ''];
          final profile = UserProfile(
            firstName: names.isNotEmpty ? names.first : '',
            lastName: names.length > 1 ? names.skip(1).join(' ') : '',
          );
          
          final newUser = TaskiloUser.fromFirebaseUser(
            userCredential.user!,
            profile: profile,
          );
          
          await _firestore.collection('users').doc(userCredential.user!.uid).set(newUser.toFirestore());
          
          debugPrint('✅ Neuer User erfolgreich erstellt');
          
          // Starte Offer Monitoring für neue User
          await OfferNotificationService.startOfferMonitoring();
          
          return newUser;
        }
      }
      
      return null;
    } on FirebaseAuthException catch (e) {
      debugPrint('❌ Firebase Auth Fehler: ${e.code} - ${e.message}');
      
      // Spezielle Behandlung für Google Sign-In Credential-Fehler
      if (e.code == 'invalid-credential') {
        // Google Sign-In zurücksetzen und erneut versuchen
        await _googleSignIn.signOut();
        throw 'Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.';
      }
      
      throw _handleAuthException(e);
    } on Exception catch (e) {
      debugPrint('❌ Google Sign-In Exception: $e');
      
      // Google Sign-In zurücksetzen bei Fehlern
      await _googleSignIn.signOut();
      
      if (e.toString().contains('network_error')) {
        throw 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else if (e.toString().contains('sign_in_cancelled')) {
        throw 'Google Sign-In wurde abgebrochen.';
      } else if (e.toString().contains('sign_in_failed')) {
        throw 'Google Sign-In fehlgeschlagen. Bitte versuchen Sie es erneut.';
      }
      
      throw 'Ein Fehler ist bei der Google-Anmeldung aufgetreten: $e';
    } catch (e) {
      debugPrint('❌ Unbekannter Google Sign-In Fehler: $e');
      await _googleSignIn.signOut();
      throw 'Ein unbekannter Fehler ist bei der Google-Anmeldung aufgetreten: $e';
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
    debugPrint('AUTH_SERVICE: signOut() aufgerufen');
    try {
      // Stoppe Offer Monitoring vor dem Logout
      await OfferNotificationService.stopOfferMonitoring();
      
      await _auth.signOut();
      debugPrint('AUTH_SERVICE: Firebase Auth signOut erfolgreich');
    } catch (e) {
      debugPrint('AUTH_SERVICE: signOut Fehler: $e');
      rethrow;
    }
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

  // Get Current User Data from Firestore
  Future<TaskiloUser?> getCurrentUserData() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return await _getUserFromFirestore(user.uid);
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

  // Newsletter-Anmeldung in separater Collection
  Future<void> _addToNewsletter(String email, String firstName, String lastName) async {
    try {
      await _firestore.collection('newsletter_subscribers').doc(email).set({
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'subscribedAt': FieldValue.serverTimestamp(),
        'source': 'app_registration',
        'isActive': true,
        'tags': ['app_user'],
      });
      
      debugPrint('✅ Newsletter-Anmeldung erfolgreich für: $email');
    } catch (e) {
      debugPrint('❌ Newsletter-Anmeldung fehlgeschlagen: $e');
      // Fehler nicht werfen, da Newsletter optional ist
    }
  }

  String _handleAuthException(FirebaseAuthException e) {
    debugPrint('🔍 Detaillierte Firebase Auth Exception:');
    debugPrint('  📋 Code: ${e.code}');
    debugPrint('  💬 Message: ${e.message}');
    debugPrint('  🔧 Plugin: ${e.plugin}');
    debugPrint('  📧 Email: ${e.email}');
    debugPrint('  🆔 Credential: ${e.credential}');
    debugPrint('  📱 Phone Number: ${e.phoneNumber}');
    debugPrint('  🔗 Tenant ID: ${e.tenantId}');
    
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
      case 'invalid-credential':
        return 'Die Anmeldedaten sind ungültig oder abgelaufen. Bitte versuchen Sie es erneut.';
      case 'account-exists-with-different-credential':
        return 'Ein Konto mit dieser E-Mail existiert bereits mit anderen Anmeldedaten.';
      case 'credential-already-in-use':
        return 'Diese Anmeldedaten werden bereits von einem anderen Konto verwendet.';
      case 'internal-error':
        return 'Firebase Interner Fehler - Konfigurationsproblem erkannt. Details: ${e.message}';
      default:
        return 'Ein unbekannter Fehler ist aufgetreten: ${e.message}';
    }
  }
}