import Card from '../components/Card'
import Container from '../components/Container'
import Section from '../components/Section'

export type ServiceIconName =
  | 'draft'
  | 'build'
  | 'supervision'
  | 'materials'
  | 'engineering'
  | 'service'

export type ServiceItem = {
  title: string
  text: string
  icon: ServiceIconName
}

type ServicesSectionProps = {
  services: ServiceItem[]
}

const ServiceIcon = ({ icon }: { icon: ServiceIconName }) => {
  if (icon === 'draft') {
    return (
      <svg aria-hidden="true" className="service-icon" focusable="false" viewBox="0 0 24 24">
        <path d="M4.5 5.5h15v13h-15v-13Z" />
        <path d="M7 16.5h10M7 13h5M7 9.5h10" />
      </svg>
    )
  }

  if (icon === 'build') {
    return (
      <svg aria-hidden="true" className="service-icon" focusable="false" viewBox="0 0 24 24">
        <path d="m3.8 11.4 8.2-6.8 8.2 6.8" />
        <path d="M6.2 10.4v8.1h11.6v-8.1" />
        <path d="M10 18.5v-5h4v5" />
      </svg>
    )
  }

  if (icon === 'supervision') {
    return (
      <svg aria-hidden="true" className="service-icon" focusable="false" viewBox="0 0 24 24">
        <path d="M12 4.5 5.5 7v5.2c0 3.7 2.6 6.2 6.5 7.3 3.9-1.1 6.5-3.6 6.5-7.3V7L12 4.5Z" />
        <path d="m9.2 12.2 1.8 1.8 3.9-4" />
      </svg>
    )
  }

  if (icon === 'materials') {
    return (
      <svg aria-hidden="true" className="service-icon" focusable="false" viewBox="0 0 24 24">
        <path d="M5 8.5 12 5l7 3.5-7 3.5L5 8.5Z" />
        <path d="m5 12 7 3.5 7-3.5" />
        <path d="m5 15.5 7 3.5 7-3.5" />
      </svg>
    )
  }

  if (icon === 'engineering') {
    return (
      <svg aria-hidden="true" className="service-icon" focusable="false" viewBox="0 0 24 24">
        <path d="M7.5 7.2a4.7 4.7 0 0 1 9 2.2c0 2.9-2.5 4.1-3.1 6.1h-2.8c-.6-2-3.1-3.2-3.1-6.1 0-.8.2-1.6.5-2.2Z" />
        <path d="M10.5 18h3M10.9 21h2.2" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="service-icon" focusable="false" viewBox="0 0 24 24">
      <path d="M6 12.5 4.5 11l1.9-3.3 2 .6c.5-.4 1-.7 1.6-.9l.4-2.1h3.8l.4 2.1c.6.2 1.1.5 1.6.9l2-.6 1.9 3.3-1.5 1.5c.1.3.1.7.1 1s0 .7-.1 1l1.5 1.5-1.9 3.3-2-.6c-.5.4-1 .7-1.6.9l-.4 2.1h-3.8l-.4-2.1c-.6-.2-1.1-.5-1.6-.9l-2 .6L4.5 16l1.5-1.5c-.1-.3-.1-.7-.1-1s0-.7.1-1Z" />
      <path d="M12.3 11a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
    </svg>
  )
}

const ServicesSection = ({ services }: ServicesSectionProps) => {
  return (
    <Section id="services" tone="toned">
      <Container>
        <div className="stack" style={{ gap: 'var(--space-6)' }}>
          <div className="stack">
            <span className="eyebrow">Услуги</span>
            <h2 className="h2">Закрываем полный цикл строительства</h2>
          </div>
          <div className="services-grid">
            {services.map((service) => (
              <Card key={service.title} className="service-card">
                <div className="service-card-heading">
                  <ServiceIcon icon={service.icon} />
                  <strong>{service.title}</strong>
                </div>
                <span className="muted service-card-text">{service.text}</span>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default ServicesSection
