import { db } from '@/firebase/server';
import { CandidateProfileForm } from '@/components/career/CandidateProfileForm';
import { ApplicantProfile } from '@/types/career';

export default async function CareerProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

  // Fetch existing profile
  let initialData: Partial<ApplicantProfile> | undefined = undefined;
  
  if (db) {
    try {
      // Try new collection first
      const profileDoc = await db.collection('candidateProfiles').doc(uid).get();
    if (profileDoc.exists) {
      initialData = profileDoc.data() as Partial<ApplicantProfile>;
    } else {
        // Try legacy path
        const legacyDoc = await db.collection('users').doc(uid).collection('career_profile').doc('main').get();
        if (legacyDoc.exists) {
             initialData = legacyDoc.data() as Partial<ApplicantProfile>;
        } else {
            // Try to pre-fill from user record
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                initialData = {
                    firstName: userData?.firstName || '',
                    lastName: userData?.lastName || '',
                    email: userData?.email || '',
                };
            }
        }
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mein Kandidatenprofil</h1>
        <p className="text-muted-foreground">
          Erstellen Sie Ihr Profil, um sich auf Stellen zu bewerben und von Unternehmen gefunden zu werden.
        </p>
      </div>

      <CandidateProfileForm userId={uid} initialData={initialData} />
    </div>
  );
}
