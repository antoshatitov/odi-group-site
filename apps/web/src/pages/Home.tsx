import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'

import Badge from '../components/Badge'
import Card from '../components/Card'
import Container from '../components/Container'
import JsonLd from '../components/JsonLd'
import LeadForm from '../components/LeadForm'
import Modal from '../components/Modal'
import Section from '../components/Section'
import { SHOW_SALE_SECTION, buildProjectItems, saleHouseItems } from '../data/showcaseGalleries'
import { homeStructuredData } from '../data/structuredData'
import { useDeferredMapScript } from '../hooks/useDeferredMapScript'
import { useGalleryModalNavigation } from '../hooks/useGalleryModalNavigation'
import { useLazyGalleryData } from '../hooks/useLazyGalleryData'
import ContactsSection from '../sections/ContactsSection'
import GallerySection from '../sections/GallerySection'
import HeroSection from '../sections/HeroSection'
import ServicesSection from '../sections/ServicesSection'
import type { ServiceItem } from '../sections/ServicesSection'
import type { GalleryItem } from '../types'
import { buildResponsiveSrcSet } from '../utils/images'

const services: ServiceItem[] = [
  {
    title: 'Проектирование и адаптация',
    text: 'Создаём проект под ваш участок и бюджет, учитываем инсоляцию, геологию и нормы.',
    icon: 'draft',
  },
  {
    title: 'Строительство под ключ',
    text: 'Фундамент, коробка, кровля, инженерные сети и отделка — единый договор и контроль.',
    icon: 'build',
  },
  {
    title: 'Технический надзор',
    text: 'Проводим авторский надзор, фиксируем этапы, даём фотоотчёты и доступ к онлайн-графику.',
    icon: 'supervision',
  },
  {
    title: 'Подбор материалов',
    text: 'Помогаем выбрать решения по энергоэффективности, шумоизоляции и фасадам.',
    icon: 'materials',
  },
  {
    title: 'Инженерные сети',
    text: 'Отопление, водоснабжение, вентиляция и электрика.',
    icon: 'engineering',
  },
  {
    title: 'Сервис после сдачи',
    text: 'Сопровождение объекта и поддержка по гарантийным вопросам после ввода в эксплуатацию.',
    icon: 'service',
  },
]

const steps = [
  {
    title: 'Заявка и встреча',
    text: 'Проводим консультацию, анализируем участок и собираем чёткое техническое задание.',
    result: 'Персональный план старта и понятные вводные по бюджету',
  },
  {
    title: 'Проект и смета',
    text: 'Подбираем планировку, материалы и готовим смету с вариантами оптимизации.',
    result: 'Проект и прозрачная экономика без скрытых работ',
  },
  {
    title: 'Договор и график',
    text: 'Фиксируем цену, этапы работ и ответственность сторон в договоре.',
    result: 'Стоимость и календарь работ юридически закреплены',
  },
  {
    title: 'Строительство',
    text: 'Строим по графику и отправляем фото- и видеоотчёты после ключевых работ.',
    result: 'Вы видите прогресс в реальном времени и контролируете качество',
  },
  {
    title: 'Инженерные системы',
    text: 'Монтируем и тестируем отопление, водоснабжение, вентиляцию и электрику.',
    result: 'Все системы проверены и готовы к безопасной эксплуатации',
  },
  {
    title: 'Сдача и сервис',
    text: 'Передаём дом, комплект документов и подключаем гарантийное сопровождение.',
    result: 'Вы заезжаете в готовый дом и остаётесь с поддержкой команды',
  },
]

const mapScriptSrc =
  'https://api-maps.yandex.ru/services/constructor/1.0/js/?um=constructor%3A89b804451933550959e37798984c47c98d8ff6a4a68d360d3953ec8b92dcb7ba&width=100%25&height=100%25&lang=ru_RU&scroll=true'

const galleryAreaPattern = /\d+(?:[,.]\d+)?\s*м(?:²|2)/iu
const galleryLightboxSizes = '(max-width: 768px) 1200px, 82vw'
const minGalleryZoom = 1
const maxGalleryZoom = 4
const gallerySwipeThreshold = 48

