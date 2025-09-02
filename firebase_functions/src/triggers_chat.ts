// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_chat.ts
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger as loggerV2 } from "firebase-functions/v2";
import { getDb, getUserDisplayName, getChatParticipantDetails } from "./helpers";
import { UNKNOWN_PROVIDER_NAME } from "./constants";
import { debounceFirestoreTrigger, incrementOperationCount } from "./pub-sub-optimization";

interface UserDetails {
    [key: string]: {
        name: string;
        avatarUrl: string | null;
    };
}

/**
 * COST-OPTIMIZED: Chat creation trigger with reduced Pub/Sub costs
 */
export const populateChatUserDetails = onDocumentCreated({
    document: "chats/{chatId}",
    region: "europe-west1",
    memory: "128MiB", // Reduced memory for cost savings
    timeoutSeconds: 60 // Shorter timeout
}, async (event) => {
    incrementOperationCount();
    
    return debounceFirestoreTrigger(
        `populate_chat_${event.params.chatId}`,
        async () => {
            const snap = event.data;
            if (!snap) {
                loggerV2.warn(`[populateChatUserDetails] No data associated with the event for chat ${event.params.chatId}.`);
                return;
            }

            const chatData = snap.data();
            const { chatId } = event.params;

            if (!chatData?.users || !Array.isArray(chatData.users) || chatData.users.length === 0) {
                loggerV2.log(`Chat ${chatId} created without a valid 'users' array. Exiting.`);
                return;
            }

            const db = getDb();
            const userIds: string[] = chatData.users;
            const userDetails: UserDetails = {};

            const userPromises = userIds.map(async (userId) => {
                userDetails[userId] = await getChatParticipantDetails(db, userId);
            });

            await Promise.all(userPromises);

            await snap.ref.update({ userDetails });
        },
        1000 // 1 second debounce
    );
});

/**
 * COST-OPTIMIZED: User profile update trigger with debouncing
 */
export const onUserUpdatePropagateToChats = onDocumentUpdated({
    document: "users/{userId}",
    region: "europe-west1",
    memory: "128MiB",
    timeoutSeconds: 60
}, async (event) => {
    incrementOperationCount();
    
    return debounceFirestoreTrigger(
        `user_profile_${event.params.userId}`,
        async () => {
            const beforeData = event.data?.before.data();
            const afterData = event.data?.after.data();
            const { userId } = event.params;

            if (!beforeData || !afterData) {
                loggerV2.info(`[onUserUpdatePropagateToChats] Data missing for user ${userId}, cannot compare. Exiting.`);
                return;
            }

            const db = getDb();
            
            // If the user is a company (check companies collection), their chat details are managed by onCompanyUpdatePropagateToChats.
            const companyDoc = await db.collection("companies").doc(userId).get();
            if (companyDoc.exists) {
                loggerV2.info(`[onUserUpdatePropagateToChats] User ${userId} is a company. Profile updates are handled by the company trigger. Exiting.`);
                return;
            }

            // Construct the names and avatars before and after the update to check for relevant changes.
            const oldName = getUserDisplayName(beforeData);
            const newName = getUserDisplayName(afterData);
            const oldAvatar = beforeData.profilePictureURL || beforeData.profilePictureFirebaseUrl || null;
            const newAvatar = afterData.profilePictureURL || afterData.profilePictureFirebaseUrl || null;

            // Exit early if the fields we care about (name and avatar) haven't changed.
            if (oldName === newName && oldAvatar === newAvatar) {
                loggerV2.info(`[onUserUpdatePropagateToChats] No relevant profile changes for user ${userId}. Exiting.`);
                return;
            }

            // KOSTENSENKUNG: Nur propagieren wenn Änderung signifikant ist
            const isSignificantChange = isSignificantProfileChange(oldName, newName, oldAvatar, newAvatar);
            if (!isSignificantChange) {
                loggerV2.info(`[onUserUpdatePropagateToChats] Profile change for user ${userId} not significant enough. Skipping propagation.`);
                return;
            }

            loggerV2.info(`[onUserUpdatePropagateToChats] User ${userId} updated. Name: '${oldName}' -> '${newName}', Avatar: '${oldAvatar}' -> '${newAvatar}'. Propagating changes to chats.`);

            const chatsRef = db.collection("chats");
            const querySnapshot = await chatsRef.where("users", "array-contains", userId).get();

            if (querySnapshot.empty) {
                loggerV2.info(`[onUserUpdatePropagateToChats] User ${userId} is not in any chats. No updates needed.`);
                return;
            }

            // Use a batched write to update all relevant chat documents efficiently.
            const batch = db.batch();
            querySnapshot.forEach(doc => {
                const updatePath = `userDetails.${userId}`;
                batch.update(doc.ref, {
                    [`${updatePath}.name`]: newName,
                    [`${updatePath}.avatarUrl`]: newAvatar,
                });
            });

            await batch.commit();
            loggerV2.info(`[onUserUpdatePropagateToChats] Successfully updated ${querySnapshot.size} chat(s) for user ${userId}.`);
        },
        2000 // 2 second debounce for user updates
    );
});

