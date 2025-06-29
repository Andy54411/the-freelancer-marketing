// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_chat.ts
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger as loggerV2 } from "firebase-functions/v2";
import { getDb, getUserDisplayName, getChatParticipantDetails } from "./helpers";
import { UNKNOWN_USER_NAME, UNKNOWN_PROVIDER_NAME } from "./constants"; // UNKNOWN_PROVIDER_NAME is used in onCompanyUpdatePropagateToChats

interface UserDetails {
    [key: string]: {
        name: string;
        avatarUrl: string | null;
    };
}

/**
 * Triggers when a new chat document is created in the 'chats' collection.
 * It fetches the details of the participating users and populates a 'userDetails'
 * map within the chat document. This denormalization is crucial for performance
* and security, as it prevents clients from needing to fetch user profiles directly.
 */
export const populateChatUserDetails = onDocumentCreated("chats/{chatId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        loggerV2.warn(`[populateChatUserDetails] No data associated with the event for chat ${event.params.chatId}.`);
        return null;
    }

    const chatData = snap.data();
    const { chatId } = event.params;

    if (!chatData?.users || !Array.isArray(chatData.users) || chatData.users.length === 0) {
        loggerV2.log(`Chat ${chatId} created without a valid 'users' array. Exiting.`);
        return null;
    }

    const db = getDb();
    const userIds: string[] = chatData.users;
    const userDetails: UserDetails = {};

    const userPromises = userIds.map(async (userId) => {
        userDetails[userId] = await getChatParticipantDetails(db, userId);
    });

    await Promise.all(userPromises);

    return snap.ref.update({ userDetails });
});

/**
 * Triggers when a user's profile is updated in the 'users' collection.
 * It finds all chat documents the user participates in and propagates the
 * changes (specifically name and avatarUrl) to the denormalized 'userDetails' map.
 * This ensures that chat lists and UIs always show the most current user information.
 */
export const onUserUpdatePropagateToChats = onDocumentUpdated("users/{userId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const { userId } = event.params;

    if (!beforeData || !afterData) {
        loggerV2.info(`[onUserUpdatePropagateToChats] Data missing for user ${userId}, cannot compare. Exiting.`);
        return null;
    }

    // If the user is a company, their chat details are managed by onCompanyUpdatePropagateToChats.
    if (afterData.user_type === 'firma') {
        loggerV2.info(`[onUserUpdatePropagateToChats] User ${userId} is a company. Profile updates are handled by the company trigger. Exiting.`);
        return null;
    }

    // Construct the names and avatars before and after the update to check for relevant changes.
    const oldName = getUserDisplayName(beforeData);
    const newName = getUserDisplayName(afterData);
    const oldAvatar = beforeData.profilePictureURL || beforeData.profilePictureFirebaseUrl || null;
    const newAvatar = afterData.profilePictureURL || afterData.profilePictureFirebaseUrl || null;

    // Exit early if the fields we care about (name and avatar) haven't changed.
    if (oldName === newName && oldAvatar === newAvatar) {
        loggerV2.info(`[onUserUpdatePropagateToChats] No relevant profile changes for user ${userId}. Exiting.`);
        return null;
    }

    loggerV2.info(`[onUserUpdatePropagateToChats] User ${userId} updated. Name: '${oldName}' -> '${newName}', Avatar: '${oldAvatar}' -> '${newAvatar}'. Propagating changes to chats.`);

    const db = getDb();
    const chatsRef = db.collection("chats");
    const querySnapshot = await chatsRef.where("users", "array-contains", userId).get();

    if (querySnapshot.empty) {
        loggerV2.info(`[onUserUpdatePropagateToChats] User ${userId} is not in any chats. No updates needed.`);
        return null;
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
    return null;
});

/**
 * Triggers when a chat document is updated, specifically to handle when new
 * users are added to the 'users' array. It fetches the details for the new
 * participants and adds them to the 'userDetails' map.
 */
export const onChatUpdateManageUserDetails = onDocumentUpdated("chats/{chatId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const { chatId } = event.params;

    if (!beforeData || !afterData) {
        loggerV2.info(`[onChatUpdateManageUserDetails] Data missing for chat ${chatId}, cannot compare. Exiting.`);
        return null;
    }

    const beforeUserIds = new Set(beforeData.users || []);
    const afterUserIds = new Set(afterData.users || []);

    // Find newly added users by checking which IDs are in the new set but not the old one.
    const addedUserIds = [...afterUserIds].filter(id => !beforeUserIds.has(id));

    if (addedUserIds.length === 0) {
        // No new users were added, so no action is needed.
        return null;
    }

    loggerV2.info(`[onChatUpdateManageUserDetails] Users ${addedUserIds.join(', ')} added to chat ${chatId}. Fetching details.`);

    const db = getDb();
    const userDetailsUpdates: { [key: string]: any } = {};

    const userPromises = addedUserIds.map(async (userId) => {
        const userIdStr = String(userId);
        const details = await getChatParticipantDetails(db, userIdStr);
        userDetailsUpdates[`userDetails.${userIdStr}`] = details;
    });

    await Promise.all(userPromises);

    // Update the chat document with the details of the new users.
    return event.data?.after.ref.update(userDetailsUpdates);
});

/**
 * Triggers when a company's profile is updated in the 'companies' collection.
 * It finds all chat documents the company participates in and propagates the
 * changes (specifically companyName and profilePictureURL) to the denormalized 'userDetails' map.
 */
export const onCompanyUpdatePropagateToChats = onDocumentUpdated("companies/{companyId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const { companyId } = event.params; // companyId is the userId

    if (!beforeData || !afterData) {
        loggerV2.info(`[onCompanyUpdatePropagateToChats] Data missing for company ${companyId}, cannot compare. Exiting.`);
        return null;
    }

    // We only care about name and avatar changes for companies.
    const oldName = beforeData.companyName || UNKNOWN_PROVIDER_NAME;
    const newName = afterData.companyName || UNKNOWN_PROVIDER_NAME;
    const oldAvatar = beforeData.profilePictureURL || null;
    const newAvatar = afterData.profilePictureURL || null;

    if (oldName === newName && oldAvatar === newAvatar) {
        loggerV2.info(`[onCompanyUpdatePropagateToChats] No relevant profile changes for company ${companyId}. Exiting.`);
        return null;
    }

    loggerV2.info(`[onCompanyUpdatePropagateToChats] Company ${companyId} updated. Name: '${oldName}' -> '${newName}', Avatar: '${oldAvatar}' -> '${newAvatar}'. Propagating changes to chats.`);

    const db = getDb();
    const chatsRef = db.collection("chats");
    const querySnapshot = await chatsRef.where("users", "array-contains", companyId).get();

    if (querySnapshot.empty) {
        loggerV2.info(`[onCompanyUpdatePropagateToChats] Company ${companyId} is not in any chats. No updates needed.`);
        return null;
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
    return null;
});