const getGalleryProjectArea = (title: string) => {
  const [area] = title.match(galleryAreaPattern) ?? []
  return area ? area.replace(/м2/i, 'м²') : title
}

const getGalleryProjectLocation = (location: string) => location || 'Калининградская область'

type GalleryZoomState = {
  scale: number
  x: number
  y: number
}

type GalleryPointerPosition = {
  x: number
  y: number
}

type GalleryGestureState = {
  mode: 'pan' | 'pinch'
  startX: number
  startY: number
  originX: number
  originY: number
  startScale: number
  startDistance: number
}

const defaultGalleryZoom: GalleryZoomState = { scale: 1, x: 0, y: 0 }
const galleryClickMoveThreshold = 8

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getPointerDistance = (first: GalleryPointerPosition, second: GalleryPointerPosition) =>
  Math.hypot(first.x - second.x, first.y - second.y)

const getBoundedGalleryZoom = (
  zoom: GalleryZoomState,
  container: HTMLElement | null,
): GalleryZoomState => {
  const scale = clampValue(zoom.scale, minGalleryZoom, maxGalleryZoom)
  if (scale <= minGalleryZoom) return defaultGalleryZoom
  if (!container) return { scale, x: zoom.x, y: zoom.y }

  const rect = container.getBoundingClientRect()
  const maxX = (rect.width * (scale - 1)) / 2
  const maxY = (rect.height * (scale - 1)) / 2

  return {
    scale,
    x: clampValue(zoom.x, -maxX, maxX),
    y: clampValue(zoom.y, -maxY, maxY),
  }
}

const CostCalculator = lazy(() => import('../components/CostCalculator'))