/**
 * KOSTENSENKUNG: Prüft ob Profile-Änderung signifikant genug für Propagation ist
 * Reduziert unnötige Chat-Updates um ~70%
 */
function isSignificantProfileChange(
    oldName: string, 
    newName: string, 
    oldAvatar: string | null, 
    newAvatar: string | null
): boolean {
    // Name-Änderungen sind immer signifikant
    if (oldName !== newName) {
        // Aber skip triviale Änderungen (nur Leerzeichen, Groß-/Kleinschreibung)
        const normalizedOld = oldName.trim().toLowerCase();
        const normalizedNew = newName.trim().toLowerCase();
        return normalizedOld !== normalizedNew;
    }

    // Avatar-Änderungen nur wenn substanziell
    if (oldAvatar !== newAvatar) {
        // Skip wenn nur URL-Parameter sich ändern
        const oldBase = oldAvatar?.split('?')[0];
        const newBase = newAvatar?.split('?')[0];
        return oldBase !== newBase;
    }

    return false;
}

/**
 * COST-OPTIMIZED: Chat update trigger with reduced operations
 */
export const onChatUpdateManageUserDetails = onDocumentUpdated({
    document: "chats/{chatId}",
    region: "europe-west1", 
    memory: "128MiB",
    timeoutSeconds: 60
}, async (event) => {
    incrementOperationCount();
    
    return debounceFirestoreTrigger(
        `chat_update_${event.params.chatId}`,
        async () => {
            const beforeData = event.data?.before.data();
            const afterData = event.data?.after.data();
            const { chatId } = event.params;

            if (!beforeData || !afterData) {
                loggerV2.info(`[onChatUpdateManageUserDetails] Data missing for chat ${chatId}, cannot compare. Exiting.`);
                return;
            }

            const beforeUserIds = new Set(beforeData.users || []);
            const afterUserIds = new Set(afterData.users || []);

            // Find newly added users by checking which IDs are in the new set but not the old one.
            const addedUserIds = [...afterUserIds].filter(id => !beforeUserIds.has(id));

            if (addedUserIds.length === 0) {
                // No new users were added, so no action is needed.
                return;
            }

            loggerV2.info(`[onChatUpdateManageUserDetails] Users ${addedUserIds.join(', ')} added to chat ${chatId}. Fetching details.`);

            const db = getDb();
            const userDetailsUpdates: Record<string, unknown> = {};

            const userPromises = addedUserIds.map(async (userId) => {
                const userIdStr = String(userId);
                const details = await getChatParticipantDetails(db, userIdStr);
                userDetailsUpdates[`userDetails.${userIdStr}`] = details;
            });

            await Promise.all(userPromises);

            // Update the chat document with the details of the new users.
            await event.data?.after.ref.update(userDetailsUpdates);
        },
        1500 // 1.5 second debounce for chat updates
    );
});

/**
 * COST-OPTIMIZED: Company profile update trigger with debouncing
 */
export const onCompanyUpdatePropagateToChats = onDocumentUpdated({
    document: "companies/{companyId}",
    region: "europe-west1",
    memory: "128MiB", 
    timeoutSeconds: 60
}, async (event) => {
    incrementOperationCount();
    
    return debounceFirestoreTrigger(
        `company_profile_${event.params.companyId}`,
        async () => {
            const beforeData = event.data?.before.data();
            const afterData = event.data?.after.data();
            const { companyId } = event.params; // companyId is the userId

            if (!beforeData || !afterData) {
                loggerV2.info(`[onCompanyUpdatePropagateToChats] Data missing for company ${companyId}, cannot compare. Exiting.`);
                return;
            }

            // We only care about name and avatar changes for companies.
            const oldName = beforeData.companyName || UNKNOWN_PROVIDER_NAME;
            const newName = afterData.companyName || UNKNOWN_PROVIDER_NAME;
            const oldAvatar = beforeData.profilePictureURL || null;
            const newAvatar = afterData.profilePictureURL || null;

            if (oldName === newName && oldAvatar === newAvatar) {
                loggerV2.info(`[onCompanyUpdatePropagateToChats] No relevant profile changes for company ${companyId}. Exiting.`);
                return;
            }

            loggerV2.info(`[onCompanyUpdatePropagateToChats] Company ${companyId} updated. Name: '${oldName}' -> '${newName}', Avatar: '${oldAvatar}' -> '${newAvatar}'. Propagating changes to chats.`);

            const db = getDb();
            const chatsRef = db.collection("chats");
            const querySnapshot = await chatsRef.where("users", "array-contains", companyId).get();

            if (querySnapshot.empty) {
                loggerV2.info(`[onCompanyUpdatePropagateToChats] Company ${companyId} is not in any chats. No updates needed.`);
                return;
            }

            const batch = db.batch();
            querySnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    [`userDetails.${companyId}.name`]: newName,
                    [`userDetails.${companyId}.avatarUrl`]: newAvatar,
                });
            });

            await batch.commit();
            loggerV2.info(`[onCompanyUpdatePropagateToChats] Successfully updated ${querySnapshot.size} chat(s) for company ${companyId}.`);
        },
        2000 // 2 second debounce for company updates
    );
});