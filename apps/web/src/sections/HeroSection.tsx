import { useEffect, useRef, useState } from 'react'

import Button from '../components/Button'
import Container from '../components/Container'
import Section from '../components/Section'
import { SHOW_PROJECTS } from '../config/featureFlags'
import { trackGoal } from '../utils/analytics'
import { resolveHomeSectionHref } from '../utils/navigation'

type ConnectionInfo = {
  saveData?: boolean
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

type ContactIcon = 'telegram' | 'max' | 'vk' | 'whatsapp' | 'email'

type HeroContactItem = {
  label: string
  href: string
  icon: ContactIcon
  goal: string
  sourceContext: string
  isExternal?: boolean
}

const contactMenuId = 'hero-contact-menu'

const heroContactItems: HeroContactItem[] = [
  {
    label: 'Telegram',
    href: 'https://t.me/o781781',
    icon: 'telegram',
    goal: 'hero_cta_telegram_click',
    sourceContext: 'hero_telegram',
    isExternal: true,
  },
  {
    label: 'Max',
    href: 'https://max.ru/join/fdrnM62z2f4uZVGWfSkErLawYek94U1XwY-_BbbZJQU',
    icon: 'max',
    goal: 'hero_cta_max_click',
    sourceContext: 'hero_max',
    isExternal: true,
  },
  {
    label: 'VK',
    href: 'https://vk.com/club237637702',
    icon: 'vk',
    goal: 'hero_cta_vk_click',
    sourceContext: 'hero_vk',
    isExternal: true,
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/79244422800',
    icon: 'whatsapp',
    goal: 'hero_cta_whatsapp_click',
    sourceContext: 'hero_whatsapp',
    isExternal: true,
  },
  {
    label: 'Email',
    href: 'mailto:bon2801@yandex.ru',
    icon: 'email',
    goal: 'hero_cta_email_click',
    sourceContext: 'hero_email',
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

const ContactIconSvg = ({ icon }: { icon: ContactIcon }) => {
  if (icon === 'telegram') {
    return (
      <svg aria-hidden="true" className="contact-menu-icon" focusable="false" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    )
  }

  if (icon === 'whatsapp') {
    return (
      <svg aria-hidden="true" className="contact-menu-icon" focusable="false" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
      </svg>
    )
  }

  if (icon === 'email') {
    return (
      <svg aria-hidden="true" className="contact-menu-icon" focusable="false" viewBox="0 0 24 24">
        <path
          d="M4.25 6.75h15.5v10.5H4.25V6.75Zm.75 1.1 7 5.15 7-5.15"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (icon === 'vk') {
    return (
      <svg aria-hidden="true" className="contact-menu-icon" focusable="false" viewBox="0 0 24 24">
        <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2Zm3.08 14.27h-1.46c-.55 0-.72-.44-1.71-1.43-.86-.83-1.24-.94-1.45-.94-.3 0-.39.08-.39.51v1.31c0 .35-.11.55-1.03.55-1.52 0-3.2-.92-4.39-2.63-1.78-2.5-2.27-4.38-2.27-4.76 0-.21.08-.41.51-.41h1.46c.38 0 .52.17.67.55.73 2.1 1.95 3.95 2.45 3.95.19 0 .27-.09.27-.55v-2.13c-.06-.97-.57-1.05-.57-1.41 0-.17.14-.34.37-.34h2.29c.31 0 .42.17.42.53v2.87c0 .31.14.42.23.42.19 0 .34-.11.69-.46 1.06-1.19 1.82-3.02 1.82-3.02.11-.22.29-.41.67-.41h1.46c.44 0 .54.22.44.52-.18.82-1.91 3.26-1.91 3.26-.16.25-.22.37 0 .65.16.21.69.68 1.04 1.09.65.74 1.15 1.36 1.28 1.79.14.43-.08.65-.89.65Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="contact-menu-icon" focusable="false" viewBox="0 0 24 24">
      <path d="M4 7.2c0-1.44.95-2.45 2.34-2.45.83 0 1.53.38 2.03 1.12L12 11.08l3.63-5.21c.5-.74 1.2-1.12 2.03-1.12C19.05 4.75 20 5.76 20 7.2v9.6h-3.35V10.7l-2.8 4.02h-3.7l-2.8-4.02v6.1H4V7.2Z" />
    </svg>
  )
}

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

  const handleContactClick = (item: HeroContactItem) => {
    trackGoal(item.goal, {
      cta_location: 'hero',
      source_context: item.sourceContext,
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
                  {heroContactItems.map((item) => (
                    <a
                      className="contact-menu-link"
                      href={item.href}
                      key={item.label}
                      onClick={() => handleContactClick(item)}
                      rel={item.isExternal ? 'noreferrer' : undefined}
                      role="menuitem"
                      target={item.isExternal ? '_blank' : undefined}
                    >
                      <ContactIconSvg icon={item.icon} />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>
              {SHOW_PROJECTS && (
                <a className="btn btn-outline btn-lg" href={resolveHomeSectionHref('#projects')}>
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
