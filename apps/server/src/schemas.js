export const attributionSchemaProperties = {
  source_context: { type: 'string', maxLength: 120 },
  utm_source: { type: 'string', maxLength: 120 },
  utm_medium: { type: 'string', maxLength: 120 },
  utm_campaign: { type: 'string', maxLength: 160 },
  utm_content: { type: 'string', maxLength: 160 },
  utm_term: { type: 'string', maxLength: 160 },
  referrer_domain: { type: 'string', maxLength: 255 },
  landing_page: { type: 'string', maxLength: 255 },
  first_utm_source: { type: 'string', maxLength: 120 },
  first_utm_medium: { type: 'string', maxLength: 120 },
  first_utm_campaign: { type: 'string', maxLength: 160 },
  first_utm_content: { type: 'string', maxLength: 160 },
  first_utm_term: { type: 'string', maxLength: 160 },
  first_referrer_domain: { type: 'string', maxLength: 255 },
  first_landing_page: { type: 'string', maxLength: 255 },
}

export const leadSchema = {
  body: {
    type: 'object',
    required: ['name', 'phone', 'consent'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 80 },
      phone: {
        type: 'string',
        minLength: 7,
        maxLength: 20,
        pattern: '^[0-9+()\\s-]{7,20}$',
      },
      message: { type: 'string', maxLength: 500 },
      projectId: { type: 'string', maxLength: 40 },
      projectName: { type: 'string', maxLength: 120 },
      source: { type: 'string', maxLength: 80 },
      consent: { type: 'boolean' },
      website: { type: 'string', maxLength: 120 },
      ...attributionSchemaProperties,
    },
  },
}

export const costSchema = {
  body: {
    type: 'object',
    required: ['floors', 'area', 'packageType', 'name', 'phone', 'consent', 'openedAt', 'submittedAt'],
    additionalProperties: false,
    properties: {
      floors: { type: 'integer', enum: [1, 2] },
      area: { type: 'number', minimum: 1, maximum: 10000 },
      packageType: { type: 'string', enum: ['black', 'gray', 'white'] },
      name: { type: 'string', minLength: 2, maxLength: 80 },
      phone: {
        type: 'string',
        minLength: 7,
        maxLength: 20,
        pattern: '^[0-9+()\\s-]{7,20}$',
      },
      consent: { type: 'boolean' },
      website: { type: 'string', maxLength: 120 },
      openedAt: { type: 'number' },
      submittedAt: { type: 'number' },
      action: { type: 'string', maxLength: 40 },
      clientSuspected: { type: 'boolean' },
      clientSuspectedReason: { type: 'string', maxLength: 40 },
      captchaToken: { type: 'string', maxLength: 200 },
      ...attributionSchemaProperties,
    },
  },
}
