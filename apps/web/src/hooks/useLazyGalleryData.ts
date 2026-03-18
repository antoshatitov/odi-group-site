import { useEffect, useState } from 'react'

import type { GalleryItem } from '../types'

export const useLazyGalleryData = () => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [isGalleryLoading, setIsGalleryLoading] = useState(true)
  const [galleryLoadError, setGalleryLoadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadGalleryItems = async () => {
      try {
        const galleryModule = await import('../data/gallery')
        if (!mounted) return
        setGalleryItems(galleryModule.galleryItems)
        setGalleryLoadError(null)
      } catch (error) {
        if (!mounted) return
        setGalleryItems([])
        setGalleryLoadError(error instanceof Error ? error.message : 'Не удалось загрузить галерею')
      } finally {
        if (mounted) {
          setIsGalleryLoading(false)
        }
      }
    }

    void loadGalleryItems()

    return () => {
      mounted = false
    }
  }, [])

  return { galleryItems, isGalleryLoading, galleryLoadError }
}
