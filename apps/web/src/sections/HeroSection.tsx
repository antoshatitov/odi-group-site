import { useEffect, useState } from 'react'

import Button from '../components/Button'
import Container from '../components/Container'
import Section from '../components/Section'
import { SHOW_PROJECTS } from '../config/featureFlags'

type HeroSectionProps = {
  onOpenCalculator: () => void
}

type ConnectionInfo = {
  saveData?: boolean
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

const supportsReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const supportsSaveData = () => {
  if (typeof navigator === 'undefined') return false

  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection
  return Boolean(connection?.saveData)
}

const shouldAutoplayHero = () => !supportsReducedMotion() && !supportsSaveData()

const HeroSection = ({ onOpenCalculator }: HeroSectionProps) => {
  const [allowAutoplay, setAllowAutoplay] = useState(shouldAutoplayHero)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection
    const updateAutoplay = () => {
      setAllowAutoplay(!(mediaQuery.matches || Boolean(connection?.saveData)))
    }

    updateAutoplay()

    mediaQuery.addEventListener('change', updateAutoplay)
    connection?.addEventListener?.('change', updateAutoplay)

    return () => {
      mediaQuery.removeEventListener('change', updateAutoplay)
      connection?.removeEventListener?.('change', updateAutoplay)
    }
  }, [])

  return (
    <Section className="hero" id="hero">
      <Container size="wide">
        <div className="hero-grid">
          <div className="hero-content">
            <span className="eyebrow reveal" data-delay="1">
              Калининград и Калининградская область
            </span>
            <h1 className="display-lg reveal" data-delay="2">
              Строим дома, в которых всё продумано до последней детали
            </h1>
            <p className="lead reveal" data-delay="3">
              Проектирование, строительство и инженерия под ключ. Прозрачные сроки, контроль
              качества и сопровождение на каждом этапе.
            </p>
            <div className="hero-actions reveal" data-delay="3">
              <Button size="lg" type="button" onClick={onOpenCalculator}>
                Расчет стоимости
              </Button>
              {SHOW_PROJECTS && (
                <a className="btn btn-outline btn-lg" href="/#projects">
                  Смотреть проекты
                </a>
              )}
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <strong>8 лет</strong>
                <span className="muted">опыта в строительстве</span>
              </div>
              <div className="stat-card">
                <strong>76 домов</strong>
                <span className="muted">сданы под ключ</span>
              </div>
              <div className="stat-card">
                <strong>От 6%</strong>
                <span className="muted">для семей с детьми</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image">
              <video
                autoPlay={allowAutoplay}
                muted
                loop
                playsInline
                preload={allowAutoplay ? 'metadata' : 'none'}
                poster="/images/hero-poster.webp"
                aria-label="Современный дом в Калининградской области"
              >
                <source src="/videos/hero-video.webm" type="video/webm" />
                <source src="/videos/hero-video.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default HeroSection
