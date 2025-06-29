// /Users/andystaudinger/Tasko/firebase_functions/src/http_migrations.ts
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb, getChatParticipantDetails } from "./helpers"; // Use the new intelligent helper
import { FieldPath, QueryDocumentSnapshot } from "firebase-admin/firestore"; // QueryDocumentSnapshot is needed for pagination

interface UserDetails {
    [key: string]: {
        name: string;
        avatarUrl: string | null;
    };
}

/**
 * This is a one-time use function to backfill userDetails in existing chats.
 * It can be removed after it has been run successfully.
 * To run, deploy it and then visit its URL in your browser.
 */
export const backfillChatUserDetails = onRequest(
    { region: "europe-west1", timeoutSeconds: 540, memory: "1GiB" },
    async (req, res) => {
        logger.info("[backfillChatUserDetails] Starting FORCEFUL migration. This will overwrite userDetails in ALL chats to ensure data is correct.");
        const db = getDb();
        let processedChats = 0;
        let totalChatsChecked = 0;
        const CHAT_PAGE_SIZE = 500; // Process 500 chats at a time to stay within memory limits
        let lastVisibleDoc: QueryDocumentSnapshot | null = null;

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                logger.info(`Processing next page of chats... (starting after doc: ${lastVisibleDoc?.id || 'beginning'})`);

                // --- Step 1: Fetch a page of chats ---
                let query = db.collection("chats").orderBy(FieldPath.documentId()).limit(CHAT_PAGE_SIZE);
                if (lastVisibleDoc) {
                    query = query.startAfter(lastVisibleDoc);
                }
                const chatsSnapshot = await query.get();

                if (chatsSnapshot.empty) {
                    logger.info("No more chats found. Ending migration.");
                    break;
                }
                totalChatsChecked += chatsSnapshot.size;
                lastVisibleDoc = chatsSnapshot.docs[chatsSnapshot.docs.length - 1];

                // --- Step 2: Filter chats in this page that need migration ---
                // The previous filter was too lenient and skipped chats with partially incorrect data.
                // We will now process ALL chats in the page to ensure data consistency.
                const chatsToProcess = chatsSnapshot.docs;
                logger.info(`Processing all ${chatsToProcess.length} chats in this page to ensure data is up-to-date.`);

                // --- Step 3: Collect unique user IDs from this page ---
                const userIdsInPage = new Set<string>();
                chatsToProcess.forEach(chatDoc => {
                    const userIds: string[] = chatDoc.data().users;
                    if (userIds?.length > 0) {
                        userIds.forEach(id => userIdsInPage.add(id));
                    }
                });

                // --- Step 4 (Revised): Batch write updates for this page using the intelligent helper ---
                let batch = db.batch();
                let writeCountInBatch = 0;

                for (const chatDoc of chatsToProcess) {
                    const chatData = chatDoc.data();
                    const userIds: string[] = chatData.users;
                    if (!userIds || userIds.length === 0) continue;

                    const userDetails: UserDetails = {};
                    // Use Promise.all to fetch all participant details concurrently for this chat
                    await Promise.all(userIds.map(async (userId) => {
                        userDetails[userId] = await getChatParticipantDetails(db, userId);
                    }));

                    batch.update(chatDoc.ref, { userDetails });
                    writeCountInBatch++;
                    processedChats++;

                    if (writeCountInBatch >= 499) {
                        await batch.commit();
                        logger.info(`Committed a batch of ${writeCountInBatch} chat updates.`);
                        batch = db.batch();
                        writeCountInBatch = 0;
                    }
                }

                if (writeCountInBatch > 0) {
                    await batch.commit();
                    logger.info(`Committed the final batch of ${writeCountInBatch} chat updates for this page.`);
                }
            }

            const message = `Migration complete. Checked ${totalChatsChecked} chats and updated/refreshed ${processedChats} of them.`;
            logger.info(message);
            res.status(200).send(message);

        } catch (error: any) {
            logger.error("Error during chat migration:", error);
            res.status(500).send(`Migration failed: ${error.message}`);
        }
    }
);