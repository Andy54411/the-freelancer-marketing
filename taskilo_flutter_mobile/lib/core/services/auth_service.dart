import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/user_model.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  User? get currentUser => _auth.currentUser;
  bool get isLoggedIn => currentUser != null;
  
  UserModel? _userModel;
  UserModel? get userModel => _userModel;
  
  bool _isLoading = false;
  bool get isLoading => _isLoading;
  
  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  AuthService() {
    _auth.authStateChanges().listen(_onAuthStateChanged);
  }

  void _onAuthStateChanged(User? user) async {
    if (user != null) {
      await _loadUserData(user.uid);
    } else {
      _userModel = null;
    }
    notifyListeners();
  }

  Future<void> _loadUserData(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists) {
        _userModel = UserModel.fromMap(doc.data()!, uid);
      }
    } catch (e) {
      print('Error loading user data: $e');
    }
  }

  // Login mit E-Mail und Passwort
  Future<bool> loginWithEmailAndPassword(String email, String password) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        await _loadUserData(credential.user!.uid);
        return true;
      }
      return false;
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getErrorMessage(e.code);
      return false;
    } catch (e) {
      _errorMessage = 'Ein unerwarteter Fehler ist aufgetreten';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Registrierung
  Future<bool> registerWithEmailAndPassword({
    required String email,
    required String password,
    required String name,
    required String userType, // 'customer' oder 'company'
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        // Benutzerdaten in Firestore speichern
        final userData = {
          'name': name,
          'email': email,
          'userType': userType,
          'createdAt': FieldValue.serverTimestamp(),
          'isCompanyProfileComplete': false,
          'isUserProfileComplete': false,
        };

        await _firestore
            .collection('users')
            .doc(credential.user!.uid)
            .set(userData);

        await _loadUserData(credential.user!.uid);
        return true;
      }
      return false;
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getErrorMessage(e.code);
      return false;
    } catch (e) {
      _errorMessage = 'Ein unerwarteter Fehler ist aufgetreten';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Passwort zurücksetzen
  Future<bool> resetPassword(String email) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      await _auth.sendPasswordResetEmail(email: email);
      return true;
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getErrorMessage(e.code);
      return false;
    } catch (e) {
      _errorMessage = 'Ein unerwarteter Fehler ist aufgetreten';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Logout
  Future<void> logout() async {
    await _auth.signOut();
    _userModel = null;
    notifyListeners();
  }

  // Fehlermeldungen übersetzen
  String _getErrorMessage(String code) {
    switch (code) {
      case 'user-not-found':
        return 'Kein Benutzer mit dieser E-Mail-Adresse gefunden';
      case 'wrong-password':
        return 'Falsches Passwort';
      case 'email-already-in-use':
        return 'Diese E-Mail-Adresse wird bereits verwendet';
      case 'weak-password':
        return 'Das Passwort ist zu schwach';
      case 'invalid-email':
        return 'Ungültige E-Mail-Adresse';
      case 'user-disabled':
        return 'Dieser Benutzer wurde deaktiviert';
      case 'too-many-requests':
        return 'Zu viele Versuche. Bitte versuchen Sie es später erneut';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut';
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
