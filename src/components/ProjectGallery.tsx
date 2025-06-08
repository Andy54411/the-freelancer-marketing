"use client"

import { useEffect, useRef, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase/clients"
import { getAuth } from "firebase/auth"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

interface Props {
  userId?: string
}

export default function ProjectGallery({ userId }: Props) {
  const [images, setImages] = useState<string[]>([])
  const [modalImage, setModalImage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const auth = getAuth()
  const uid = userId || auth.currentUser?.uid || ""

  useEffect(() => {
    if (!uid) return

    const fetchImagesFromCompanyProfile = async () => {
      try {
        const docRef = doc(db, "companies", uid)
        const snap = await getDoc(docRef)

        if (snap.exists()) {
          const data = snap.data()
          if (
            Array.isArray(data.projectImages) &&
            data.projectImages.every((i) => typeof i === "string")
          ) {
            setImages(data.projectImages.slice(0, 10))
          } else {
            setImages([])
          }
        }
      } catch (err) {
        console.error("Fehler beim Laden der Projektbilder:", err)
        setImages([])
      }
    }

    fetchImagesFromCompanyProfile()
  }, [uid])

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth / 3
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  if (images.length === 0) return null

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 max-w-xl mx-auto">
        <h3 className="text-sm font-semibold text-[#14ad9f] uppercase tracking-wide text-center mb-4">
          Abgeschlossene Projekte / Meine Arbeiten
        </h3>

        <div className="relative">
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-700 rounded-full shadow p-1 hover:bg-gray-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-[#14ad9f]" />
          </button>

          <div
            ref={scrollRef}
            className="flex overflow-x-auto no-scrollbar gap-4 scroll-smooth max-w-full px-8"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {images.map((url, index) => (
              <div
                key={index}
                className="h-[100px] rounded overflow-hidden shadow-sm flex-shrink-0 cursor-pointer"
                style={{
                  minWidth: "calc((100% - 2rem) / 3)",
                  scrollSnapAlign: "start",
                }}
                onClick={() => setModalImage(url)}
              >
                <Image
                  src={url}
                  alt={`Projekt ${index + 1}`}
                  layout="fill"
                  objectFit="contain"
                  className="rounded"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-700 rounded-full shadow p-1 hover:bg-gray-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-[#14ad9f]" />
          </button>
        </div>
      </div>

      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 flex items-center justify-center z-50 cursor-pointer"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <Image
            src={modalImage}
            alt="Großes Projektbild"
            layout="fill"
            objectFit="contain"
            onClick={(e) => e.stopPropagation()}
            className="!relative !inset-auto max-w-[90vw] max-h-[90vh] rounded shadow-lg"
          />
          <button
            onClick={() => setModalImage(null)}
            className="absolute top-5 right-5 text-white text-3xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-80"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
