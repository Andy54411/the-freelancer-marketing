'use client'

import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../../../../firebase/clients'
import { WelcomeBox } from './components/WelcomeBox'
import { BookingOverview } from './components/BookingOverview'
import { ProfileShortcut } from './components/ProfileShortcut'
import { HelpCard } from './components/HelpCard'

// Define a type for your user data to replace 'any'
interface UserDashboardData {
  firstname: string;
  // Add other fields from your user document here
  // Using 'unknown' is safer than 'any' if the structure isn't fully known.
  [key: string]: unknown;
}

export default function UserDashboardPage() {
  const params = useParams() as Record<string, string | string[]> | null
  const uid = Array.isArray(params?.uid) ? params.uid[0] : params?.uid
  const router = useRouter()
  // Use the new interface for better type safety
  const [userData, setUserData] = useState<UserDashboardData | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      if (!uid) {
        // You might want to handle this case, e.g., by redirecting or showing an error
        return
      }
      const docRef = doc(db, 'users', uid)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        // Redirect to a 404 page if the user document doesn't exist
        return router.push('/not-found')
      }
      setUserData(docSnap.data() as UserDashboardData)
    }
    fetchUser()
  }, [uid, router]) // Add 'router' to the dependency array

  if (!userData) {
    return <div className="p-10 text-center">Lade dein persönliches Dashboard...</div>
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <WelcomeBox firstname={userData.firstname} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <BookingOverview />
          <ProfileShortcut />
          <HelpCard />
        </div>
      </div>
    </main>
  )
}