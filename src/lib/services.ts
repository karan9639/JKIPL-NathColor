import { http } from './api'
import { session } from './session'
import { asRows, type Row } from './utils'
import type { KnittingEntry, KnittingJobCardLink } from './knitting'

export interface LoginPayload {
  username: string
  password: string
  deviceID: string
  deviceIP: string
  uuid: string
}

export interface LoginResponse {
  status?: string
  message?: string
  token?: string
  menuoptionslist?: string
}

export interface OrdersPage {
  rows: Row[]
  totalPending: number
  totalMtr: number
  hasMore: boolean
}

export type OrdersMenuKey =
  | 'SearchOrdersPageKey'
  | 'DomesticPendingOrdersPageKey'
  | 'BrandsPendingOrdersPageKey'
  | 'DyeingProgramsPageKey'

export interface StageSubmission {
  endpoint: string
  payload: Record<string, unknown>
}

export interface ImportCounts {
  [key: string]: unknown
}

const username = () => session.getUsername()

export function normalizeSearch(query: string) {
  return query.toUpperCase().split(/\s+/).filter(Boolean).sort().join(' ')
}

export const api = {
  async login(payload: LoginPayload) {
    const { data } = await http.post<LoginResponse>('/loginjasmine', payload)
    return data
  },

  async searchOrders(menuKey: OrdersMenuKey, page: number, search: string): Promise<OrdersPage> {
    const params: Record<string, string | number> = { page, menuKey, username: username() }
    if (search.trim()) params.search = normalizeSearch(search)
    const { data } = await http.get('/searchorders', { params })
    const rows = asRows(data)
    return {
      rows,
      totalPending: Number((data as Row)?.totalPending ?? 0),
      totalMtr: Number((data as Row)?.totalMtr ?? 0),
      hasMore: rows.length > 0,
    }
  },

  async dyeingPrograms() {
    const { data } = await http.get('/searchorders', {
      params: { menuKey: 'DyeingProgramsPageKey', username: username() },
    })
    return asRows(data)
  },

  async updateDyeingProgram(payload: {
    OrderID: unknown
    REQ_DATE: unknown
    LOT_NO: string
    KGS_Issued: number
    LOT_Remarks: string
  }) {
    const { data } = await http.post('/updatedyeingprg', payload)
    return data as Row
  },

  async greigeStock() {
    const { data } = await http.get('/gstock')
    return asRows(data)
  },

  async yarnStock() {
    const { data } = await http.get('/getYarnStock')
    return asRows(data)
  },

  async searchRecipe(query: string) {
    const { data } = await http.get('/search-recipe', {
      params: { search: query, page: 1, page_size: 50 },
    })
    return asRows(data)
  },

  async greigeRequisitionSummary() {
    const { data } = await http.get('/griegereqsummary')
    return asRows(data)
  },

  async greigeIssuedSummary() {
    const { data } = await http.get('/griegeissuedsummary')
    return asRows(data)
  },

  async searchJobCard(jobCardNumber: string) {
    const { data } = await http.get('/searchjobcard', { params: { jobcard_number: jobCardNumber } })
    const rows = asRows(data)
    if (rows.length) return rows[0]
    if (data && typeof data === 'object' && 'JOBCARDNO' in (data as Row)) return data as Row
    return null
  },

  async submitStage({ endpoint, payload }: StageSubmission) {
    const { data } = await http.post(endpoint, { ...payload, username: username() })
    return data as Row
  },

  async productionStages() {
    const { data } = await http.get('/production_stages')
    return asRows(data)
  },

  async tracker() {
    const { data } = await http.get('/vtracker')
    return asRows(data)
  },

  // These endpoints must be added to nath-api. They do not replace /vtracker.
  async knittingPOLines() {
    const { data } = await http.get('/knitting/po-lines')
    return asRows(data)
  },

  async createKnittingEntry(payload: KnittingEntry) {
    const { data } = await http.post('/knitting/entries', { ...payload, username: username() })
    return data as Row
  },

  async linkKnittingJobCard(payload: KnittingJobCardLink) {
    const { data } = await http.post('/knitting/jobcards/link', { ...payload, username: username() })
    return data as Row
  },

  async records() {
    const { data } = await http.get('/vrecords')
    return asRows(data)
  },

  async lud() {
    const { data } = await http.get('/lud')
    return asRows(data)
  },

  async generateQr(value: string) {
    const { data } = await http.post('/generate_qr', { data: value }, { responseType: 'blob' })
    return data as Blob
  },

  async flushCache() {
    const { data } = await http.post('/flush_cache', {})
    return data as Row
  },

  async fabricMappings() {
    const { data } = await http.get('/greigestock')
    return asRows(data)
  },

  async erpGreigeNames() {
    const { data } = await http.get('/greigeslist')
    if (Array.isArray(data) && data.every((v) => typeof v === 'string')) return data as string[]
    return asRows(data)
      .map((r) => String(r.ItemName ?? r.ERP_Name ?? r.FABRICNAME ?? ''))
      .filter(Boolean)
  },

  async saveFabricMapping(FabricName: string, ERP_Name: string) {
    const { data } = await http.post('/greigestock', { FabricName, ERP_Name })
    return data as Row
  },

  async postRows(endpoint: string, rows: Row[], extra: Record<string, unknown> = {}) {
    const { data } = await http.post(endpoint, { ...extra, rows })
    return data as ImportCounts
  },

  async postArray(endpoint: string, rows: Row[]) {
    const { data } = await http.post(endpoint, rows)
    return data as ImportCounts
  },

  async uploadZip(endpoint: string, zipped: Blob, filename: string) {
    const form = new FormData()
    form.append('username', username())
    form.append('file', zipped, filename)
    const { data } = await http.post(endpoint, form)
    return data as ImportCounts
  },
}
