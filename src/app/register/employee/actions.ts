'use server';

import { auth, db } from '@/firebase/server'; // Wichtig: Server-Clients verwenden!
import { FieldValue } from 'firebase-admin/firestore';
import { UserRecord } from 'firebase-admin/auth';
import { FirebaseError } from 'firebase-admin';

// Eine "Type Guard"-Funktion, um sicher zu prüfen, ob ein unbekannter Fehler
// die Struktur eines FirebaseError hat. `instanceof` funktioniert hier nicht,
// da FirebaseError ein Interface und keine Klasse ist.
function isFirebaseError(error: unknown): error is FirebaseError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

type FormState = {
  error: string | null;
  success: boolean;
};

export async function registerEmployee(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const inviteCode = formData.get('inviteCode') as string;

  // Grundlegende Validierung der Eingaben
  if (
    !email?.trim() ||
    !password ||
    !firstName?.trim() ||
    !lastName?.trim() ||
    !inviteCode?.trim()
  ) {
    return {
      error: 'Bitte füllen Sie alle erforderlichen Felder aus, einschließlich des Einladungscodes.',
      success: false,
    };
  }

  try {
    let role: 'master' | 'support';

    // 1. Prüfe auf den einmaligen Master-Code
    const masterInviteCode = process.env.MASTER_INVITE_CODE;
    if (masterInviteCode && inviteCode === masterInviteCode) {
      role = 'master';

    } else {
      // 2. Fallback auf den regulären Mitarbeiter-Code
      const employeeInviteCode = process.env.EMPLOYEE_INVITE_CODE;
      if (!employeeInviteCode) {

        return { error: 'Fehler bei der Serverkonfiguration.', success: false };
      }
      if (inviteCode !== employeeInviteCode) {
        return {
          error: 'Dieser Einladungscode ist ungültig oder wurde bereits verwendet.',
          success: false,
        };
      }
      role = 'support';

    }

    let userRecord: UserRecord;
    let isNewUser = false;

    // 2. Prüfen, ob der Benutzer bereits existiert
    try {
      userRecord = await auth.getUserByEmail(email);
      // Benutzer existiert. Prüfen, ob es sich um einen normalen Kunden handelt.
      const existingUserDoc = await db.collection('users').doc(userRecord.uid).get();
      const existingUserData = existingUserDoc.data();
      if (
        existingUserData &&
        existingUserData.user_type &&
        existingUserData.user_type !== 'kunde'
      ) {
        // Verhindere, dass ein 'firma' oder bereits 'support'/'master' Account überschrieben wird.
        return {
          error: `Ein Account mit dieser E-Mail existiert bereits und ist kein Kunden-Account. Bitte verwenden Sie eine andere E-Mail.`,
          success: false,
        };
      }

    } catch (error: unknown) {
      // 3. Wenn der Benutzer nicht gefunden wird, erstellen wir ihn neu.
      if (isFirebaseError(error) && error.code === 'auth/user-not-found') {

        userRecord = await auth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
          emailVerified: true, // Gute Praxis, da dies eine Admin-Aktion ist
        });
        isNewUser = true;
      } else {
        // Ein anderer Fehler bei getUserByEmail (z.B. ungültiges E-Mail-Format), wirf ihn erneut.
        throw error;
      }
    }

    // 4. Setze Custom Claims, um die Rolle sicher im Backend festzulegen.
    // Dies ist die maßgebliche Quelle für die Zugriffskontrolle.
    await auth.setCustomUserClaims(userRecord.uid, { role: role });

    // 5. Erstelle oder aktualisiere das Benutzerdokument in Firestore.
    // { merge: true } stellt sicher, dass wir bestehende Daten (wie createdAt) nicht überschreiben.
    const userData: { [key: string]: any } = {
      uid: userRecord.uid,
      user_type: role, // Dieses Feld ist gut für einfache DB-Abfragen.
      role: role, // Die Rolle hier zu speichern ist nützlich für die Anzeige im Frontend.
      email: email,
      firstName: firstName,
      lastName: lastName,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isNewUser) {
      userData.createdAt = FieldValue.serverTimestamp();
    }

    await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });

    // 6. Der Schritt, den Code in Firestore als "verwendet" zu markieren, entfällt,
    // da der Code statisch ist und wiederverwendet werden kann.
    // await inviteCodeRef.update({ used: true, usedBy: userRecord.uid, usedAt: FieldValue.serverTimestamp() });

    return { error: null, success: true };
  } catch (error: unknown) {

    if (isFirebaseError(error)) {
      // Detailliertere Fehlermeldungen basierend auf dem Firebase-Fehlercode
      switch (error.code) {
        case 'auth/email-already-exists':
          return {
            error:
              'Diese E-Mail-Adresse wird bereits verwendet. Der Benutzer muss sich mit seinem bestehenden Passwort anmelden.',
            success: false,
          };
        case 'auth/weak-password':
          return {
            error: 'Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.',
            success: false,
          };
        case 'auth/invalid-email':
          return {
            error: 'Die angegebene E-Mail-Adresse hat ein ungültiges Format.',
            success: false,
          };
        case 'auth/operation-not-allowed':
          return {
            error: 'Die Registrierung per E-Mail und Passwort ist derzeit nicht aktiviert.',
            success: false,
          };
        default:
          return {
            error: `Ein unerwarteter Firebase-Fehler ist aufgetreten. Code: ${error.code}`,
            success: false,
          };
      }
    }
    return { error: 'Ein unerwarteter Fehler ist aufgetreten.', success: false };
  }
}
