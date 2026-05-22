import type { CSSProperties } from 'react'

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

const GalleryPicture = ({ image, sizes, loading = 'lazy' }: GalleryPictureProps) => {
  const imageVariants: [ResponsiveImageVariant, ResponsiveImageVariant] = [image.cover, image.full]
  const [small, large] = imageVariants
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
  const showSkeleton = isLoading && items.length === 0
  const showError = Boolean(loadError) && !isLoading && items.length === 0
  const showEmpty = !isLoading && !showError && items.length === 0

  return (
    <Section id="gallery" tone="toned">
      <Container size="wide">
        <div className="stack" style={{ gap: 'var(--space-6)' }}>
          <div className="gallery-grid-heading">
            <div className="stack">
              <span className="eyebrow">Построено нами</span>
              <h2 className="h2">Реализованные проекты</h2>
            </div>
            <p className="gallery-grid-intro">
              Дома, которые уже стоят на своих участках: площадь, место и фотографии без лишней
              витрины.
            </p>
          </div>

          {items.length > 0 ? (
            <div className="built-gallery-grid" aria-label="Галерея построенных объектов">
              {items.map((item, index) => {
                const coverPhoto = item.cover ?? item.photos[0]
                if (!coverPhoto) return null

                return (
                  <article
                    className="built-gallery-card"
                    key={item.id}
                    style={{ '--gallery-index': index } as CSSProperties}
                  >
                    <button
                      className="built-gallery-link"
                      type="button"
                      onClick={() => onOpenGallery(item, getPhotoIndex(item, coverPhoto))}
                      aria-label={`Открыть фотографии объекта ${item.title}`}
                    >
                      <GalleryPicture
                        image={coverPhoto}
                        loading={index < 2 ? 'eager' : 'lazy'}
                        sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc((100vw - 4rem) / 2), min(34vw, 520px)"
                      />
                      <span className="built-gallery-caption">
                        <strong>{getProjectArea(item.title)}</strong>
                        <span>{getProjectLocation(item.location)}</span>
                      </span>
                    </button>
                  </article>
                )
              })}
            </div>
          ) : null}

          {showSkeleton ? (
            <div className="built-gallery-grid built-gallery-grid-loading" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <article
                  className="built-gallery-card"
                  key={index}
                  style={{ '--gallery-index': index } as CSSProperties}
                >
                  <div className="built-gallery-link gallery-skeleton">
                    <div className="built-gallery-caption built-gallery-caption-skeleton">
                      <span />
                      <span />
                    </div>
                  </div>
                </article>
              ))}
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
