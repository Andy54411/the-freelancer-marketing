'use client'

import Link from 'next/link'

export const ProfileShortcut = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold">Profil</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Bearbeite deine Daten oder lade ein neues Profilbild hoch.
      </p>
      <Link href="/settings" className="text-primary font-medium mt-4 inline-block">
        Profil bearbeiten →
      </Link>
    </div>
  )
}
