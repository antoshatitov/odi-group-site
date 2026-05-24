import { useEffect, useRef, useState } from 'react'

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

const supportsReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const supportsSaveData = () => {
  if (typeof navigator === 'undefined') return false

  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection
  return Boolean(connection?.saveData)
}

const shouldAutoplayHero = () => !supportsReducedMotion() && !supportsSaveData()

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
