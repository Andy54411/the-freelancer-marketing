import { onCall, CallableRequest } from "firebase-functions/v2/https"; // CallableRequest importieren
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { corsOptions, getDb, getAuthInstance } from "./helpers";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid"; // nanoid is a great choice for secure, random IDs

interface CreateInviteData {
    role: 'support' | 'master';
    recipientEmail?: string; // NEU: Optionale E-Mail des Empfängers
}

interface CreateInviteResult {
    success: boolean;
    inviteCode: string;
    emailSent: boolean;
}

interface DeleteInviteData {
    codeId: string;
}

interface DeleteInviteResult {
    success: boolean;
    message: string;
}


/**
 * Erstellt einen neuen, einmaligen Einladungscode und speichert ihn in Firestore.
 */
export const createInviteCode = onCall({ region: "europe-west1", cors: corsOptions },
    async (request: CallableRequest<CreateInviteData>): Promise<CreateInviteResult> => {
        // Die Region und CORS-Optionen werden jetzt explizit oben definiert.
        logger.info(`[createInviteCode] Aufgerufen mit Daten:`, request.data);

        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Sie müssen angemeldet sein, um diese Aktion auszuführen.");
        }

        // Auth-Check: Nur 'master' oder 'support' dürfen Codes erstellen.
        const userRole = request.auth?.token.role;
        if (userRole !== 'master' && userRole !== 'support') {
            throw new HttpsError("permission-denied", `Ihre Rolle ('${userRole}') hat keine Berechtigung, Einladungscodes zu erstellen.`);
        }

        const { role, recipientEmail } = request.data; // recipientEmail aus den Daten holen
        if (role !== 'support' && role !== 'master') {
            throw new HttpsError('invalid-argument', 'Die zu erstellende Rolle muss entweder "support" oder "master" sein.');
        }

        // Optionale serverseitige Validierung der E-Mail-Adresse
        if (recipientEmail && !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
            throw new HttpsError('invalid-argument', 'Die angegebene E-Mail-Adresse ist ungültig.');
        }

        const { uid } = request.auth;
        const db = getDb();
        const inviteCode = nanoid(12); // Using nanoid is more secure than a simple random generator
        const inviteCodeRef = db.collection('invite_codes').doc(inviteCode);
        let emailWasSent = false;

        try {
            await inviteCodeRef.set({
                code: inviteCode,
                role: role,
                used: false,
                createdAt: FieldValue.serverTimestamp(),
                createdBy: uid,
            });
            logger.info(`[createInviteCode] Einladungscode ${inviteCode} für Rolle ${role} in Firestore gespeichert.`);

            // Schritt 2: E-Mail-Benachrichtigung an den angegebenen Empfänger senden
            const auth = getAuthInstance();
            const adminUserRecord = await auth.getUser(uid); // Admin-Infos holen, um sie in der E-Mail zu erwähnen
            const adminName = adminUserRecord.displayName || 'Ein Administrator';

            if (recipientEmail) {
                await db.collection("mail").add({
                    to: [recipientEmail], // Die neue E-Mail-Adresse verwenden
                    message: {
                        subject: `Ihre Einladung zu TASKILO`,
                        html: `
                        <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                            <!-- Preheader Text (unsichtbar in der E-Mail, aber sichtbar in der Posteingangs-Vorschau) -->
                            <div style="display: none; max-height: 0; overflow: hidden;">
                                Ihr persönlicher Einladungscode für TASKILO.
                            </div>

                            <h1>Willkommen bei TASKILO!</h1>
                            <p>${adminName} hat Sie eingeladen, dem TASKILO-Team mit der Rolle <strong>${role}</strong> beizutreten.</p>
                            <p>Bitte verwenden Sie den folgenden Code, um Ihre Registrierung abzuschließen:</p>
                            <div style="background-color: #f0f0f0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">
                                    ${inviteCode}
                                </p>
                            </div>
                            <p>Der Code ist für eine einmalige Verwendung gültig.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #777;">Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.</p>
                        </div>
                    `,
                    },
                });
                logger.info(`[createInviteCode] E-Mail-Benachrichtigung an ${recipientEmail} in die Warteschlange gestellt.`);
                emailWasSent = true;
            } else {
                logger.warn(`[createInviteCode] Es wurde keine Empfänger-E-Mail angegeben. Code wurde erstellt, aber nicht versendet.`);
            }

            return { success: true, inviteCode: inviteCode, emailSent: emailWasSent };
        } catch (error: any) {
            logger.error(`[createInviteCode] Fehler beim Erstellen der Einladung:`, error);
            throw new HttpsError('internal', 'Ein Fehler ist beim Erstellen der Einladung aufgetreten.', error.message);
        }
    });

/**
 * Löscht einen bestehenden Einladungscode aus Firestore.
 */
export const deleteInviteCode = onCall({ region: "europe-west1", cors: corsOptions },
    async (request: CallableRequest<DeleteInviteData>): Promise<DeleteInviteResult> => {
        logger.info(`[deleteInviteCode] Aufgerufen mit Daten:`, request.data);

        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Sie müssen angemeldet sein, um diese Aktion auszuführen.");
        }

        // Auth-Check: Nur 'master' oder 'support' dürfen Codes löschen.
        const userRole = request.auth?.token.role;
        if (userRole !== 'master' && userRole !== 'support') {
            throw new HttpsError("permission-denied", `Ihre Rolle ('${userRole}') hat keine Berechtigung, Einladungscodes zu löschen.`);
        }

        const { codeId } = request.data;
        if (!codeId || typeof codeId !== 'string' || codeId.trim() === '') {
            throw new HttpsError('invalid-argument', 'Eine gültige, nicht-leere codeId muss angegeben werden.');
        }

        const db = getDb();
        try {
            await db.collection('invite_codes').doc(codeId).delete();
            logger.info(`[deleteInviteCode] Einladungscode ${codeId} erfolgreich gelöscht.`);
            return { success: true, message: `Einladungscode ${codeId} erfolgreich gelöscht.` };
        } catch (error: any) {
            logger.error(`[deleteInviteCode] Fehler beim Löschen des Einladungscodes ${codeId}:`, error);
            throw new HttpsError('internal', 'Ein Fehler ist beim Löschen der Einladung aufgetreten.', error.message);
        }
    }
);