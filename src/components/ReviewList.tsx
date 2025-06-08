'use client'

import Image from 'next/image'
import React, { useEffect, useState } from 'react'

interface Review {
  id: string
  kundeId: string
  sterne: number
  kommentar: string
  kundeProfilePictureURL?: string
  erstellungsdatum?: { _seconds: number, _nanoseconds: number } | Date; // More specific type for Firestore Timestamp or Date
}

interface Props {
  anbieterId: string
}

function renderStars(rating: number) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
  return '★'.repeat(fullStars) + (hasHalfStar ? '⭑' : '') + '☆'.repeat(emptyStars)
}

export default function ReviewList({ anbieterId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState<number | null>(null)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(
          `https://us-central1-tilvo-f142f.cloudfunctions.net/getReviewsByProvider?anbieterId=${anbieterId}`
        )

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Serverfehler: ${text}`)
        }

        const data = await res.json()
        setReviews(data)

        if (data.length > 0) {
          const total = data.reduce((sum: number, r: Review) => sum + (r.sterne || 0), 0)
          setAverage(Number((total / data.length).toFixed(1)))
        }
      } catch (err) {
        console.error('Fehler beim Laden der Bewertungen:', err)
      }
    }

    fetchReviews()
  }, [anbieterId])

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-500">Noch keine Bewertungen vorhanden.</p>
  }

  return (
    <div className="mt-10 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Bewertungen</h3>
        {average !== null && (
          <p className="text-sm text-gray-700">
            Durchschnitt: <span className="text-yellow-500">★ {average}</span>
          </p>
        )}
      </div>

      {reviews.map((review) => (
        <div key={review.id} className="bg-white p-4 rounded-lg shadow border space-y-2">
          <div className="flex items-center gap-4">
            <Image
              src={review.kundeProfilePictureURL || '/default-avatar.jpg'}
              alt="Kunde"
              width={40} // Corresponds to w-10 (10 * 4px = 40px)
              height={40} // Corresponds to h-10
              className="w-10 h-10 rounded-full object-cover"
              objectFit="cover"
            />
            <div className="text-yellow-500 text-base font-medium">
              {renderStars(review.sterne)} <span className="text-gray-700">({review.sterne})</span>
            </div>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {review.kommentar || 'Keine Nachricht hinterlassen.'}
          </p>
        </div>
      ))}
    </div>
  )
}
