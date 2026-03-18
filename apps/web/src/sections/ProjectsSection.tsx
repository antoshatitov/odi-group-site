import Button from '../components/Button'
import Card from '../components/Card'
import Container from '../components/Container'
import Section from '../components/Section'
import type { ProjectFilters } from '../hooks/useProjectFilters'
import type { Project } from '../types'
import { formatArea, formatPrice } from '../utils/format'

type ProjectsSectionProps = {
  filters: ProjectFilters
  onFiltersChange: (filters: ProjectFilters) => void
  projects: Project[]
  onOpenProject: (project: Project) => void
}

const ProjectsSection = ({
  filters,
  onFiltersChange,
  projects,
  onOpenProject,
}: ProjectsSectionProps) => {
  return (
    <Section id="projects" tone="toned">
      <Container>
        <div className="project-section">
          <div className="stack">
            <span className="eyebrow">Каталог проектов</span>
            <h2 className="h2">
              Выберите проект, который можно адаптировать под ваш участок
            </h2>
            <p className="muted">
              Фильтруйте проекты по параметрам и откройте детальную информацию с планировками.
            </p>
          </div>
          <div className="filter-bar">
            <label className="field">
              <span>Площадь, от м²</span>
              <input
                className="input"
                type="number"
                min={60}
                name="area"
                autoComplete="off"
                value={filters.area}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    area: event.target.value,
                  })
                }
                placeholder="120"
              />
            </label>
            <label className="field">
              <span>Этажность</span>
              <select
                className="select"
                value={filters.floors}
                name="floors"
                autoComplete="off"
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    floors: event.target.value,
                  })
                }
              >
                <option value="any">Любая</option>
                <option value="1">1 этаж</option>
                <option value="2">2 этажа</option>
              </select>
            </label>
            <label className="field">
              <span>Бюджет, от млн ₽</span>
              <input
                className="input"
                type="number"
                min={4}
                step={0.1}
                name="budget"
                autoComplete="off"
                value={filters.budget}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    budget: event.target.value,
                  })
                }
                placeholder="7.0"
              />
            </label>
            <label className="field">
              <span>Спальни, от</span>
              <input
                className="input"
                type="number"
                min={2}
                name="bedrooms"
                autoComplete="off"
                value={filters.bedrooms}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    bedrooms: event.target.value,
                  })
                }
                placeholder="3"
              />
            </label>
          </div>
          <div className="project-grid">
            {projects.map((project) => (
              <Card key={project.id} className="project-card">
                <img
                  src={project.image.src}
                  alt={project.image.alt}
                  loading="lazy"
                  width={1200}
                  height={800}
                />
                <div className="stack" style={{ gap: 'var(--space-2)' }}>
                  <strong>{project.name}</strong>
                  <span className="muted">{project.highlight}</span>
                  <div className="project-meta">
                    <span className="tag">{formatArea(project.area)}</span>
                    <span className="tag">{project.floors} этажа</span>
                    <span className="tag">{project.bedrooms} спальни</span>
                  </div>
                  <div className="project-specs">
                    <span>Материал: {project.material}</span>
                    <span>Срок: {project.duration}</span>
                    <span>Стоимость: {formatPrice(project.priceFrom)}</span>
                    <span>Комнат: {project.rooms}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => onOpenProject(project)}>
                  Подробнее о проекте
                </Button>
              </Card>
            ))}
          </div>
          {projects.length === 0 && (
            <Card>
              <p className="muted">
                Нет проектов с выбранными параметрами. Попробуйте изменить фильтры.
              </p>
            </Card>
          )}
        </div>
      </Container>
    </Section>
  )
}

export default ProjectsSection
