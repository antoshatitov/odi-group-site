import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

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
const contactMenuCloseDurationMs = 150
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

const statNumberStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'flex-start',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--stat-value-size)',
  fontWeight: 600,
  lineHeight: 0.86,
  color: '#181a19',
  fontVariantNumeric: 'tabular-nums',
}

const statLabelStyle: CSSProperties = {
  maxWidth: '14rem',
  color: 'rgba(18, 25, 23, 0.58)',
  fontSize: '1.18rem',
  fontWeight: 500,
  lineHeight: 1.08,
}

const statValueStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'flex-start',
  height: '0.9em',
  pointerEvents: 'none',
}

const statDigitStyle: CSSProperties = {
  display: 'inline-block',
  width: '0.58em',
  height: '0.9em',
  overflow: 'hidden',
}

const statDigitItemStyle: CSSProperties = {
  display: 'block',
  height: '1em',
  lineHeight: 0.9,
}

const statSymbolStyle: CSSProperties = {
  display: 'inline-block',
  lineHeight: 0.82,
  marginLeft: '0.02em',
}

const supportsReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const supportsSaveData = () => {
  if (typeof navigator === 'undefined') return false

  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection
  return Boolean(connection?.saveData)
}

const shouldAutoplayHero = () => !supportsReducedMotion() && !supportsSaveData()

const getDigitStripStyle = (digit: number, index: number): CSSProperties =>
  ({
    '--digit': digit,
    display: 'block',
    animation: 'stat-digit-roll 3000ms var(--ease-out) both',
    animationDelay: `${520 + index * 140}ms`,
  }) as CSSProperties

const RollingStatValue = ({ value }: { value: string }) => (
  <span aria-hidden="true" style={statValueStyle}>
    {Array.from(value).map((character, index) => {
      const digit = Number(character)
      const isDigit = Number.isInteger(digit)

      if (!isDigit) {
        return (
          <span key={`${character}-${index}`} style={statSymbolStyle}>
            {character}
          </span>
        )
      }

      return (
        <span key={`${character}-${index}`} style={statDigitStyle}>
          <span style={getDigitStripStyle(digit, index)}>
            {rollingDigits.map((rollingDigit) => (
              <span key={rollingDigit} style={statDigitItemStyle}>
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
  const [isContactMenuClosing, setIsContactMenuClosing] = useState(false)
  const contactMenuRef = useRef<HTMLDivElement | null>(null)
  const contactMenuCloseTimeoutRef = useRef<number | null>(null)

  const openContactMenu = useCallback(() => {
    if (contactMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(contactMenuCloseTimeoutRef.current)
      contactMenuCloseTimeoutRef.current = null
    }

    setIsContactMenuClosing(false)
    setIsContactMenuOpen(true)
  }, [])

  const closeContactMenu = useCallback(() => {
    if (!isContactMenuOpen) return

    setIsContactMenuOpen(false)
    setIsContactMenuClosing(true)

    if (contactMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(contactMenuCloseTimeoutRef.current)
    }

    contactMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setIsContactMenuClosing(false)
      contactMenuCloseTimeoutRef.current = null
    }, contactMenuCloseDurationMs)
  }, [isContactMenuOpen])

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
    closeContactMenu()
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
      closeContactMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContactMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeContactMenu, isContactMenuOpen])

  useEffect(() => {
    return () => {
      if (contactMenuCloseTimeoutRef.current !== null) {
        window.clearTimeout(contactMenuCloseTimeoutRef.current)
      }
    }
  }, [])

  const contactMenuClassName = [
    'contact-menu',
    't-dropdown',
    isContactMenuOpen ? 'is-open' : '',
    isContactMenuClosing ? 'is-closing' : '',
  ]
    .filter(Boolean)
    .join(' ')

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
              <div
                className="hero-contact"
                data-closing={isContactMenuClosing}
                data-open={isContactMenuOpen}
                ref={contactMenuRef}
              >
                <Button
                  size="lg"
                  variant="outline"
                  type="button"
                  aria-controls={contactMenuId}
                  aria-expanded={isContactMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    if (isContactMenuOpen) {
                      closeContactMenu()
                      return
                    }

                    openContactMenu()
                  }}
                >
                  Написать
                </Button>
                <div
                  aria-hidden={!isContactMenuOpen}
                  className={contactMenuClassName}
                  data-origin="top-left"
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
                      tabIndex={isContactMenuOpen ? undefined : -1}
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
                <div
                  className="stat-card reveal"
                  key={stat.label}
                  style={{ animationDelay: `${480 + index * 120}ms` }}
                >
                  <strong aria-label={`${stat.value} ${stat.label}`} style={statNumberStyle}>
                    <RollingStatValue value={stat.value} />
                  </strong>
                  <span className="muted" style={statLabelStyle}>
                    {stat.label}
                  </span>
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
