import { JET_NUMBERS } from '@/lib/config'

export interface StageField {
  /** Payload key sent to the backend. */
  name: string
  label: string
  type: 'datetime' | 'select' | 'text'
  options?: string[]
  required?: boolean
}

export interface StageDefinition {
  slug: string
  title: string
  description: string
  endpoint: string
  /** Job card field that, when filled, means this stage is already recorded. */
  doneKey: string
  fields: StageField[]
}

const STENTERS = ['ST-1', 'ST-2', 'ST-3', 'ST-4']

export const STAGES: StageDefinition[] = [
  {
    slug: 'dyes-issue',
    title: 'Dyes & Chemicals Issue',
    description: 'Record when dyes and chemicals are issued against a job card.',
    endpoint: '/update_dyes_chem',
    doneKey: 'DYESCHEMISSUEDATE',
    fields: [{ name: 'dyeschemissuedate', label: 'Issue date & time', type: 'datetime', required: true }],
  },
  {
    slug: 'jet-loading',
    title: 'Jet Loading',
    description: 'Record the jet a job card is loaded into.',
    endpoint: '/jet_loading',
    doneKey: 'JETLOADINGDATE',
    fields: [
      { name: 'jetloadingdate', label: 'Loading date & time', type: 'datetime', required: true },
      { name: 'jetno', label: 'Jet number', type: 'select', options: JET_NUMBERS.map(String), required: true },
    ],
  },
  {
    slug: 'rope-opener',
    title: 'Rope Opener',
    description: 'Record rope opening after unloading from jet.',
    endpoint: '/rope_opener',
    doneKey: 'ROPEOPENERDATE',
    fields: [{ name: 'ropeopenerdate', label: 'Rope opening date & time', type: 'datetime', required: true }],
  },
  {
    slug: 'heat-setting',
    title: 'Heat Set Loading',
    description: 'Record heat setting on a stenter.',
    endpoint: '/heatsetting',
    doneKey: 'HEATSETTINGDATE',
    fields: [
      { name: 'heatsettingdate', label: 'Heat setting date & time', type: 'datetime', required: true },
      { name: 'stenter_no', label: 'Stenter', type: 'select', options: STENTERS, required: true },
    ],
  },
  {
    slug: 'stenter-loading',
    title: 'Stenter Loading (Finishing)',
    description: 'Record final finishing on a stenter.',
    endpoint: '/finishing',
    doneKey: 'FINISHINGDATE',
    fields: [
      { name: 'finishingdate', label: 'Finishing date & time', type: 'datetime', required: true },
      { name: 'stenter_no', label: 'Stenter', type: 'select', options: STENTERS, required: true },
    ],
  },
]
