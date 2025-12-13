import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }

    const { applicationId } = await params;
    const body = await request.json();
    
    console.log('Status update request:', { applicationId, body });
    
    const { 
      status, 
      companyId: providedCompanyId, 
      interviewSlots, 
      message, 
      isVideoCall, 
      videoLink,
      meetingType,
      allowCandidateChoice,
      employeeData: modalEmployeeData,
    } = body;

    if (!status) {
      console.log('Status missing in request');
      return NextResponse.json({ error: 'Status required' }, { status: 400 });
    }

    let appDoc = null;
    let appRef = null;
    let companyId = providedCompanyId;

    // 1. Direct lookup if companyId is provided
    if (providedCompanyId) {
      // Try camelCase collection first
      appRef = db
        .collection('companies')
        .doc(providedCompanyId)
        .collection('jobApplications')
        .doc(applicationId);
      appDoc = await appRef.get();

      if (!appDoc.exists) {
        // Try snake_case collection
        appRef = db
          .collection('companies')
          .doc(providedCompanyId)
          .collection('job_applications')
          .doc(applicationId);
        appDoc = await appRef.get();
      }
    }

    // 2. If not found or companyId missing, try to find via document's companyId field
    if (!appDoc || !appDoc.exists) {
      console.log('Searching for application without companyId...');
      
      // Try to get from the application document itself if it has companyId stored
      // We need to search - try common company IDs or use collectionGroup with proper index
      
      // Fallback: Parse applicationId from URL path if it contains company info
      // Or search in a known company (from the request URL context)
      
      // Extract companyId from referer header if available
      const referer = request.headers.get('referer') || '';
      const companyMatch = referer.match(/\/company\/([^\/]+)/);
      if (companyMatch && companyMatch[1]) {
        companyId = companyMatch[1];
        console.log('Extracted companyId from referer:', companyId);
        
        appRef = db
          .collection('companies')
          .doc(companyId)
          .collection('jobApplications')
          .doc(applicationId);
        appDoc = await appRef.get();

        if (!appDoc.exists) {
          appRef = db
            .collection('companies')
            .doc(companyId)
            .collection('job_applications')
            .doc(applicationId);
          appDoc = await appRef.get();
        }
      }
    }

    if (!appDoc || !appDoc.exists) {
      console.log('Application not found for:', { applicationId, companyId });
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appDoc.data();
    const applicantId = appData?.applicantId;
    // Use companyId from document if not already found
    if (!companyId && appData?.companyId) {
      companyId = appData.companyId;
    }

    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (interviewSlots) {
      updateData.interviewSlots = interviewSlots;
      // Optional: Add a flag to trigger email notification cloud function
      updateData.interviewInviteSent = false; 
    }

    if (message) {
      updateData.interviewMessage = message;
    }

    // 🎯 Meeting-Typ-Daten erweitern
    if (typeof isVideoCall === 'boolean') {
      updateData.isVideoCall = isVideoCall;
    }

    if (videoLink) {
      updateData.videoLink = videoLink;
    }

    // 🎯 Neue Meeting-Typ Felder
    if (meetingType) {
      updateData.meetingType = meetingType;
    }

    if (typeof allowCandidateChoice === 'boolean') {
      updateData.allowCandidateChoice = allowCandidateChoice;
    }

    // 1. Update the document we actually found (Source of Truth for this read)
    if (appRef) {
      await appRef.update(updateData).catch(e => console.warn('Failed to update source doc', e));
    }

    // 2. Sync to the other side
    
    // If source was User, sync to Company
    if (appRef && appRef.path.includes('/users/')) {
        if (companyId) {
             const camelRef = db.collection('companies').doc(companyId).collection('jobApplications').doc(applicationId);
             const snakeRef = db.collection('companies').doc(companyId).collection('job_applications').doc(applicationId);
             try {
                await camelRef.update(updateData);
             } catch {
                await snakeRef.update(updateData).catch(e => console.warn('Failed to sync to company snake_case', e));
             }
        }
    }
    
    // If source was Company, sync to User
    else if (appRef && appRef.path.includes('/companies/')) {
        if (applicantId) {
            await db.collection('users').doc(applicantId).collection('job_applications').doc(applicationId)
                .update(updateData).catch(e => console.warn('Failed to sync to user', e));
        }
        
        // Also ensure we try to update the OTHER company collection format if we are migrating
        // (e.g. if we found it in snake_case, try to update camelCase too if it exists, or vice versa? 
        // Actually, let's just stick to updating the source and the user copy for now to avoid confusion)
    }

    // 🎯 Bei Status "accepted" (Eingestellt): Mitarbeiter automatisch anlegen
    if (status === 'accepted' && companyId && appData) {
      try {
        const profile = appData.applicantProfile || {};
        const personalData = appData.personalData || {};
        
        // Hole Job-Titel für Position
        let jobTitle = 'Neue Position';
        if (appData.jobId && db) {
          try {
            const jobDoc = await db.collection('companies').doc(companyId).collection('jobs').doc(appData.jobId).get();
            if (jobDoc.exists) {
              jobTitle = jobDoc.data()?.title || jobTitle;
            }
          } catch (e) {
            console.warn('Could not fetch job title:', e);
          }
        }

        // Mapping von Bewerberdaten zu Mitarbeiterdaten
        // Wenn Daten vom Modal übergeben wurden, diese bevorzugen
        const employeeData = {
          companyId,
          firstName: modalEmployeeData?.firstName || profile.firstName || personalData.firstName || '',
          lastName: modalEmployeeData?.lastName || profile.lastName || personalData.lastName || '',
          email: modalEmployeeData?.email || profile.email || personalData.email || '',
          phone: modalEmployeeData?.phone || profile.phone || personalData.phone || '',
          dateOfBirth: modalEmployeeData?.dateOfBirth || modalEmployeeData?.birthDate || profile.birthDate || personalData.birthDate || '',
          address: {
            street: modalEmployeeData?.street || profile.street || personalData.street || '',
            city: modalEmployeeData?.city || profile.city || personalData.city || '',
            postalCode: modalEmployeeData?.postalCode || profile.zip || personalData.zip || '',
            country: modalEmployeeData?.country || profile.country || personalData.country || 'Deutschland',
          },
          position: modalEmployeeData?.position || jobTitle,
          department: modalEmployeeData?.department || '',
          employmentType: modalEmployeeData?.employmentType 
            ? mapEmploymentTypeFromModal(modalEmployeeData.employmentType)
            : mapEmploymentType(profile.employmentTypes?.[0]),
          contractType: 'PERMANENT' as const,
          startDate: modalEmployeeData?.startDate || appData.earliestStartDate || new Date().toISOString().split('T')[0],
          grossSalary: modalEmployeeData?.grossSalary 
            ? (typeof modalEmployeeData.grossSalary === 'number' ? modalEmployeeData.grossSalary : parseFloat(modalEmployeeData.grossSalary))
            : (profile.salaryExpectation?.amount || appData.salaryExpectation?.amount || 0),
          workingHours: {
            weekly: modalEmployeeData?.workingHoursWeekly || (modalEmployeeData?.workingHours ? parseInt(modalEmployeeData.workingHours) : 40),
            daily: modalEmployeeData?.workingHoursDaily || (modalEmployeeData?.workingHours ? Math.round(parseInt(modalEmployeeData.workingHours) / 5) : 8),
          },
          nationality: modalEmployeeData?.nationality || personalData.nationality || '',
          salutation: modalEmployeeData?.salutation || profile.salutation || personalData.salutation || '',
          // Sozialversicherung & Steuern
          socialSecurityNumber: modalEmployeeData?.socialSecurityNumber || '',
          taxId: modalEmployeeData?.taxId || '',
          healthInsurance: {
            provider: modalEmployeeData?.healthInsuranceProvider || '',
            memberNumber: modalEmployeeData?.healthInsuranceMemberNumber || '',
          },
          bankAccount: {
            iban: modalEmployeeData?.bankAccountIban || '',
            bic: modalEmployeeData?.bankAccountBic || '',
            bankName: modalEmployeeData?.bankAccountName || '',
          },
          socialSecurity: {
            employerContribution: 0,
            employeeContribution: 0,
          },
          additionalCosts: {
            healthInsurance: 0,
            benefits: 0,
            training: 0,
            equipment: 0,
          },
          // Qualifikationen übernehmen (aus Modal oder aus Profil)
          education: (modalEmployeeData?.education || profile.education || []).map((edu: any) => ({
            degree: edu.degree || '',
            institution: edu.institution || '',
            location: edu.location || '',
            startDate: edu.startDate || '',
            endDate: edu.endDate || '',
            graduationYear: edu.endDate?.split('-')[0] || '',
            certificateUrl: edu.certificateUrl || '',
          })),
          experience: (modalEmployeeData?.experience || profile.experience || []).map((exp: any) => ({
            title: exp.title || '',
            company: exp.company || '',
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            description: exp.description || '',
            certificateUrl: exp.certificateUrl || '',
          })),
          certifications: (modalEmployeeData?.qualifications || profile.qualifications || []).map((qual: any) => ({
            name: qual.name || '',
            issuingOrganization: qual.issuer || '',
            issueDate: qual.date || '',
            certificateUrl: qual.certificateUrl || '',
          })),
          languages: (modalEmployeeData?.languages || profile.languages || []).map((lang: any) => ({
            language: lang.language || '',
            level: mapLanguageLevel(lang.level),
          })),
          skills: modalEmployeeData?.skills || profile.skills || [],
          // Dokumente übernehmen (aus Modal oder aus Profil)
          documents: modalEmployeeData?.documents 
            ? modalEmployeeData.documents.map((doc: any) => ({
                name: doc.name || '',
                url: doc.url || '',
                type: doc.type || 'OTHER',
                uploadedAt: new Date().toISOString(),
              }))
            : buildDocumentsList(profile, appData.attachments || []),
          // Recruiting-Referenz
          recruitingApplicationId: applicationId,
          recruitingApplicantId: applicantId,
          avatar: modalEmployeeData?.avatar || profile.profilePictureUrl || '',
          status: 'ACTIVE' as const,
          isActive: true,
          notes: modalEmployeeData?.notes || `Eingestellt über Recruiting am ${new Date().toLocaleDateString('de-DE')}. Bewerbungs-ID: ${applicationId}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Mitarbeiter in Firestore anlegen
        const employeeRef = await db!
          .collection('companies')
          .doc(companyId)
          .collection('employees')
          .add(employeeData);

        // Update Application mit Employee-Referenz
        if (appRef) {
          await appRef.update({
            employeeId: employeeRef.id,
            hiredAt: new Date().toISOString(),
          }).catch(e => console.warn('Failed to update application with employeeId', e));
        }

        console.log(`Employee created from application: ${employeeRef.id}`);
      } catch (employeeError) {
        console.error('Error creating employee from application:', employeeError);
        // Wir geben trotzdem success zurück, da der Status-Update erfolgreich war
        // Der Mitarbeiter kann manuell angelegt werden
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper: Map Employment Type from Application to Employee format
function mapEmploymentType(type?: string): 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN' {
  if (!type) return 'FULL_TIME';
  
  const typeMap: Record<string, 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN'> = {
    'vollzeit': 'FULL_TIME',
    'full_time': 'FULL_TIME',
    'full-time': 'FULL_TIME',
    'teilzeit': 'PART_TIME',
    'part_time': 'PART_TIME',
    'part-time': 'PART_TIME',
    'freelance': 'FREELANCER',
    'freelancer': 'FREELANCER',
    'freiberuflich': 'FREELANCER',
    'praktikum': 'INTERN',
    'intern': 'INTERN',
    'internship': 'INTERN',
  };
  
  return typeMap[type.toLowerCase()] || 'FULL_TIME';
}

// Helper: Map Employment Type from Modal dropdown to Employee format
function mapEmploymentTypeFromModal(type?: string): 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN' {
  if (!type) return 'FULL_TIME';
  
  const typeMap: Record<string, 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN'> = {
    'Vollzeit': 'FULL_TIME',
    'Teilzeit': 'PART_TIME',
    'Minijob': 'PART_TIME',
    'Werkstudent': 'PART_TIME',
    'Praktikum': 'INTERN',
    'Freelancer': 'FREELANCER',
    // Neue Werte vom Modal
    'FULL_TIME': 'FULL_TIME',
    'PART_TIME': 'PART_TIME',
    'INTERN': 'INTERN',
    'FREELANCER': 'FREELANCER',
  };
  
  return typeMap[type] || 'FULL_TIME';
}

// Helper: Map Language Level
function mapLanguageLevel(level?: string): 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE' {
  if (!level) return 'BASIC';
  
  const levelMap: Record<string, 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE'> = {
    'a1': 'BASIC',
    'a2': 'BASIC',
    'b1': 'INTERMEDIATE',
    'b2': 'INTERMEDIATE',
    'c1': 'ADVANCED',
    'c2': 'ADVANCED',
    'muttersprachler': 'NATIVE',
    'muttersprache': 'NATIVE',
    'native': 'NATIVE',
    'grundkenntnisse': 'BASIC',
    'gut': 'INTERMEDIATE',
    'fließend': 'ADVANCED',
    'verhandlungssicher': 'ADVANCED',
  };
  
  return levelMap[level.toLowerCase()] || 'INTERMEDIATE';
}

// Helper: Build Documents List from Profile and Attachments
function buildDocumentsList(
  profile: any, 
  attachments: Array<{ id?: string; name: string; url: string; type?: string }>
): Array<{ name: string; url: string; type: string; uploadedAt: string }> {
  const documents: Array<{ name: string; url: string; type: string; uploadedAt: string }> = [];
  const now = new Date().toISOString();

  // CV
  if (profile.cvUrl) {
    documents.push({
      name: profile.cvName || 'Lebenslauf',
      url: profile.cvUrl,
      type: 'CV',
      uploadedAt: now,
    });
  }

  // Cover Letter
  if (profile.coverLetterUrl) {
    documents.push({
      name: profile.coverLetterName || 'Anschreiben',
      url: profile.coverLetterUrl,
      type: 'COVER_LETTER',
      uploadedAt: now,
    });
  }

  // Profile Picture
  if (profile.profilePictureUrl) {
    documents.push({
      name: 'Profilbild',
      url: profile.profilePictureUrl,
      type: 'PHOTO',
      uploadedAt: now,
    });
  }

  // Experience Certificates
  if (profile.experience) {
    profile.experience.forEach((exp: any, index: number) => {
      if (exp.certificateUrl) {
        documents.push({
          name: exp.fileName || `Arbeitszeugnis ${exp.company || index + 1}`,
          url: exp.certificateUrl,
          type: 'CERTIFICATE',
          uploadedAt: now,
        });
      }
    });
  }

  // Education Certificates
  if (profile.education) {
    profile.education.forEach((edu: any, index: number) => {
      if (edu.certificateUrl) {
        documents.push({
          name: edu.fileName || `Zeugnis ${edu.institution || index + 1}`,
          url: edu.certificateUrl,
          type: 'CERTIFICATE',
          uploadedAt: now,
        });
      }
    });
  }

  // Qualifications/Certifications
  if (profile.qualifications) {
    profile.qualifications.forEach((qual: any, index: number) => {
      if (qual.certificateUrl) {
        documents.push({
          name: qual.fileName || `Zertifikat ${qual.name || index + 1}`,
          url: qual.certificateUrl,
          type: 'QUALIFICATION',
          uploadedAt: now,
        });
      }
    });
  }

  // Additional Attachments
  attachments.forEach((attachment) => {
    // Avoid duplicates
    if (!documents.some(doc => doc.url === attachment.url)) {
      documents.push({
        name: attachment.name,
        url: attachment.url,
        type: attachment.type || 'OTHER',
        uploadedAt: now,
      });
    }
  });

  return documents;
}
