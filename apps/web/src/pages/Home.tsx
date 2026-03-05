import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import Badge from '../components/Badge'
import Card from '../components/Card'
import Container from '../components/Container'
import LeadForm from '../components/LeadForm'
import Modal from '../components/Modal'
import Section from '../components/Section'
import { SHOW_PROJECTS } from '../config/featureFlags'
import { projects } from '../data/projects'
import ContactsSection from '../sections/ContactsSection'
import GallerySection from '../sections/GallerySection'
import HeroSection from '../sections/HeroSection'
import ProjectsSection from '../sections/ProjectsSection'
import ServicesSection from '../sections/ServicesSection'
import type { GalleryItem, Project, ResponsiveImageFormat } from '../types'
import { trackGoal } from '../utils/analytics'
import { formatArea, formatPrice } from '../utils/format'

const services = [
  {
    title: 'Проектирование и адаптация',
    text: 'Создаём проект под ваш участок и бюджет, учитываем инсоляцию, геологию и нормы.',
  },
  {
    title: 'Строительство под ключ',
    text: 'Фундамент, коробка, кровля, инженерные сети и отделка — единый договор и контроль.',
  },
  {
    title: 'Технический надзор',
    text: 'Проводим авторский надзор, фиксируем этапы, даём фотоотчёты и доступ к онлайн-графику.',
  },
  {
    title: 'Подбор материалов',
    text: 'Помогаем выбрать решения по энергоэффективности, шумоизоляции и фасадам.',
  },
  {
    title: 'Инженерные сети',
    text: 'Отопление, водоснабжение, вентиляция и электрика.',
  },
  {
    title: 'Сервис после сдачи',
    text: 'Сопровождение объекта и поддержка по гарантийным вопросам после ввода в эксплуатацию.',
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

const CostCalculator = lazy(() => import('../components/CostCalculator'))

type ProjectFilters = {
  area: string
  floors: string
  budget: string
  bedrooms: string
}

const FILTERS_SYNC_DELAY_MS = 300

const parseNumberParam = (value: string | null) =>
  value && /^[0-9]+([.,][0-9]+)?$/.test(value) ? value.replace(',', '.') : ''

const parseFiltersFromParams = (params: URLSearchParams): ProjectFilters => {
  const floors = params.get('floors')
  return {
    area: parseNumberParam(params.get('area')),
    floors: floors === '1' || floors === '2' ? floors : 'any',
    budget: parseNumberParam(params.get('budget')),
    bedrooms: parseNumberParam(params.get('bedrooms')),
  }
}

const buildSearchParams = (filters: ProjectFilters) => {
  const params = new URLSearchParams()
  if (filters.area) params.set('area', filters.area)
  if (filters.floors !== 'any') params.set('floors', filters.floors)
  if (filters.budget) params.set('budget', filters.budget)
  if (filters.bedrooms) params.set('bedrooms', filters.bedrooms)
  return params
}

const areFiltersEqual = (left: ProjectFilters, right: ProjectFilters) =>
  left.area === right.area &&
  left.floors === right.floors &&
  left.budget === right.budget &&
  left.bedrooms === right.bedrooms

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

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams])
  const [filters, setFilters] = useState<ProjectFilters>(() => urlFilters)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [isGalleryLoading, setIsGalleryLoading] = useState(true)
  const [galleryLoadError, setGalleryLoadError] = useState<string | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [activeGallery, setActiveGallery] = useState<GalleryItem | null>(null)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [isProcessVisible, setIsProcessVisible] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const processTimelineRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    document.title = 'ОДИ — строительство индивидуальных домов в Калининграде'
  }, [])

  useEffect(() => {
    setFilters((current) => (areFiltersEqual(current, urlFilters) ? current : urlFilters))
  }, [urlFilters])

  useEffect(() => {
    if (areFiltersEqual(filters, urlFilters)) return

    const timeoutId = window.setTimeout(() => {
      setSearchParams(buildSearchParams(filters), { replace: true })
    }, FILTERS_SYNC_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [filters, setSearchParams, urlFilters])

  useEffect(() => {
    let mounted = true

    const loadGalleryItems = async () => {
      try {
        const galleryModule = await import('../data/gallery')
        if (!mounted) return
        setGalleryItems(galleryModule.galleryItems)
        setGalleryLoadError(null)
      } catch (error) {
        if (!mounted) return
        setGalleryItems([])
        setGalleryLoadError(error instanceof Error ? error.message : 'Не удалось загрузить галерею')
      } finally {
        if (mounted) {
          setIsGalleryLoading(false)
        }
      }
    }

    loadGalleryItems()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container || container.dataset.mapInitialized === 'true') return

    const loadMap = () => {
      if (!container || container.dataset.mapInitialized === 'true') return
      const script = document.createElement('script')
      script.src = mapScriptSrc
      script.async = true
      script.charset = 'utf-8'
      container.appendChild(script)
      container.dataset.mapInitialized = 'true'
    }

    if (!('IntersectionObserver' in window)) {
      loadMap()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMap()
          observer.disconnect()
        }
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timeline = processTimelineRef.current
    if (!timeline || isProcessVisible) return

    if (!('IntersectionObserver' in window)) {
      setIsProcessVisible(true)
      return
    }

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

  useEffect(() => {
    if (!activeGallery || activeGallery.photos.length === 0) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setActiveGalleryIndex((index) => (index + 1) % activeGallery.photos.length)
      }
      if (event.key === 'ArrowLeft') {
        setActiveGalleryIndex(
          (index) => (index - 1 + activeGallery.photos.length) % activeGallery.photos.length,
        )
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [activeGallery])

  useEffect(() => {
    if (!activeGallery || activeGallery.photos.length < 2) return

    const photosCount = activeGallery.photos.length
    const prevIndex = (activeGalleryIndex - 1 + photosCount) % photosCount
    const nextIndex = (activeGalleryIndex + 1) % photosCount
    const preloadIndexes = Array.from(new Set([prevIndex, nextIndex]))

    for (const index of preloadIndexes) {
      const preloadImage = new Image()
      preloadImage.decoding = 'async'
      preloadImage.src = activeGallery.photos[index].full.webp.src
    }
  }, [activeGallery, activeGalleryIndex])

  useEffect(() => {
    if (!isCalculatorOpen) return
    trackGoal('calculator_open', {
      cta_location: 'hero',
      source_context: 'calculator_modal',
    })
  }, [isCalculatorOpen])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const areaOk = filters.area ? project.area >= Number(filters.area) : true
      const budgetOk = filters.budget ? project.priceFrom >= Number(filters.budget) : true
      const bedroomsOk = filters.bedrooms ? project.bedrooms >= Number(filters.bedrooms) : true
      const floorsOk = filters.floors === 'any' ? true : project.floors === Number(filters.floors)
      return areaOk && budgetOk && bedroomsOk && floorsOk
    })
  }, [filters])

  const openGallery = (item: GalleryItem) => {
    setActiveGallery(item)
    setActiveGalleryIndex(0)
  }

  const handleFiltersChange = (nextFilters: ProjectFilters) => {
    setFilters(nextFilters)
  }

  const activeGalleryPhoto = activeGallery?.photos[activeGalleryIndex]

  const handleGalleryPrev = () => {
    if (!activeGallery || activeGallery.photos.length === 0) return
    setActiveGalleryIndex(
      (index) => (index - 1 + activeGallery.photos.length) % activeGallery.photos.length,
    )
  }

  const handleGalleryNext = () => {
    if (!activeGallery || activeGallery.photos.length === 0) return
    setActiveGalleryIndex((index) => (index + 1) % activeGallery.photos.length)
  }

  return (
    <>
      <HeroSection onOpenCalculator={() => setIsCalculatorOpen(true)} />

      <GallerySection
        items={galleryItems}
        isLoading={isGalleryLoading}
        loadError={galleryLoadError}
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
                За 8 лет мы построили 76 домов и ежегодно строим от 10 проектов — под ключ и без
                суеты для клиента. Наш подход простой: вы выбираете дом и принимаете решения по
                пунктам, а все заботы — от организации работ и материалов до контроля качества и
                сроков — берём на себя. Слаженная команда и отточенные процессы позволяют получить
                ключи от готового дома уже через 3–4 месяца. Вы заказываете — мы делаем идеально. И
                делаем так, чтобы вашим домом хотелось гордиться.
              </p>
              <div className="project-specs">
                <span>Разработка проектов для строительства</span>
                <span>Локальные подрядчики и поставщики</span>
                <span>Контроль качества по чек-листам</span>
                <span>Фото- и видеоотчёты на каждом этапе</span>
              </div>
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

      {SHOW_PROJECTS && (
        <ProjectsSection
          filters={filters}
          onFiltersChange={handleFiltersChange}
          projects={filteredProjects}
          onOpenProject={setActiveProject}
        />
      )}

      <Section id="consultation">
        <Container>
          <div className="contact-grid">
            <Card className="contact-card">
              <span className="eyebrow">Консультация</span>
              <h2 className="h2">Расскажите о вашем будущем доме</h2>
              <p className="muted">
                Мы перезвоним, уточним задачу и предложим сценарий строительства под ваш участок и
                бюджет.
              </p>
              <LeadForm source="consultation" />
            </Card>
            <Card className="contact-card" tone="solid">
              <div className="stack">
                <Badge>Персональный подход</Badge>
                <h3 className="h3">Что обсудим на звонке</h3>
              </div>
              <ul className="stack" style={{ paddingLeft: '1.2rem', margin: 0 }}>
                <li>Параметры участка и геологию.</li>
                <li>Тип дома и желаемые материалы.</li>
                <li>Оценку бюджета и возможные оптимизации.</li>
                <li>Сроки проектирования и строительства.</li>
              </ul>
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
        isOpen={Boolean(activeProject)}
        title={activeProject?.name || ''}
        onClose={() => setActiveProject(null)}
        side={
          activeProject && (
            <div className="stack">
              <span className="eyebrow">Заявка по проекту</span>
              <p className="muted">
                Оставьте контакты — мы подготовим консультацию и расчёт по выбранному проекту.
              </p>
              <LeadForm
                source="project"
                projectId={activeProject.id}
                projectName={activeProject.name}
              />
            </div>
          )
        }
      >
        {activeProject && (
          <div className="stack">
            <p className="muted">{activeProject.description}</p>
            <div className="project-specs">
              <span>Площадь: {formatArea(activeProject.area)}</span>
              <span>Этажность: {activeProject.floors}</span>
              <span>Спальни: {activeProject.bedrooms}</span>
              <span>Комнат: {activeProject.rooms}</span>
              <span>Материал: {activeProject.material}</span>
              <span>Стоимость: {formatPrice(activeProject.priceFrom)}</span>
            </div>
            <div className="stack">
              <strong>Комплектация</strong>
              <div className="project-meta">
                {activeProject.equipment.map((item) => (
                  <span key={item} className="pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="stack">
              <strong>Особенности проекта</strong>
              <div className="project-meta">
                {activeProject.features.map((item) => (
                  <span key={item} className="pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="stack">
              <strong>Галерея</strong>
              <div className="project-grid project-grid-compact">
                {activeProject.gallery.map((image) => (
                  <img
                    key={image.src}
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    width={1200}
                    height={900}
                  />
                ))}
              </div>
            </div>
            <div className="stack">
              <strong>Планировки</strong>
              <div className="project-grid project-grid-compact">
                {activeProject.plans.map((image) => (
                  <img
                    key={image.src}
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    width={1200}
                    height={900}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(activeGallery)}
        title={activeGallery?.title ?? ''}
        onClose={() => setActiveGallery(null)}
        side={
          activeGallery ? (
            <div className="gallery-modal-side">
              <span className="gallery-location">{activeGallery.location}</span>
              <p className="muted">{activeGallery.description}</p>
              <div className="gallery-thumbs">
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
                      {buildSrcSet(image.thumb.avif, image.cover.avif) ? (
                        <source
                          type="image/avif"
                          srcSet={buildSrcSet(image.thumb.avif, image.cover.avif)}
                          sizes="(max-width: 768px) 28vw, 96px"
                        />
                      ) : null}
                      <source
                        type="image/webp"
                        srcSet={buildSrcSet(image.thumb.webp, image.cover.webp)}
                        sizes="(max-width: 768px) 28vw, 96px"
                      />
                      <img
                        src={image.thumb.jpg.src}
                        srcSet={buildSrcSet(image.thumb.jpg, image.cover.jpg)}
                        sizes="(max-width: 768px) 28vw, 96px"
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
          ) : undefined
        }
      >
        {activeGallery && activeGalleryPhoto && (
          <div className="gallery-modal">
            <div className="gallery-main">
              <picture>
                {buildSrcSet(activeGalleryPhoto.cover.avif, activeGalleryPhoto.full.avif) ? (
                  <source
                    type="image/avif"
                    srcSet={buildSrcSet(
                      activeGalleryPhoto.cover.avif,
                      activeGalleryPhoto.full.avif,
                    )}
                    sizes="(max-width: 768px) calc(100vw - 3rem), 34rem"
                  />
                ) : null}
                <source
                  type="image/webp"
                  srcSet={buildSrcSet(activeGalleryPhoto.cover.webp, activeGalleryPhoto.full.webp)}
                  sizes="(max-width: 768px) calc(100vw - 3rem), 34rem"
                />
                <img
                  src={activeGalleryPhoto.full.jpg.src}
                  srcSet={buildSrcSet(activeGalleryPhoto.cover.jpg, activeGalleryPhoto.full.jpg)}
                  sizes="(max-width: 768px) calc(100vw - 3rem), 34rem"
                  alt={activeGalleryPhoto.alt}
                  width={activeGalleryPhoto.full.jpg.width}
                  height={activeGalleryPhoto.full.jpg.height}
                  loading="eager"
                  decoding="async"
                />
              </picture>
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
            </div>
            <div className="gallery-counter">
              {activeGalleryIndex + 1} / {activeGallery.photos.length}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

export default Home
