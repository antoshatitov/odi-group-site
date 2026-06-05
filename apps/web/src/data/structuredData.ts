import type { JsonLdData } from '../components/JsonLd'

const siteUrl = 'https://odi-group.ru'
const siteName = 'ОДИ'
const legalName = 'ООО «ОДИГРУПП»'
const siteDescription =
  'ОДИ строит индивидуальные дома в Калининграде и области: проектирование, строительство, отделка и инженерные сети под ключ.'

const canonicalUrl = (pathname = '/') => {
  if (pathname === '/') return `${siteUrl}/`
  return `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}

const logoUrl = `${siteUrl}/images/logo.png`
const organizationId = `${siteUrl}/#organization`
const localBusinessId = `${siteUrl}/#local-business`
const websiteId = `${siteUrl}/#website`

const sameAs = [
  'https://t.me/o781781',
  'https://max.ru/join/fdrnM62z2f4uZVGWfSkErLawYek94U1XwY-_BbbZJQU',
  'https://vk.com/club237637702',
]

const address = {
  '@type': 'PostalAddress',
  streetAddress: 'ул. Третьяковская 2, офис 209',
  addressLocality: 'Калининград',
  addressCountry: 'RU',
}

const identifiers = [
  {
    '@type': 'PropertyValue',
    name: 'ИНН',
    value: '2016007291',
  },
  {
    '@type': 'PropertyValue',
    name: 'ОГРН',
    value: '1232000006754',
  },
]

const contactPoint = {
  '@type': 'ContactPoint',
  telephone: '+79244422800',
  contactType: 'customer service',
  areaServed: 'RU-KGD',
  availableLanguage: ['ru'],
}

const organizationNode = {
  '@type': 'Organization',
  '@id': organizationId,
  name: siteName,
  legalName,
  url: `${siteUrl}/`,
  logo: {
    '@type': 'ImageObject',
    url: logoUrl,
  },
  image: logoUrl,
  telephone: '+79244422800',
  email: 'bon2801@yandex.ru',
  taxID: '2016007291',
  identifier: identifiers,
  sameAs,
  contactPoint,
}

const localBusinessNode = {
  '@type': 'HomeAndConstructionBusiness',
  '@id': localBusinessId,
  name: siteName,
  legalName,
  url: `${siteUrl}/`,
  logo: logoUrl,
  image: logoUrl,
  telephone: '+79244422800',
  email: 'bon2801@yandex.ru',
  address,
  openingHours: 'Mo-Sa 09:00-19:00',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '19:00',
    },
  ],
  areaServed: [
    {
      '@type': 'City',
      name: 'Калининград',
    },
    {
      '@type': 'AdministrativeArea',
      name: 'Калининградская область',
    },
  ],
  identifier: identifiers,
  sameAs,
  parentOrganization: {
    '@id': organizationId,
  },
}

export const homeStructuredData: JsonLdData = {
  '@context': 'https://schema.org',
  '@graph': [
    organizationNode,
    localBusinessNode,
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: siteName,
      url: `${siteUrl}/`,
      inLanguage: 'ru-RU',
      publisher: {
        '@id': organizationId,
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${siteUrl}/#webpage`,
      url: `${siteUrl}/`,
      name: 'ОДИ — строительство индивидуальных домов в Калининграде',
      description: siteDescription,
      inLanguage: 'ru-RU',
      isPartOf: {
        '@id': websiteId,
      },
      about: [
        {
          '@id': organizationId,
        },
        {
          '@id': localBusinessId,
        },
      ],
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: `${siteUrl}/images/hero-poster.webp`,
      },
    },
  ],
}

const toIsoDate = (date: string) => {
  const [day, month, year] = date.split('.')
  if (!day || !month || !year) return undefined
  return `${year}-${month}-${day}`
}

export const buildLegalPageStructuredData = (
  pathname: string,
  title: string,
  updated: string,
): JsonLdData => {
  const pageUrl = canonicalUrl(pathname)
  const dateModified = toIsoDate(updated)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${title} — ОДИ`,
        inLanguage: 'ru-RU',
        isPartOf: {
          '@id': websiteId,
        },
        publisher: {
          '@id': organizationId,
        },
        ...(dateModified ? { dateModified } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Главная',
            item: `${siteUrl}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: pageUrl,
          },
        ],
      },
    ],
  }
}
