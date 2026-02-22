import Container from '../components/Container'
import Section from '../components/Section'
import type { GalleryItem, ResponsiveImageFormat } from '../types'

type GallerySectionProps = {
  items: GalleryItem[]
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
  onOpenGallery,
}: GallerySectionProps) => {
  return (
    <Section id="gallery" tone="toned">
      <Container>
        <div className="stack" style={{ gap: 'var(--space-6)' }}>
          <div className="stack">
            <span className="eyebrow">Построено нами</span>
            <h2 className="h2">
              Реализованные объекты в Калининградской области
            </h2>
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
                        sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      />
                    ) : null}
                    <source
                      type="image/webp"
                      srcSet={buildSrcSet(item.cover.thumb.webp, item.cover.cover.webp)}
                      sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    />
                    <img
                      src={item.cover.cover.jpg.src}
                      srcSet={buildSrcSet(item.cover.thumb.jpg, item.cover.cover.jpg)}
                      sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 33vw"
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
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default GallerySection
