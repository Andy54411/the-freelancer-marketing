// Firebase Configuration for Taskilo App
// Diese Datei entspricht der Web-Konfiguration aus firebase/clients.ts

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web - '
        'you can reconfigure this by running the FlutterFire CLI again.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macos - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  // Android Configuration - basierend auf google-services.json
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA6rCJjPQ7q0C2HtZw9YYm4_4jjYHKgLlU',
    appId: '1:1022290879475:android:3a621239990633c35ae886', 
    messagingSenderId: '1022290879475',
    projectId: 'tilvo-f142f',
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
    storageBucket: 'tilvo-f142f.firebasestorage.app',
  );

  // iOS Configuration - basierend auf der Web-Config
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCrJo7v6LJVgL8l0Z2zJeN3C5YC3YzRHiE', // Replace with your iOS API Key
    appId: '1:1022290879475:ios:xyz123', // Replace with your iOS App ID
    messagingSenderId: '1022290879475', 
    projectId: 'tilvo-f142f',
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
    storageBucket: 'tilvo-f142f.appspot.com',
    iosBundleId: 'de.taskilo.taskiloApp',
  );
}

// Cloud Functions Region - wie in der Web-App
const String functionsRegion = 'europe-west1';
