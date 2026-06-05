export type JsonLdData = Record<string, unknown>

type JsonLdProps = {
  data: JsonLdData
}

const serializeJsonLd = (data: JsonLdData) => JSON.stringify(data).replace(/</g, '\\u003c')

const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
  />
)

export default JsonLd
