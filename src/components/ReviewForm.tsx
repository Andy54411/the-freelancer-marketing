'use client'

import { useState } from 'react'
import { getAuth } from 'firebase/auth'
// import { useRouter } from 'next/navigation' // Marked as unused

interface Props {
  anbieterId: string
  auftragId: string
  kategorie: string
  unterkategorie: string
}

export default function ReviewForm({ anbieterId, auftragId, kategorie, unterkategorie }: Props) {
  const [sterne, setSterne] = useState(5)
  const [kommentar, setKommentar] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // const router = useRouter() // Marked as unused

  const handleSubmit = async () => {
    setLoading(true)
    setSuccess(false)

    const user = getAuth().currentUser
    if (!user) {
      alert('Bitte zuerst einloggen.')
      return
    }

    const kundeId = user.uid
    const kundeProfilePictureURL = user.photoURL || ''

    const body = {
      anbieterId,
      kundeId,
      auftragId,
      sterne,
      kommentar,
      kundeProfilePictureURL,
      kategorie,
      unterkategorie
    }

    try {
      const res = await fetch('https://us-central1-tilvo-f142f.cloudfunctions.net/submitReview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Fehler beim Absenden')
      setSuccess(true)
      setKommentar(''); // Added semicolon for consistency
    } catch { // _err entfernt
      alert('Bewertung konnte nicht gesendet werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bewertung abgeben</h3>

      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setSterne(n)}
            className={`text-2xl ${n <= sterne ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        placeholder="Dein Kommentar (optional)"
        value={kommentar}
        onChange={(e) => setKommentar(e.target.value)}
        rows={4}
        className="w-full rounded-md border p-3 mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-[#14ad9f] text-white px-6 py-2 rounded-md hover:bg-teal-700 transition"
      >
        {loading ? 'Wird gesendet...' : 'Bewertung senden'}
      </button>

      {success && <p className="text-green-600 mt-3">✔️ Bewertung erfolgreich gesendet</p>}
    </div>
  )
}
