import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export const onJobApplicationCreated = onDocumentCreated(
    "companies/{companyId}/jobApplications/{applicationId}",
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) {
            logger.error("No data associated with the event");
            return;
        }

        const applicationData = snapshot.data();
        const {
            jobTitle,
            companyName,
            personalData,
            applicantProfile,
            message,
            attachments
        } = applicationData;

        // Construct Email HTML (matching the Web version)
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Neue Bewerbung eingegangen</h1>
              <p>Es ist eine neue Bewerbung für die Stelle <strong>${jobTitle}</strong> bei <strong>${companyName}</strong> eingegangen.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="display: flex; gap: 20px; align-items: flex-start;">
                  ${
                    applicantProfile?.profilePictureUrl
                      ? `
                    <div style="flex-shrink: 0;">
                      <img src="${applicantProfile.profilePictureUrl}" alt="Profilbild" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.1);" />
                    </div>
                  `
                      : ''
                  }
                  <div>
                    <h2 style="margin-top: 0; margin-bottom: 10px;">Bewerberdaten</h2>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${personalData?.firstName} ${personalData?.lastName}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${personalData?.email}</p>
                    <p style="margin: 5px 0;"><strong>Telefon:</strong> ${personalData?.phone || '-'}</p>
                    <p style="margin: 5px 0;"><strong>Wohnort:</strong> ${personalData?.city || '-'}, ${personalData?.country || '-'}</p>
                  </div>
                </div>
              </div>

              ${
                message
                  ? `
              <div style="margin: 20px 0;">
                <h3>Persönliche Nachricht:</h3>
                <p style="white-space: pre-wrap; background-color: #fff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 4px;">${message}</p>
              </div>
              `
                  : ''
              }

              <div style="margin: 20px 0;">
                <h3>Anhänge (${attachments?.length || 0}):</h3>
                <ul>
                  ${(attachments || [])
                    .map(
                      (att: any) => `
                    <li>
                      <a href="${att.url}" target="_blank" style="color: #0d9488; text-decoration: none;">
                        ${att.name}
                      </a> 
                      <span style="color: #6b7280; font-size: 0.9em;">(${att.type})</span>
                    </li>
                  `
                    )
                    .join('')}
                </ul>
              </div>
              
              <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">
                Diese E-Mail wurde automatisch von Taskilo AI gesendet.
              </p>
            </div>
        `;

        try {
            // Send email via 'mail' collection (Trigger Email Extension)
            await db.collection("mail").add({
                to: ['a.staudinger32@gmail.com'], // Hardcoded to match Web version
                message: {
                    subject: `Neue Bewerbung: ${personalData?.firstName} ${personalData?.lastName} für ${jobTitle}`,
                    html: html,
                }
            });
            
            logger.info(`Email notification queued for application ${event.params.applicationId}`);
        } catch (error) {
            logger.error("Error queuing email notification", error);
        }
    }
);