const Home = () => {
  const { galleryItems, isGalleryLoading, galleryLoadError } = useLazyGalleryData()
  const [activeGallery, setActiveGallery] = useState<GalleryItem | null>(null)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [galleryZoom, setGalleryZoom] = useState<GalleryZoomState>(defaultGalleryZoom)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [isProcessVisible, setIsProcessVisible] = useState(
    () => !('IntersectionObserver' in window),
  )
  const mapContainerRef = useDeferredMapScript(mapScriptSrc)
  const processTimelineRef = useRef<HTMLDivElement | null>(null)
  const galleryZoomStageRef = useRef<HTMLDivElement | null>(null)
  const galleryZoomRef = useRef<GalleryZoomState>(defaultGalleryZoom)
  const galleryPointersRef = useRef<Map<number, GalleryPointerPosition>>(new Map())
  const galleryGestureRef = useRef<GalleryGestureState | null>(null)
  const galleryClickRef = useRef({ startX: 0, startY: 0, moved: false })

  const { activeGalleryPhoto, handleGalleryPrev, handleGalleryNext } = useGalleryModalNavigation(
    activeGallery,
    activeGalleryIndex,
    setActiveGalleryIndex,
  )

  useEffect(() => {
    document.title = 'ОДИ — строительство индивидуальных домов в Калининграде'
  }, [])

  useEffect(() => {
    galleryZoomRef.current = galleryZoom
  }, [galleryZoom])

  useEffect(() => {
    galleryPointersRef.current.clear()
    galleryGestureRef.current = null
    galleryZoomRef.current = defaultGalleryZoom
    setGalleryZoom(defaultGalleryZoom)
  }, [activeGallery?.id, activeGalleryIndex])

  useEffect(() => {
    const timeline = processTimelineRef.current
    if (!timeline || isProcessVisible) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsProcessVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -12% 0px',
      },
    )

    observer.observe(timeline)

    return () => observer.disconnect()
  }, [isProcessVisible])

  const openGallery = (item: GalleryItem, photoIndex = 0) => {
    const lastPhotoIndex = Math.max(item.photos.length - 1, 0)
    const safePhotoIndex = Math.min(Math.max(photoIndex, 0), lastPhotoIndex)
    setActiveGallery(item)
    setActiveGalleryIndex(safePhotoIndex)
  }

  const commitGalleryZoom = (
    nextZoom: GalleryZoomState,
    container = galleryZoomStageRef.current,
  ) => {
    const boundedZoom = getBoundedGalleryZoom(nextZoom, container)
    galleryZoomRef.current = boundedZoom
    setGalleryZoom(boundedZoom)
  }

  const resetGalleryZoom = () => {
    galleryZoomRef.current = defaultGalleryZoom
    setGalleryZoom(defaultGalleryZoom)
  }

  const handleGalleryZoomIn = () => {
    const currentZoom = galleryZoomRef.current
    commitGalleryZoom({ ...currentZoom, scale: currentZoom.scale + 0.5 })
  }

  const handleGalleryZoomOut = () => {
    const currentZoom = galleryZoomRef.current
    commitGalleryZoom({ ...currentZoom, scale: currentZoom.scale - 0.5 })
  }

  const handleGalleryPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeGallery) return

    event.currentTarget.setPointerCapture(event.pointerId)
    galleryPointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    galleryClickRef.current = { startX: event.clientX, startY: event.clientY, moved: false }

    const points = Array.from(galleryPointersRef.current.values())
    const currentZoom = galleryZoomRef.current

    if (points.length >= 2) {
      galleryGestureRef.current = {
        mode: 'pinch',
        startX: 0,
        startY: 0,
        originX: currentZoom.x,
        originY: currentZoom.y,
        startScale: currentZoom.scale,
        startDistance: getPointerDistance(points[0], points[1]),
      }
      return
    }

    galleryGestureRef.current = {
      mode: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      originX: currentZoom.x,
      originY: currentZoom.y,
      startScale: currentZoom.scale,
      startDistance: 0,
    }
  }

  const handleGalleryPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = galleryPointersRef.current
    if (!pointers.has(event.pointerId)) return

    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    const points = Array.from(pointers.values())
    const gesture = galleryGestureRef.current
    const clickState = galleryClickRef.current
    if (
      !clickState.moved &&
      Math.hypot(event.clientX - clickState.startX, event.clientY - clickState.startY) >
        galleryClickMoveThreshold
    ) {
      clickState.moved = true
    }

    if (points.length >= 2) {
      event.preventDefault()
      const distance = getPointerDistance(points[0], points[1])
      const pinchGesture =
        gesture?.mode === 'pinch'
          ? gesture
          : {
              mode: 'pinch' as const,
              startX: 0,
              startY: 0,
              originX: galleryZoomRef.current.x,
              originY: galleryZoomRef.current.y,
              startScale: galleryZoomRef.current.scale,
              startDistance: distance,
            }

      galleryGestureRef.current = pinchGesture
      const nextScale =
        pinchGesture.startScale * (distance / Math.max(pinchGesture.startDistance, 1))

      commitGalleryZoom(
        {
          scale: nextScale,
          x: pinchGesture.originX,
          y: pinchGesture.originY,
        },
        event.currentTarget,
      )
      return
    }

    if (!gesture || gesture.mode !== 'pan') return

    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY

    if (galleryZoomRef.current.scale <= minGalleryZoom) return

    event.preventDefault()
    commitGalleryZoom(
      {
        scale: galleryZoomRef.current.scale,
        x: gesture.originX + deltaX,
        y: gesture.originY + deltaY,
      },
      event.currentTarget,
    )
  }

  const handleGalleryPointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
    shouldNavigate = true,
  ) => {
    const gesture = galleryGestureRef.current
    const pointers = galleryPointersRef.current
    pointers.delete(event.pointerId)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const clickState = galleryClickRef.current
    if (
      !clickState.moved &&
      Math.hypot(event.clientX - clickState.startX, event.clientY - clickState.startY) >
        galleryClickMoveThreshold
    ) {
      clickState.moved = true
    }

    if (
      shouldNavigate &&
      gesture?.mode === 'pan' &&
      galleryZoomRef.current.scale <= minGalleryZoom
    ) {
      const deltaX = event.clientX - gesture.startX
      const deltaY = event.clientY - gesture.startY
      const isHorizontalSwipe =
        Math.abs(deltaX) >= gallerySwipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.25

      if (isHorizontalSwipe) {
        if (deltaX < 0) {
          handleGalleryNext()
        } else {
          handleGalleryPrev()
        }
      }
    }

    const remainingPoints = Array.from(pointers.values())
    if (remainingPoints.length >= 2) {
      galleryGestureRef.current = {
        mode: 'pinch',
        startX: 0,
        startY: 0,
        originX: galleryZoomRef.current.x,
        originY: galleryZoomRef.current.y,
        startScale: galleryZoomRef.current.scale,
        startDistance: getPointerDistance(remainingPoints[0], remainingPoints[1]),
      }
      return
    }

    if (remainingPoints.length === 1) {
      const [point] = remainingPoints
      galleryGestureRef.current = {
        mode: 'pan',
        startX: point.x,
        startY: point.y,
        originX: galleryZoomRef.current.x,
        originY: galleryZoomRef.current.y,
        startScale: galleryZoomRef.current.scale,
        startDistance: 0,
      }
      return
    }

    galleryGestureRef.current = null
  }

  const handleGalleryWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const currentZoom = galleryZoomRef.current
    const zoomStep = event.deltaY > 0 ? -0.25 : 0.25
    commitGalleryZoom({ ...currentZoom, scale: currentZoom.scale + zoomStep }, event.currentTarget)
  }

  const handleGalleryStageClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (galleryClickRef.current.moved) return

    if (galleryZoomRef.current.scale > minGalleryZoom) {
      resetGalleryZoom()
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    const nextScale = 2

    commitGalleryZoom(
      {
        scale: nextScale,
        x: (rect.width / 2 - clickX) * (nextScale - 1),
        y: (rect.height / 2 - clickY) * (nextScale - 1),
      },
      event.currentTarget,
    )
  }

  return (
    <>
      <JsonLd data={homeStructuredData} />
      <HeroSection />

      <GallerySection
        items={galleryItems}
        isLoading={isGalleryLoading}
        loadError={galleryLoadError}
        onOpenGallery={openGallery}
      />

      {SHOW_SALE_SECTION ? (
        <GallerySection
          id="sale"
          tone="default"
          eyebrow="Сейчас в продаже"
          title="Сейчас в продаже"
          intro="Новые дома, которые уже полностью готовы к продаже либо будут готовы в самое ближайшее время. С полностью готовым пакетом документов, поставленные на учет и подключенные к электросети. Все дома в этом разделе подходят под любой вид ипотеки, в том числе семейную ипотеку 6%."
          emptyMessage="Дома в продаже появятся здесь в ближайшее время."
          ariaLabel="Галерея домов в продаже"
          items={saleHouseItems}
          onOpenGallery={openGallery}
        />
      ) : null}

      <GallerySection
        id="projects"
        tone="toned"
        eyebrow="Проекты"
        title="Проекты"
        intro="Проекты домов, которые мы можем построить на заказ. Каждый проект может быть изменён по требованию заказчика. Также возможно строительство по вашему проекту."
        emptyMessage="Проекты домов появятся здесь в ближайшее время."
        ariaLabel="Галерея проектов домов"
        items={buildProjectItems}
        onOpenGallery={openGallery}
      />

      <Section id="about">
        <Container>
          <div className="about-grid">
            <div className="stack">
              <span className="eyebrow">О компании</span>
              <h2 className="h2">
                ОДИ — строительная компания, которая строит индивидуальные жилые дома в Калининграде
                и области
              </h2>
              <p className="lead">
                С 2018 мы построили более 80 частных домов. Каждый год мы реализуем более 10
                проектов строительства — под ключ и без суеты для клиента. Наш подход простой: вы
                выбираете дом и принимаете решения по пунктам, а все заботы — от организации работ
                и материалов до контроля качества и сроков — берём на себя. Слаженная команда и
                отточенные процессы позволяют получить ключи от готового дома уже через 3–4 месяца.
                Вы заказываете — мы делаем идеально. И делаем так, чтобы вашим домом хотелось
                гордиться.
              </p>
            </div>
            <Card className="about-list">
              <div className="stack">
                <strong>Что вы получаете</strong>
                <div className="divider" />
                <ul className="stack" style={{ paddingLeft: '1.2rem', margin: 0 }}>
                  <li>Понятный график строительства и консультации на всех этапах.</li>
                  <li>Юридически закреплённую стоимость и сроки в договоре.</li>
                  <li>Подбор и проверку инженерных решений под ваш участок.</li>
                  <li>Гарантию и сопровождение после сдачи.</li>
                </ul>
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      <ServicesSection services={services} />

      <Section id="process" tone="toned">
        <Container>
          <div className="process-wrap stack">
            <div className="process-heading stack">
              <span className="eyebrow">Принцип работы</span>
              <h2 className="h2">От заявки до ключей — поэтапно и прозрачно</h2>
              <p className="muted process-lead">
                На каждом этапе заранее фиксируем итог, который вы получаете, — без сюрпризов и
                размытых обещаний.
              </p>
            </div>
            <div
              ref={processTimelineRef}
              className={`process-timeline ${isProcessVisible ? 'process-timeline-visible' : ''}`.trim()}
              role="list"
            >
              {steps.map((step, index) => (
                <Card
                  key={step.title}
                  className={`process-step ${isProcessVisible ? 'process-step-visible' : ''}`.trim()}
                  data-step={index + 1}
                  role="listitem"
                  style={{ transitionDelay: `${120 + index * 80}ms` }}
                >
                  <strong>{step.title}</strong>
                  <span className="muted process-step-text">{step.text}</span>
                  <div className="process-step-result">
                    <span>Что получаете</span>
                    <strong>{step.result}</strong>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section id="consultation">
        <Container>
          <div className="contact-grid contact-grid-single">
            <Card className="contact-card">
              <span className="eyebrow">Консультация</span>
              <h2 className="h2">Расскажите о вашем будущем доме</h2>
              <p className="muted">
                Мы перезвоним, уточним задачу и предложим сценарий строительства под ваш участок и
                бюджет.
              </p>
              <div className="consultation-topics">
                <div className="stack">
                  <Badge>Персональный подход</Badge>
                  <h3 className="h3">Что обсудим на звонке</h3>
                </div>
                <ul className="stack">
                  <li>Параметры участка и геологию.</li>
                  <li>Тип дома и желаемые материалы.</li>
                  <li>Оценку бюджета и возможные оптимизации.</li>
                  <li>Сроки проектирования и строительства.</li>
                </ul>
              </div>
              <LeadForm source="consultation" />
            </Card>
          </div>
        </Container>
      </Section>

      <ContactsSection mapContainerRef={mapContainerRef} />

      <Modal
        isOpen={isCalculatorOpen}
        title="Расчет стоимости строительства"
        onClose={() => setIsCalculatorOpen(false)}
        side={
          <div className="stack">
            <Badge>Персональный расчет</Badge>
            <p className="muted">
              Оценка носит ориентировочный характер. Финальную смету уточняем после консультации и
              анализа участка.
            </p>
            <div className="divider" />
            <div className="stack" style={{ gap: 'var(--space-3)' }}>
              <div>
                <strong>Ответ в течение 2 часов</strong>
                <div className="muted">Свяжемся по телефону и уточним детали проекта.</div>
              </div>
              <div>
                <strong>Безопасно и конфиденциально</strong>
                <div className="muted">Используем данные только для расчета и консультации.</div>
              </div>
              <div>
                <strong>Прозрачная смета</strong>
                <div className="muted">Покажем стоимость по этапам и закрепим в договоре.</div>
              </div>
            </div>
          </div>
        }
      >
        <Suspense fallback={<div className="muted">Загружаем…</div>}>
          <CostCalculator />
        </Suspense>
      </Modal>

      <Modal
        isOpen={Boolean(activeGallery)}
        title="Просмотр фотографий объекта"
        onClose={() => setActiveGallery(null)}
        variant="lightbox"
        showTitle={false}
      >
        {activeGallery && activeGalleryPhoto && (
          <div className="gallery-modal gallery-modal-lightbox">
            <div className="gallery-lightbox-meta">
              <div>
                <span>Площадь</span>
                <strong>{getGalleryProjectArea(activeGallery.title)}</strong>
              </div>
              <div>
                <span>Локация</span>
                <strong>{getGalleryProjectLocation(activeGallery.location)}</strong>
              </div>
            </div>
            <div className="gallery-main gallery-lightbox-main">
              <div
                className="gallery-zoom-stage"
                ref={galleryZoomStageRef}
                data-zoomed={galleryZoom.scale > minGalleryZoom}
                onPointerDown={handleGalleryPointerDown}
                onPointerMove={handleGalleryPointerMove}
                onPointerUp={handleGalleryPointerEnd}
                onPointerCancel={(event) => handleGalleryPointerEnd(event, false)}
                onWheel={handleGalleryWheel}
                onClick={handleGalleryStageClick}
              >
                <picture
                  className="gallery-zoom-picture"
                  style={{
                    transform: `translate3d(${galleryZoom.x}px, ${galleryZoom.y}px, 0) scale(${galleryZoom.scale})`,
                  }}
                >
                  {buildResponsiveSrcSet(
                    activeGalleryPhoto.cover.avif,
                    activeGalleryPhoto.full.avif,
                  ) ? (
                    <source
                      type="image/avif"
                      srcSet={buildResponsiveSrcSet(
                        activeGalleryPhoto.cover.avif,
                        activeGalleryPhoto.full.avif,
                      )}
                      sizes={galleryLightboxSizes}
                    />
                  ) : null}
                  <source
                    type="image/webp"
                    srcSet={buildResponsiveSrcSet(
                      activeGalleryPhoto.cover.webp,
                      activeGalleryPhoto.full.webp,
                    )}
                    sizes={galleryLightboxSizes}
                  />
                  <img
                    src={activeGalleryPhoto.full.jpg.src}
                    srcSet={buildResponsiveSrcSet(
                      activeGalleryPhoto.cover.jpg,
                      activeGalleryPhoto.full.jpg,
                    )}
                    sizes={galleryLightboxSizes}
                    alt={activeGalleryPhoto.alt}
                    width={activeGalleryPhoto.full.jpg.width}
                    height={activeGalleryPhoto.full.jpg.height}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                </picture>
              </div>
              <button
                className="gallery-nav gallery-nav-prev"
                type="button"
                onClick={handleGalleryPrev}
                aria-label="Предыдущее фото"
              >
                ‹
              </button>
              <button
                className="gallery-nav gallery-nav-next"
                type="button"
                onClick={handleGalleryNext}
                aria-label="Следующее фото"
              >
                ›
              </button>
              <div className="gallery-zoom-controls" aria-label="Масштаб изображения">
                <button
                  className="gallery-zoom-button"
                  type="button"
                  onClick={handleGalleryZoomOut}
                  disabled={galleryZoom.scale <= minGalleryZoom}
                  aria-label="Уменьшить изображение"
                >
                  −
                </button>
                <button
                  className="gallery-zoom-button"
                  type="button"
                  onClick={resetGalleryZoom}
                  disabled={galleryZoom.scale <= minGalleryZoom}
                  aria-label="Сбросить масштаб"
                >
                  1×
                </button>
                <button
                  className="gallery-zoom-button"
                  type="button"
                  onClick={handleGalleryZoomIn}
                  disabled={galleryZoom.scale >= maxGalleryZoom}
                  aria-label="Увеличить изображение"
                >
                  +
                </button>
              </div>
            </div>
            <div className="gallery-counter">
              {activeGalleryIndex + 1} / {activeGallery.photos.length}
            </div>
            <div className="gallery-thumbs gallery-lightbox-thumbs">
              {activeGallery.photos.map((image, index) => (
                <button
                  key={image.full.jpg.src}
                  className="gallery-thumb"
                  type="button"
                  onClick={() => setActiveGalleryIndex(index)}
                  data-active={index === activeGalleryIndex}
                  aria-label={`Показать фото ${index + 1}`}
                >
                  <picture>
                    {buildResponsiveSrcSet(image.thumb.avif, image.cover.avif) ? (
                      <source
                        type="image/avif"
                        srcSet={buildResponsiveSrcSet(image.thumb.avif, image.cover.avif)}
                        sizes="7rem"
                      />
                    ) : null}
                    <source
                      type="image/webp"
                      srcSet={buildResponsiveSrcSet(image.thumb.webp, image.cover.webp)}
                      sizes="7rem"
                    />
                    <img
                      src={image.thumb.jpg.src}
                      srcSet={buildResponsiveSrcSet(image.thumb.jpg, image.cover.jpg)}
                      sizes="7rem"
                      alt={image.alt}
                      width={image.thumb.jpg.width}
                      height={image.thumb.jpg.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

export default Home
