import { useState } from 'react'

import Container from '../components/Container'
import Section from '../components/Section'
import type { GalleryImageAsset, GalleryItem, ResponsiveImageVariant } from '../types'
import { buildResponsiveSrcSet } from '../utils/images'

type GallerySectionProps = {
  items: GalleryItem[]
  isLoading?: boolean
  loadError?: string | null
  onOpenGallery: (item: GalleryItem, photoIndex?: number) => void
}

type GalleryPictureProps = {
  image: GalleryImageAsset
  sizes: string
  mode: 'feature' | 'support'
  loading?: 'eager' | 'lazy'
}

const AREA_PATTERN = /\d+(?:[,.]\d+)?\s*м(?:²|2)/iu

const getProjectArea = (title: string) => {
  const [area] = title.match(AREA_PATTERN) ?? []
  return area ? area.replace(/м2/i, 'м²') : title
}

const getProjectLocation = (location: string) => location || 'Калининградская область'

const getPhotoIndex = (item: GalleryItem, image: GalleryImageAsset) => {
  const index = item.photos.findIndex((photo) => photo.full.jpg.src === image.full.jpg.src)
  return index >= 0 ? index : 0
}

const getImageVariantPair = (
  image: GalleryImageAsset,
  mode: GalleryPictureProps['mode'],
): [ResponsiveImageVariant, ResponsiveImageVariant] => {
  if (mode === 'feature') {
    return [image.cover, image.full]
  }

  return [image.thumb, image.cover]
}

const GalleryPicture = ({ image, sizes, mode, loading = 'lazy' }: GalleryPictureProps) => {
  const [small, large] = getImageVariantPair(image, mode)
  const avifSrcSet = buildResponsiveSrcSet(small.avif, large.avif)

  return (
    <picture>
      {avifSrcSet ? <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} /> : null}
      <source
        type="image/webp"
        srcSet={buildResponsiveSrcSet(small.webp, large.webp)}
        sizes={sizes}
      />
      <img
        src={large.jpg.src}
        srcSet={buildResponsiveSrcSet(small.jpg, large.jpg)}
        sizes={sizes}
        alt={image.alt}
        width={large.jpg.width}
        height={large.jpg.height}
        loading={loading}
        decoding="async"
      />
    </picture>
  )
}

const GallerySection = ({
  items,
  isLoading = false,
  loadError = null,
  onOpenGallery,
}: GallerySectionProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const showSkeleton = isLoading && items.length === 0
  const showError = Boolean(loadError) && !isLoading && items.length === 0
  const showEmpty = !isLoading && !showError && items.length === 0
  const safeActiveIndex = items.length ? Math.min(activeIndex, items.length - 1) : 0
  const activeItem = items[safeActiveIndex]
  const hasMultipleItems = items.length > 1
  const projectArea = activeItem ? getProjectArea(activeItem.title) : ''
  const projectLocation = activeItem ? getProjectLocation(activeItem.location) : ''
  const featurePhoto = activeItem?.cover ?? activeItem?.photos[0]
  const featurePhotoIndex = activeItem && featurePhoto ? getPhotoIndex(activeItem, featurePhoto) : 0

  const handlePreviousProject = () => {
    if (!items.length) return
    setActiveIndex((currentIndex) => {
      const normalizedIndex = Math.min(currentIndex, items.length - 1)
      return (normalizedIndex - 1 + items.length) % items.length
    })
  }

  const handleNextProject = () => {
    if (!items.length) return
    setActiveIndex((currentIndex) => {
      const normalizedIndex = Math.min(currentIndex, items.length - 1)
      return (normalizedIndex + 1) % items.length
    })
  }

  return (
    <Section id="gallery" tone="toned">
      <Container size="wide">
        <div className="stack" style={{ gap: 'var(--space-6)' }}>
          <div className="gallery-carousel-heading">
            <div className="stack">
              <span className="eyebrow">Построено нами</span>
              <h2 className="h2">Реализованные объекты в Калининградской области</h2>
            </div>
            {hasMultipleItems ? (
              <div className="gallery-carousel-controls" aria-label="Навигация по объектам">
                <button
                  className="gallery-carousel-arrow"
                  type="button"
                  onClick={handlePreviousProject}
                  aria-label="Предыдущий объект"
                >
                  ←
                </button>
                <span className="gallery-carousel-count" aria-live="polite">
                  {safeActiveIndex + 1} / {items.length}
                </span>
                <button
                  className="gallery-carousel-arrow"
                  type="button"
                  onClick={handleNextProject}
                  aria-label="Следующий объект"
                >
                  →
                </button>
              </div>
            ) : null}
          </div>

          {activeItem && featurePhoto ? (
            <div
              className="gallery-carousel"
              aria-roledescription="carousel"
              aria-label="Карусель построенных объектов"
            >
              <article className="gallery-carousel-card" key={activeItem.id}>
                <div className="gallery-showcase gallery-showcase-single">
                  <button
                    className="gallery-feature-photo"
                    type="button"
                    onClick={() => onOpenGallery(activeItem, featurePhotoIndex)}
                    aria-label={`Открыть фотографии объекта ${activeItem.title}`}
                  >
                    <GalleryPicture
                      image={featurePhoto}
                      mode="feature"
                      loading="eager"
                      sizes="(max-width: 1024px) calc(100vw - 2.4rem), min(100vw - 5rem, 1220px)"
                    />
                  </button>
                </div>
                <div className="gallery-project-panel">
                  <div className="gallery-project-meta">
                    <div>
                      <span>Площадь</span>
                      <strong>{projectArea}</strong>
                    </div>
                    <div>
                      <span>Локация</span>
                      <strong>{projectLocation}</strong>
                    </div>
                  </div>
                </div>
              </article>
              {hasMultipleItems ? (
                <div className="gallery-carousel-dots" aria-label="Выбрать объект">
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      className="gallery-carousel-dot"
                      type="button"
                      aria-label={`Показать объект ${getProjectArea(item.title)}, ${getProjectLocation(
                        item.location,
                      )}`}
                      aria-current={index === safeActiveIndex ? 'true' : undefined}
                      data-active={index === safeActiveIndex}
                      onClick={() => setActiveIndex(index)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {showSkeleton ? (
            <div className="gallery-carousel gallery-carousel-loading" aria-hidden="true">
              <div className="gallery-carousel-card">
                <div className="gallery-showcase gallery-showcase-single">
                  <div className="gallery-feature-photo gallery-skeleton" />
                </div>
                <div className="gallery-project-panel gallery-skeleton-panel" />
              </div>
            </div>
          ) : null}

          {showError ? (
            <p className="muted">Не удалось загрузить галерею. Обновите страницу.</p>
          ) : null}
          {showEmpty ? <p className="muted">Реализованные объекты появятся здесь.</p> : null}
        </div>
      </Container>
    </Section>
  )
}

export default GallerySection
