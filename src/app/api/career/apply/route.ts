import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, companyId, userId, personalData, attachments, message, jobTitle, companyName } =
      body;

    if (!jobId || !companyId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // 1. Check if already applied
    const existingAppQuery = await db
      .collection('users')
      .doc(userId)
      .collection('job_applications')
      .where('jobId', '==', jobId)
      .get();

    if (!existingAppQuery.empty) {
      return NextResponse.json(
        { message: 'Sie haben sich bereits auf diese Stelle beworben.' },
        { status: 400 }
      );
    }

    // 2. Fetch Applicant Profile
    const profileDoc = await db
      .collection('users')
      .doc(userId)
      .collection('candidate_profile')
      .doc('main')
      .get();

    if (!profileDoc.exists) {
      return NextResponse.json(
        { message: 'Bitte erstellen Sie zuerst Ihr Kandidatenprofil.' },
        { status: 400 }
      );
    }
    const applicantProfile = profileDoc.data()!;

    // 3. Create Application
    const applicationData = {
      jobId,
      companyId,
      applicantId: userId,
      applicantProfile, // Snapshot
      personalData,
      attachments,
      message: message || '',
      status: 'pending',
      appliedAt: new Date().toISOString(),
      jobTitle: jobTitle || '',
      companyName: companyName || '',
    };

    // Generate ID
    const applicationId = db
      .collection('users')
      .doc(userId)
      .collection('job_applications')
      .doc().id;

    // 1. User Subcollection (For User Dashboard)
    await db
      .collection('users')
      .doc(userId)
      .collection('job_applications')
      .doc(applicationId)
      .set({
        ...applicationData,
        id: applicationId,
      });

    // 2. Company Subcollection (For Company Dashboard & Architecture Compliance)
    await db
      .collection('companies')
      .doc(companyId)
      .collection('jobApplications')
      .doc(applicationId)
      .set({
        ...applicationData,
        id: applicationId,
      });

    // 4. Send Email via Resend
    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Tasko Career <noreply@taskilo.de>',
          to: 'a.staudinger32@gmail.com',
          subject: `Neue Bewerbung: ${personalData.firstName} ${personalData.lastName} für ${jobTitle}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Neue Bewerbung eingegangen</h1>
              <p>Es ist eine neue Bewerbung für die Stelle <strong>${jobTitle}</strong> bei <strong>${companyName}</strong> eingegangen.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="display: flex; gap: 20px; align-items: flex-start;">
                  ${
                    applicantProfile.profilePictureUrl
                      ? `
                    <div style="flex-shrink: 0;">
                      <img src="${applicantProfile.profilePictureUrl}" alt="Profilbild" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.1);" />
                    </div>
                  `
                      : ''
                  }
                  <div>
                    <h2 style="margin-top: 0; margin-bottom: 10px;">Bewerberdaten</h2>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${personalData.firstName} ${personalData.lastName}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${personalData.email}</p>
                    <p style="margin: 5px 0;"><strong>Telefon:</strong> ${personalData.phone || '-'}</p>
                    <p style="margin: 5px 0;"><strong>Wohnort:</strong> ${personalData.city || '-'}, ${personalData.country || '-'}</p>
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
                <h3>Anhänge (${attachments.length}):</h3>
                <ul>
                  ${attachments
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

              <!-- Online Profile Data -->
              <div style="margin-top: 30px; border-top: 2px solid #e5e7eb; padding-top: 20px;">
                <h2 style="color: #111827; margin-bottom: 20px;">Online-Profil</h2>

                <!-- Experience -->
                ${
                  applicantProfile.experience && applicantProfile.experience.length > 0
                    ? `
                  <div style="margin-bottom: 25px;">
                    <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Berufserfahrung</h3>
                    ${applicantProfile.experience
                      .map(
                        (exp: any) => `
                      <div style="margin-bottom: 15px; padding-left: 10px; border-left: 2px solid #0d9488;">
                        <div style="font-weight: bold; color: #1f2937;">${exp.title}</div>
                        <div style="color: #4b5563; font-size: 0.9em;">${exp.company} • ${exp.location}</div>
                        <div style="color: #6b7280; font-size: 0.8em; margin-bottom: 4px;">
                          ${new Date(exp.startDate).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })} - 
                          ${exp.endDate ? new Date(exp.endDate).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }) : 'Heute'}
                        </div>
                        ${exp.description ? `<div style="color: #4b5563; font-size: 0.9em; white-space: pre-wrap;">${exp.description}</div>` : ''}
                        ${
                          exp.certificateUrl
                            ? `
                          <div style="margin-top: 5px;">
                            <a href="${exp.certificateUrl}" target="_blank" style="color: #0d9488; text-decoration: none; font-size: 0.9em;">
                              📎 ${exp.fileName || 'Zertifikat ansehen'}
                            </a>
                          </div>
                        `
                            : ''
                        }
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                `
                    : ''
                }

                <!-- Education -->
                ${
                  applicantProfile.education && applicantProfile.education.length > 0
                    ? `
                  <div style="margin-bottom: 25px;">
                    <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Bildungsweg</h3>
                    ${applicantProfile.education
                      .map(
                        (edu: any) => `
                      <div style="margin-bottom: 15px; padding-left: 10px; border-left: 2px solid #0d9488;">
                        <div style="font-weight: bold; color: #1f2937;">${edu.degree}</div>
                        <div style="color: #4b5563; font-size: 0.9em;">${edu.institution} • ${edu.location}</div>
                        <div style="color: #6b7280; font-size: 0.8em;">
                          ${new Date(edu.startDate).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })} - 
                          ${edu.endDate ? new Date(edu.endDate).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }) : 'Heute'}
                        </div>
                        ${
                          edu.certificateUrl
                            ? `
                          <div style="margin-top: 5px;">
                            <a href="${edu.certificateUrl}" target="_blank" style="color: #0d9488; text-decoration: none; font-size: 0.9em;">
                              📎 ${edu.fileName || 'Zertifikat ansehen'}
                            </a>
                          </div>
                        `
                            : ''
                        }
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                `
                    : ''
                }

                <!-- Languages -->
                ${
                  applicantProfile.languages && applicantProfile.languages.length > 0
                    ? `
                  <div style="margin-bottom: 25px;">
                    <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Sprachkenntnisse</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                      ${applicantProfile.languages
                        .map(
                          (lang: any) => `
                        <div style="background-color: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-size: 0.9em;">
                          <strong>${lang.language}</strong>: ${lang.level}
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                    : ''
                }

                <!-- Qualifications -->
                ${
                  applicantProfile.qualifications && applicantProfile.qualifications.length > 0
                    ? `
                  <div style="margin-bottom: 25px;">
                    <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Fachkenntnisse & Zertifikate</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                      ${applicantProfile.qualifications
                        .map(
                          (qual: any) => `
                        <div style="background-color: #f3f4f6; padding: 8px 12px; border-radius: 4px; border: 1px solid #e5e7eb;">
                          <div style="font-weight: bold; font-size: 0.9em;">${qual.name}</div>
                          ${qual.issuer ? `<div style="font-size: 0.8em; color: #6b7280;">${qual.issuer}</div>` : ''}
                          ${
                            qual.certificateUrl
                              ? `
                            <div style="margin-top: 4px;">
                              <a href="${qual.certificateUrl}" target="_blank" style="color: #0d9488; text-decoration: none; font-size: 0.8em;">
                                📎 ${qual.fileName || 'Zertifikat ansehen'}
                              </a>
                            </div>
                          `
                              : ''
                          }
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                    : ''
                }
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.8em;">
                <p>Diese E-Mail wurde automatisch von Tasko Career gesendet.</p>
              </div>
            </div>
          `,
        });
        console.log('Application email sent successfully');
      } else {
        console.warn('RESEND_API_KEY missing, skipping email');
      }
    } catch (emailError) {
      console.error('Error sending application email:', emailError);
      // Continue execution, don't fail the request just because email failed
    }

    return NextResponse.json({
      success: true,
      id: applicationId,
      message: 'Application submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
