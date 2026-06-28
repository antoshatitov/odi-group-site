import { z } from 'zod'

const phonePattern = /^[0-9+()\s-]{7,20}$/

export const estimatePayloadSchema = z.object({
  floors: z.union([z.literal(1), z.literal(2)]),
  area: z.number().min(1).max(10000),
  packageType: z.enum(['black', 'gray', 'white']),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20).regex(phonePattern),
  consent: z.literal(true),
  website: z.string().max(120).optional(),
  openedAt: z.number(),
  submittedAt: z.number(),
  action: z.string().max(40).optional(),
  clientSuspected: z.boolean().optional(),
  clientSuspectedReason: z.string().max(40).optional(),
  captchaToken: z.string().max(200).optional(),
  source_context: z.string().max(120).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(160).optional(),
  utm_content: z.string().max(160).optional(),
  utm_term: z.string().max(160).optional(),
  referrer_domain: z.string().max(255).optional(),
  landing_page: z.string().max(255).optional(),
  first_utm_source: z.string().max(120).optional(),
  first_utm_medium: z.string().max(120).optional(),
  first_utm_campaign: z.string().max(160).optional(),
  first_utm_content: z.string().max(160).optional(),
  first_utm_term: z.string().max(160).optional(),
  first_referrer_domain: z.string().max(255).optional(),
  first_landing_page: z.string().max(255).optional(),
})

export const estimateResponseSchema = z.object({
  ok: z.literal(true),
  estimate: z.number(),
  formattedEstimate: z.string(),
})

