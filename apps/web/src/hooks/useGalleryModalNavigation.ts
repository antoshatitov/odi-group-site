import { useEffect } from 'react'

import type { Dispatch, SetStateAction } from 'react'

import type { GalleryItem } from '../types'

export const useGalleryModalNavigation = (
  activeGallery: GalleryItem | null,
  activeGalleryIndex: number,
  setActiveGalleryIndex: Dispatch<SetStateAction<number>>,
) => {
  const activeGalleryPhoto = activeGallery?.photos[activeGalleryIndex]

  useEffect(() => {
    if (!activeGallery || activeGallery.photos.length === 0) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setActiveGalleryIndex((index) => (index + 1) % activeGallery.photos.length)
      }
      if (event.key === 'ArrowLeft') {
        setActiveGalleryIndex(
          (index) => (index - 1 + activeGallery.photos.length) % activeGallery.photos.length,
        )
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [activeGallery, setActiveGalleryIndex])

  useEffect(() => {
    if (!activeGallery || activeGallery.photos.length < 2) return

    const photosCount = activeGallery.photos.length
    const prevIndex = (activeGalleryIndex - 1 + photosCount) % photosCount
    const nextIndex = (activeGalleryIndex + 1) % photosCount
    const preloadIndexes = Array.from(new Set([prevIndex, nextIndex]))

    for (const index of preloadIndexes) {
      const preloadImage = new Image()
      preloadImage.decoding = 'async'
      preloadImage.src = activeGallery.photos[index].full.webp.src
    }
  }, [activeGallery, activeGalleryIndex])

  const handleGalleryPrev = () => {
    if (!activeGallery || activeGallery.photos.length === 0) return
    setActiveGalleryIndex(
      (index) => (index - 1 + activeGallery.photos.length) % activeGallery.photos.length,
    )
  }

  const handleGalleryNext = () => {
    if (!activeGallery || activeGallery.photos.length === 0) return
    setActiveGalleryIndex((index) => (index + 1) % activeGallery.photos.length)
  }

  return { activeGalleryPhoto, handleGalleryPrev, handleGalleryNext }
}
