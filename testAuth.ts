import * as admin from 'firebase-admin';

admin.initializeApp();

if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log('Auth Emulator erkannt:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

admin.auth().listUsers()
    .then((users: admin.auth.ListUsersResult) => {
        console.log(`Es wurden ${users.users.length} Nutzer gefunden.`);
    })
    .catch((err: unknown) => {
        console.error('Fehler beim Abrufen der Nutzer:', err);
    });
