import { z } from 'zod'

export declare const estimatePayloadSchema: z.ZodObject<{
  floors: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>]>
  area: z.ZodNumber
  packageType: z.ZodEnum<['black', 'gray', 'white']>
  name: z.ZodString
  phone: z.ZodString
  consent: z.ZodLiteral<true>
  website: z.ZodOptional<z.ZodString>
  openedAt: z.ZodNumber
  submittedAt: z.ZodNumber
  action: z.ZodOptional<z.ZodString>
  clientSuspected: z.ZodOptional<z.ZodBoolean>
  clientSuspectedReason: z.ZodOptional<z.ZodString>
  captchaToken: z.ZodOptional<z.ZodString>
  source_context: z.ZodOptional<z.ZodString>
  utm_source: z.ZodOptional<z.ZodString>
  utm_medium: z.ZodOptional<z.ZodString>
  utm_campaign: z.ZodOptional<z.ZodString>
  utm_content: z.ZodOptional<z.ZodString>
  utm_term: z.ZodOptional<z.ZodString>
  referrer_domain: z.ZodOptional<z.ZodString>
  landing_page: z.ZodOptional<z.ZodString>
  first_utm_source: z.ZodOptional<z.ZodString>
  first_utm_medium: z.ZodOptional<z.ZodString>
  first_utm_campaign: z.ZodOptional<z.ZodString>
  first_utm_content: z.ZodOptional<z.ZodString>
  first_utm_term: z.ZodOptional<z.ZodString>
  first_referrer_domain: z.ZodOptional<z.ZodString>
  first_landing_page: z.ZodOptional<z.ZodString>
}>

export declare const estimateResponseSchema: z.ZodObject<{
  ok: z.ZodLiteral<true>
  estimate: z.ZodNumber
  formattedEstimate: z.ZodString
}>

export type EstimatePayload = z.infer<typeof estimatePayloadSchema>
export type EstimateResponse = z.infer<typeof estimateResponseSchema>
