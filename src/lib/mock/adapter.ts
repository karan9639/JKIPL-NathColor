import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import * as data from './data'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function parseBody(cfg: InternalAxiosRequestConfig): Record<string, unknown> {
  if (!cfg.data || cfg.data instanceof FormData) return {}
  if (typeof cfg.data === 'string') {
    try {
      return JSON.parse(cfg.data)
    } catch {
      return {}
    }
  }
  return cfg.data as Record<string, unknown>
}

function respond(cfg: InternalAxiosRequestConfig, body: unknown, status = 200): AxiosResponse {
  if (status >= 400) {
    const err = Object.assign(new Error(`Request failed with status code ${status}`), {
      isAxiosError: true,
      config: cfg,
      response: { data: body, status, statusText: 'Error', headers: {}, config: cfg },
    })
    throw err
  }
  return { data: body, status, statusText: 'OK', headers: {}, config: cfg }
}

function qrSvg(value: string): Blob {
  let seed = 0
  for (const ch of value) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const size = 25
  const cells: string[] = []
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let on: boolean
      if (finder(x, y)) {
        const lx = x >= size - 7 ? x - (size - 7) : x
        const ly = y >= size - 7 ? y - (size - 7) : y
        on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)
      } else {
        seed = (seed * 1103515245 + 12345) >>> 0
        on = (seed >> 16) % 2 === 0
      }
      if (on) cells.push(`<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`)
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 4} ${size + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${cells.join('')}</g></svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

export const mockAdapter: AxiosAdapter = async (cfg) => {
  await delay(250 + Math.random() * 250)
  const url = (cfg.url ?? '').replace(/^\/mock-api/, '')
  const method = (cfg.method ?? 'get').toLowerCase()
  const params = (cfg.params ?? {}) as Record<string, string>
  const body = parseBody(cfg)

  switch (`${method} ${url}`) {
    case 'post /loginjasmine': {
      const user = String(body.username ?? '').toLowerCase()
      if (!user || String(body.password ?? '').length < 2) {
        return respond(cfg, { status: 'failed', message: 'Invalid username or password.' })
      }
      return respond(cfg, { status: 'passed', token: `mock.${user}.${Date.now()}`, menuoptionslist: '', message: 'Login successful' })
    }
    case 'get /searchorders': {
      if (params.menuKey === 'DyeingProgramsPageKey') return respond(cfg, { data: data.dyeingPrograms })
      return respond(cfg, data.searchOrders(params.menuKey, Number(params.page ?? 1), params.search ?? ''))
    }
    case 'post /updatedyeingprg':
      return respond(cfg, { message: 'Dyeing program updated', status: 'success' })
    case 'get /gstock':
      return respond(cfg, data.greigeStock)
    case 'get /getYarnStock':
      return respond(cfg, { data: data.yarnStock })
    case 'get /search-recipe':
      return respond(cfg, { data: data.searchRecipes(params.search ?? '') })
    case 'get /griegereqsummary':
      return respond(cfg, data.greqSummary)
    case 'get /griegeissuedsummary':
      return respond(cfg, data.greigeIssuedSummary)
    case 'get /searchjobcard': {
      const card = data.findJobCard(params.jobcard_number)
      return card ? respond(cfg, card) : respond(cfg, { message: `Job card ${params.jobcard_number} not found` }, 404)
    }
    case 'post /update_dyes_chem':
    case 'post /jet_loading':
    case 'post /rope_opener':
    case 'post /heatsetting':
    case 'post /finishing':
      return respond(cfg, { message: `Job card ${body.jobcardno} updated successfully`, status: 'success' })
    case 'get /production_stages':
      return respond(cfg, data.productionStages)
    case 'get /vtracker':
      return respond(cfg, data.tracker)
    case 'get /vrecords':
      return respond(cfg, data.records)
    case 'get /lud':
      return respond(cfg, data.lud)
    case 'post /generate_qr':
      return respond(cfg, qrSvg(String(body.data ?? '')))
    case 'post /flush_cache':
      return respond(cfg, { message: 'Cache cleared' })
    case 'get /greigestock':
      return respond(cfg, data.fabricMappings)
    case 'get /greigeslist':
      return respond(cfg, data.erpNames)
    case 'post /greigestock':
      return respond(cfg, { message: 'Mapping saved' })
    case 'post /uploadgreq': {
      const rows = (body.rows as unknown[]) ?? []
      return respond(cfg, { status: 'success', success_rows: rows.length, error_rows: [] })
    }
    case 'post /uploadgreigestock': {
      const rows = (body.rows as unknown[]) ?? []
      return respond(cfg, { status: 'success', message: 'Greige stock uploaded', success_rows: rows.length, success_count: rows.length, error_rows: [] })
    }
    case 'post /insertJobCards':
    case 'post /insertDispatch': {
      const rows = (body.rows as unknown[]) ?? []
      const over = Math.floor(rows.length * 0.2)
      return respond(cfg, { fresh_inserted: rows.length - over, over_written: over, ignored_rows: 0 })
    }
    case 'post /insertYarnStock': {
      const rows = (body.rows as unknown[]) ?? []
      return respond(cfg, { rows_inserted: rows.length })
    }
    case 'post /upload-recipe':
      return respond(cfg, { message: 'Recipes uploaded' })
    case 'post /upload_orders':
    case 'post /upload_closed_djc':
      return respond(cfg, { message: 'Upload successful', Overwritten: 42, 'Fresh Written': 118 })
    default:
      return respond(cfg, { message: `Mock endpoint not implemented: ${method.toUpperCase()} ${url}` }, 404)
  }
}
