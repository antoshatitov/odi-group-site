import Container from '../components/Container'
import Section from '../components/Section'
import type { GalleryItem, ResponsiveImageFormat } from '../types'

type GallerySectionProps = {
  items: GalleryItem[]
  isLoading?: boolean
  loadError?: string | null
  onOpenGallery: (item: GalleryItem) => void
}

const buildSrcSet = (
  small: ResponsiveImageFormat | undefined,
  large: ResponsiveImageFormat | undefined,
) => {
  if (!small) return ''
  if (!large || large.src === small.src) {
    return `${small.src} ${small.width}w`
  }

  return `${small.src} ${small.width}w, ${large.src} ${large.width}w`
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
      <Container>
        <div className="stack" style={{ gap: 'var(--space-6)' }}>
          <div className="stack">
            <span className="eyebrow">Построено нами</span>
            <h2 className="h2">Реализованные объекты в Калининградской области</h2>
          </div>
          <div className="gallery-grid">
            {items.map((item) => (
              <button
                key={item.id}
                className="gallery-card"
                type="button"
                onClick={() => onOpenGallery(item)}
                aria-label={`Открыть галерею проекта ${item.title}`}
              >
                <div className="gallery-media">
                  <picture>
                    {buildSrcSet(item.cover.thumb.avif, item.cover.cover.avif) ? (
                      <source
                        type="image/avif"
                        srcSet={buildSrcSet(item.cover.thumb.avif, item.cover.cover.avif)}
                        sizes="(max-width: 640px) calc(100vw - 2.4rem), (max-width: 1024px) calc((100vw - 4.4rem) / 2), 23rem"
                      />
                    ) : null}
                    <source
                      type="image/webp"
                      srcSet={buildSrcSet(item.cover.thumb.webp, item.cover.cover.webp)}
                      sizes="(max-width: 640px) calc(100vw - 2.4rem), (max-width: 1024px) calc((100vw - 4.4rem) / 2), 23rem"
                    />
                    <img
                      src={item.cover.cover.jpg.src}
                      srcSet={buildSrcSet(item.cover.thumb.jpg, item.cover.cover.jpg)}
                      sizes="(max-width: 640px) calc(100vw - 2.4rem), (max-width: 1024px) calc((100vw - 4.4rem) / 2), 23rem"
                      alt={item.cover.alt}
                      width={item.cover.cover.jpg.width}
                      height={item.cover.cover.jpg.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                  <div className="gallery-overlay">
                    <span>Смотреть фото</span>
                    <span>{item.photos.length} фото</span>
                  </div>
                </div>
                <div className="gallery-body">
                  <span className="gallery-location">{item.location}</span>
                  <h3 className="gallery-title">{item.title}</h3>
                  <p className="gallery-description">{item.description}</p>
                </div>
              </button>
            ))}
            {showSkeleton
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`gallery-skeleton-${index + 1}`}
                    className="gallery-card"
                    aria-hidden="true"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className="gallery-media" />
                    <div className="gallery-body">
                      <span className="gallery-location">Загрузка</span>
                      <h3 className="gallery-title">Подбираем объекты</h3>
                      <p className="gallery-description">Загружаем реализованные проекты.</p>
                    </div>
                  </div>
                ))
              : null}
          </div>
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
