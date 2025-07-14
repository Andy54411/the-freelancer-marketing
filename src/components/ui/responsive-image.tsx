'use client'

import Image from 'next/image'
import { useState } from 'react'

interface ResponsiveImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  sizes?: string
  style?: React.CSSProperties
  fallbackSrc?: string
}

export default function ResponsiveImage({
  src,
  alt,
  width = 600,
  height = 400,
  className = '',
  priority = false,
  sizes,
  style,
  fallbackSrc = '/images/default-placeholder.jpg'
}: ResponsiveImageProps) {
  const [imageSrc, setImageSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      setImageSrc(fallbackSrc)
    }
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      style={style}
      unoptimized={true}
      onError={handleError}
    />
  )
}
