import { formatErpOpening, formatRecordedEvent } from './lot-timeline.js';

export const ORDER_TRACKER_STAGES = Object.freeze([
  { key: 'dyes', label: 'Dyes & chemicals issued', short: 'Dyes' },
  { key: 'jet', label: 'Jet loading', short: 'Jet' },
  { key: 'rope', label: 'Rope opener', short: 'Rope' },
  { key: 'heat', label: 'Heat setting', short: 'Heat' },
  { key: 'finish', label: 'Stenter / finishing', short: 'Finish' },
]);

const stageNames = new Map(ORDER_TRACKER_STAGES.map(stage => [stage.key, stage]));

export function orderTrackerPath(orderId) {
  const id = String(orderId ?? '').trim();
  return id ? `/orders/tracker?orderId=${encodeURIComponent(id)}` : '/orders/tracker';
}

export function readTrackerOrderId(searchParams) {
  return String(searchParams?.get('orderId') ?? '').trim();
}

export function orderLotStatus(lot) {
  if (lot?.closedAt || lot?.status === 'closed') return 'Closed';
  if (lot?.events?.length) return 'In production';
  return 'Open';
}

/** Only imported evidence; no estimated stages or completion percentages. */
export function getOrderLotEvents(lot) {
  const opened = lot?.jobCardDate ? [{
    id: 'opened', label: 'Job card opened (ERP)',
    display: formatErpOpening({ JOBCARDDATE: lot.jobCardDate, JOBCARDTIME: lot.jobCardTime }),
    sortTime: new Date(lot.jobCardDate).getTime(),
  }] : [];
  const activities = (lot?.events ?? []).flatMap((event, index) => {
    const timestamp = new Date(event.eventDate).getTime();
    if (!Number.isFinite(timestamp)) return [];
    return [{
      id: `stage-${index}`, label: stageNames.get(event.stage)?.label || event.stage || 'Production activity',
      display: formatRecordedEvent(event.eventDate),
      machine: event.machine || '', remarks: event.remarks || '', sortTime: timestamp,
    }];
  });
  const closing = lot?.closedAt ? [{
    id: 'closed', label: 'Job card closed (ERP)',
    display: formatRecordedEvent(lot.closedAt, { dateOnly: true }),
    // Date-only ERP closing has no clock time: show after timed events for that day.
    sortTime: Date.parse(`${String(lot.closedAt).slice(0, 10)}T23:59:59.999Z`),
  }] : [];
  return [...opened, ...activities, ...closing].sort((a, b) => a.sortTime - b.sortTime);
}

export function orderTrackingState(info) {
  if (!info) return 'Not loaded';
  if (!info.lots?.length) {
    return info.schedules?.length ? 'Scheduled — no job card imported' : 'Order imported — schedule not imported';
  }
  if (info.lots.every(lot => orderLotStatus(lot) === 'Closed')) return 'All imported lots closed';
  if (info.lots.some(lot => orderLotStatus(lot) === 'In production')) return 'In production';
  return 'Job cards open';
}
