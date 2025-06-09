"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var admin = require("firebase-admin");
admin.initializeApp();
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log('Auth Emulator erkannt:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
}
admin.auth().listUsers()
    .then(function (users) {
    console.log("Es wurden ".concat(users.users.length, " Nutzer gefunden."));
})
    .catch(function (err) {
    console.error('Fehler beim Abrufen der Nutzer:', err);
});
