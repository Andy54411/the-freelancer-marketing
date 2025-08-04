// src/types/finapiTypes.ts

/**
 * Definiert die Struktur für die Speicherung von finAPI-Benutzerdaten in Firestore.
 * Diese Daten sind notwendig, um die Sitzung eines Benutzers bei finAPI wiederherzustellen
 * und Operationen in seinem Namen durchzuführen.
 */
export interface FinapiUserCredentials {
  /**
   * Die eindeutige ID des Taskilo-Benutzers, zu dem diese Anmeldeinformationen gehören.
   */
  taskiloUserId: string;

  /**
   * Die von finAPI generierte, eindeutige ID für den Benutzer.
   * Diese wird verwendet, um den Benutzer bei finAPI zu identifizieren.
   * Beispiel: "taskilo_USER_ID_TIMESTAMP"
   */
  finapiUserId: string;

  /**
   * Das von uns generierte und an finAPI übergebene Passwort für den finAPI-Benutzer.
   * WICHTIG: Dieses Passwort wird benötigt, um den `password` Grant Type für den
   * Abruf des Benutzer-Access-Tokens zu verwenden. Es wird im Klartext gespeichert,
   * da finAPI es für die Authentifizierung benötigt.
   */
  finapiUserPassword;

  /**
   * Der Zeitstempel, an dem die Anmeldeinformationen erstellt wurden.
   * Wird serverseitig von Firestore gesetzt.
   */
  createdAt: any; // Firestore Timestamp
}
