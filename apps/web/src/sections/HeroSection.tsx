import { useEffect, useRef, useState, type CSSProperties } from 'react'

import Button from '../components/Button'
import ContactIcon from '../components/ContactIcon'
import Container from '../components/Container'
import Section from '../components/Section'
import { heroContactChannels } from '../data/contactChannels'
import type { ContactChannel } from '../data/contactChannels'
import { trackGoal } from '../utils/analytics'
import { resolveHomeSectionHref } from '../utils/navigation'

type ConnectionInfo = {
  saveData?: boolean
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

const contactMenuId = 'hero-contact-menu'
const rollingDigits = Array.from({ length: 10 }, (_, index) => String(index))

type HeroStat = {
  value: string
  label: string
}

const heroStats: HeroStat[] = [
  {
    value: '8+',
    label: 'лет в строительстве',
  },
  {
    value: '6%',
    label: 'ипотека для семей с детьми',
  },
  {
    value: '79+',
    label: 'домов сданы под ключ',
  },
]

const supportsReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const supportsSaveData = () => {
  if (typeof navigator === 'undefined') return false

  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection
  return Boolean(connection?.saveData)
}

const shouldAutoplayHero = () => !supportsReducedMotion() && !supportsSaveData()

const RollingStatValue = ({ value }: { value: string }) => (
  <span className="stat-value" aria-hidden="true">
    {Array.from(value).map((character, index) => {
      const digit = Number(character)
      const isDigit = Number.isInteger(digit)

      if (!isDigit) {
        return (
          <span className="stat-symbol" key={`${character}-${index}`}>
            {character}
          </span>
        )
      }

      return (
        <span
          className="stat-digit"
          key={`${character}-${index}`}
          style={{ '--digit': digit, '--digit-index': index } as CSSProperties}
        >
          <span className="stat-digit-strip">
            {rollingDigits.map((rollingDigit) => (
              <span className="stat-digit-item" key={rollingDigit}>
                {rollingDigit}
              </span>
            ))}
          </span>
        </span>
      )
    })}
  </span>
)

const HeroSection = () => {
  const [allowAutoplay, setAllowAutoplay] = useState(shouldAutoplayHero)
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false)
  const contactMenuRef = useRef<HTMLDivElement | null>(null)

  const handleCallClick = () => {
    trackGoal('hero_cta_call_click', {
      cta_location: 'hero',
      source_context: 'hero_phone',
    })
  }

  const handleContactClick = (item: ContactChannel) => {
    const goalKey = item.label.toLowerCase()

    trackGoal(`hero_cta_${goalKey}_click`, {
      cta_location: 'hero',
      source_context: `hero_${goalKey}`,
    })
    setIsContactMenuOpen(false)
  }

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

  useEffect(() => {
    if (!isContactMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node) || contactMenuRef.current?.contains(target)) return
      setIsContactMenuOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsContactMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isContactMenuOpen])

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
            <p className="lead reveal" data-delay="3">
              Строительная компания «ОДИ» является аккредитованным подрядчиком в ключевых
              банках — ВТБ, Сбербанк, Дом.рф
            </p>
            <div className="hero-actions reveal" data-delay="3">
              <a
                className="btn btn-primary btn-lg"
                href="tel:+79244422800"
                onClick={handleCallClick}
              >
                Позвонить
              </a>
              <div className="hero-contact" ref={contactMenuRef}>
                <Button
                  size="lg"
                  variant="outline"
                  type="button"
                  aria-controls={contactMenuId}
                  aria-expanded={isContactMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsContactMenuOpen((isOpen) => !isOpen)}
                >
                  Написать
                </Button>
                <div
                  aria-hidden={!isContactMenuOpen}
                  className="contact-menu"
                  data-open={isContactMenuOpen}
                  hidden={!isContactMenuOpen}
                  id={contactMenuId}
                  role="menu"
                >
                  {heroContactChannels.map((item) => (
                    <a
                      className="contact-menu-link"
                      href={item.href}
                      key={item.label}
                      onClick={() => handleContactClick(item)}
                      rel={item.isExternal ? 'noreferrer' : undefined}
                      role="menuitem"
                      target={item.isExternal ? '_blank' : undefined}
                    >
                      <ContactIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>
              <a className="btn btn-outline btn-lg" href={resolveHomeSectionHref('#projects')}>
                Смотреть проекты
              </a>
            </div>
            <div className="hero-stats">
              {heroStats.map((stat, index) => (
                <div className="stat-card reveal" data-delay={index + 4} key={stat.label}>
                  <strong aria-label={`${stat.value} ${stat.label}`}>
                    <RollingStatValue value={stat.value} />
                  </strong>
                  <span className="muted">{stat.label}</span>
                </div>
              ))}
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
