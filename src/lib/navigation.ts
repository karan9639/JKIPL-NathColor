import {
  Activity,
  BarChart3,
  Beaker,
  Boxes,
  Calculator,
  ClipboardList,
  CloudUpload,
  Droplets,
  FileSpreadsheet,
  FileUp,
  Flame,
  Gauge,
  History,
  LayoutDashboard,
  Layers,
  ListChecks,
  MapPinned,
  Palette,
  QrCode,
  RefreshCw,
  Route,
  Search,
  ShoppingCart,
  Truck,
  Warehouse,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  path: string
  icon: LucideIcon
  description: string
  /** Usernames allowed to access; null means everyone. Mirrors the legacy drawer. */
  allowedUsers: string[] | null
  /** Title used by the legacy menuoptionslist returned at login. */
  legacyTitle?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', path: '/', icon: LayoutDashboard, description: 'Daily activity and shortcuts', allowedUsers: null },
    ],
  },
  {
    label: 'Orders',
    items: [
      { title: 'All Orders', path: '/orders/all', icon: Search, description: 'Search the complete order book', allowedUsers: null, legacyTitle: 'Search Orders' },
      { title: 'Domestic Pending', path: '/orders/domestic', icon: ShoppingCart, description: 'Pending domestic orders', allowedUsers: null, legacyTitle: 'Domestic Pending Ord' },
      { title: 'Brands Pending', path: '/orders/brands', icon: ShoppingCart, description: 'Pending brand orders', allowedUsers: null, legacyTitle: 'Brands Pending Ord' },
      { title: 'Dyeing Programs', path: '/dyeing-programs', icon: Palette, description: 'Greige requisitions and lot issues', allowedUsers: null, legacyTitle: 'Dyeing Programs' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { title: 'Greige Stock', path: '/stock/greige', icon: Boxes, description: 'Current greige fabric stock', allowedUsers: null, legacyTitle: 'Greige Stocks' },
      { title: 'Yarn Stock', path: '/stock/yarn', icon: Warehouse, description: 'Yarn closing stock and movement', allowedUsers: null, legacyTitle: 'Yarn Stocks' },
      { title: 'Recipes', path: '/recipes', icon: Beaker, description: 'Search shade recipes', allowedUsers: ['dilip', 'subhash', 'vb', 'sb', 'rc', 'ap'], legacyTitle: 'Search Recipe' },
    ],
  },
  {
    label: 'Production',
    items: [
      { title: 'Dyes & Chem Issue', path: '/production/dyes-issue', icon: Droplets, description: 'Record dyes and chemicals issue', allowedUsers: null, legacyTitle: 'DyesChem Issue' },
      { title: 'Jet Loading', path: '/production/jet-loading', icon: Waves, description: 'Record jet loading', allowedUsers: null, legacyTitle: 'Jet Loading' },
      { title: 'Rope Opener', path: '/production/rope-opener', icon: Wind, description: 'Record rope opening', allowedUsers: null, legacyTitle: 'Rope Opener' },
      { title: 'Heat Set Loading', path: '/production/heat-setting', icon: Flame, description: 'Record heat setting', allowedUsers: null, legacyTitle: 'Heat Set Loading' },
      { title: 'Stenter Loading', path: '/production/stenter-loading', icon: Layers, description: 'Record finishing on stenter', allowedUsers: null, legacyTitle: 'Stenter Loading' },
      { title: 'Dyeing In Progress', path: '/production/in-progress', icon: Activity, description: 'Job cards across production stages', allowedUsers: null, legacyTitle: 'Dyeing In Progress' },
      { title: 'Tracker', path: '/production/tracker', icon: Route, description: 'Job card lifecycle timestamps', allowedUsers: null, legacyTitle: 'Tracker' },
      { title: 'Records', path: '/production/records', icon: BarChart3, description: 'Daily stage entry volumes', allowedUsers: null, legacyTitle: 'Records' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { title: 'Greige Requisition Summary', path: '/reports/greige-requisition', icon: ClipboardList, description: 'Requisitions by date', allowedUsers: null, legacyTitle: 'Greige Req Summary' },
      { title: 'Greige Issued Summary', path: '/reports/greige-issued', icon: ListChecks, description: 'Lots issued by date', allowedUsers: null, legacyTitle: 'LOTSIssued Summary' },
      { title: 'Last Update (LUD)', path: '/reports/lud', icon: History, description: 'When each data source was last updated', allowedUsers: null, legacyTitle: 'LUD' },
    ],
  },
  {
    label: 'Imports',
    items: [
      { title: 'Dyeing Programs', path: '/imports/dyeing-programs', icon: FileUp, description: 'Paste greige requisitions from Excel', allowedUsers: ['dilip', 'ap'] },
      { title: 'Job Cards Opening', path: '/imports/job-cards-opening', icon: FileUp, description: 'ERP job card HTML export', allowedUsers: ['ankush', 'bharat', 'sunil', 'shubham', 'ap'] },
      { title: 'Job Cards Closing', path: '/imports/job-cards-closing', icon: FileUp, description: 'Closed job cards export', allowedUsers: ['ap', 'shubham', 'prabhakar'] },
      { title: 'Greige Stock U-2', path: '/imports/greige-stock-u2', icon: CloudUpload, description: 'Paste Unit-2 greige stock', allowedUsers: ['ankush', 'bharat', 'sunil', 'shubham', 'ap'] },
      { title: 'Greige Stock U-3', path: '/imports/greige-stock-u3', icon: CloudUpload, description: 'Unit-3 greige stock workbook', allowedUsers: ['shubham', 'gagan', 'ap'] },
      { title: 'Yarn Stock', path: '/imports/yarn-stock', icon: FileSpreadsheet, description: 'Yarn stock HTML export', allowedUsers: ['shubham', 'rajeev', 'ap'] },
      { title: 'Dispatch / Billing', path: '/imports/dispatch', icon: Truck, description: 'Dispatch register HTML export', allowedUsers: ['ap', 'shubham', 'mukeshk', 'ankushb', 'neerajb', 'amanb'] },
      { title: 'Orders Book', path: '/imports/orders-book', icon: Truck, description: 'Order book export', allowedUsers: ['shubham', 'prashant', 'vikki', 'ram', 'ap'] },
      { title: 'Recipes', path: '/imports/recipes', icon: Beaker, description: 'Recipe workbook (MIX sheet)', allowedUsers: ['dilip', 'subhash', 'vb', 'sb', 'rc', 'ap'] },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'GSM Calculator', path: '/tools/gsm', icon: Calculator, description: 'Convert metres and kilograms', allowedUsers: null, legacyTitle: 'GSM Calculator' },
      { title: 'Generate QR Code', path: '/tools/qr', icon: QrCode, description: 'Print job card / order labels', allowedUsers: null },
      { title: 'Fabric Name Mapping', path: '/tools/fabric-mapping', icon: MapPinned, description: 'Map stock names to ERP names', allowedUsers: ['vb', 'ap'] },
      { title: 'Refresh Cache', path: '/tools/refresh-cache', icon: RefreshCw, description: 'Clear server-side data cache', allowedUsers: null, legacyTitle: 'Refresh Data' },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })))

export function canAccess(item: Pick<NavItem, 'allowedUsers'>, username: string) {
  if (!item.allowedUsers) return true
  return item.allowedUsers.includes(username.toLowerCase())
}

export function findNavItem(pathname: string) {
  return ALL_NAV_ITEMS.find((item) => item.path === pathname)
}

export const GaugeIcon = Gauge
