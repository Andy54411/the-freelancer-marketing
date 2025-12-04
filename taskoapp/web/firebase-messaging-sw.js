importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD_jf9CiuvGKMK7wUw9mu-NkUIJDzoMusw',
  authDomain: 'tilvo-f142f.firebaseapp.com',
  projectId: 'tilvo-f142f',
  storageBucket: 'tilvo-f142f.firebasestorage.app',
  messagingSenderId: '1022290879475',
  appId: '1:1022290879475:web:45b6e46859948ec15ae886',
  measurementId: 'G-WWXT65CVC8',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/Icon-192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
