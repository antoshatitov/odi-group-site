import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { Project } from '../types'

export type ProjectFilters = {
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

export const useProjectFilters = (sourceProjects: Project[]) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams])
  const [filters, setFilters] = useState<ProjectFilters>(() => urlFilters)

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      setFilters((current) => (areFiltersEqual(current, urlFilters) ? current : urlFilters))
    }, 0)

    return () => window.clearTimeout(syncId)
  }, [urlFilters])

  useEffect(() => {
    if (areFiltersEqual(filters, urlFilters)) return

    const timeoutId = window.setTimeout(() => {
      setSearchParams(buildSearchParams(filters), { replace: true })
    }, FILTERS_SYNC_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [filters, setSearchParams, urlFilters])

  const filteredProjects = useMemo(() => {
    return sourceProjects.filter((project) => {
      const areaOk = filters.area ? project.area >= Number(filters.area) : true
      const budgetOk = filters.budget ? project.priceFrom >= Number(filters.budget) : true
      const bedroomsOk = filters.bedrooms ? project.bedrooms >= Number(filters.bedrooms) : true
      const floorsOk = filters.floors === 'any' ? true : project.floors === Number(filters.floors)
      return areaOk && budgetOk && bedroomsOk && floorsOk
    })
  }, [filters, sourceProjects])

  return { filters, setFilters, filteredProjects }
}
