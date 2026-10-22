/**
 * ERP jobCardDate is a DATE, stored as ISO midnight UTC by MongoDB.
 * jobCardTime is a separate ERP wall-clock string. Never concatenate the two
 * or convert the ERP calendar date to the browser's timezone.
 */
export const PRODUCTION_STAGES = [
  { key: 'DYESCHEMISSUEDATE', label: 'Dyes & chemicals issued', short: 'Dyes issued' },
  { key: 'JETLOADINGDATE', label: 'Jet loading', short: 'Jet loading' },
  { key: 'ROPEOPENERDATE', label: 'Rope opener', short: 'Rope opener' },
  { key: 'HEATSETTINGDATE', label: 'Heat setting', short: 'Heat setting' },
  { key: 'FINISHINGDATE', label: 'Stenter / finishing', short: 'Finishing' },
];

const POST_PRODUCTION_EVENTS = [
  { key: 'JOBCARDCLOSEDDATE', label: 'Job card closed', short: 'Closed', dateOnly: true },
  { key: 'INVOICE_DATE', label: 'Invoice recorded', short: 'Invoiced', dateOnly: true },
];
export const ALL_TIMELINE_EVENTS = [...PRODUCTION_STAGES, ...POST_PRODUCTION_EVENTS];

const hasText = (v) => v !== null && v !== undefined &&
  String(v).trim() !== '' && !['null', 'undefined', '—', '-'].includes(String(v).trim().toLowerCase());

/** Return YYYY-MM-DD, without shifting midnight dates by timezone. */
export function erpCalendarDate(value) {
  if (!hasText(value)) return '';
  const raw = String(value).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/.exec(raw);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    const check = new Date(Date.UTC(y, mo - 1, d));
    return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d
      ? `${m[1]}-${m[2]}-${m[3]}` : '';
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(raw);
  if (m) return erpCalendarDate(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  return '';
}

export function formatErpCalendarDate(value) {
  const iso = erpCalendarDate(value);
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {day:'2-digit', month:'short', year:'numeric', timeZone:'UTC'})
    .format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatErpOpening(row) {
  const date = formatErpCalendarDate(row?.JOBCARDDATE);
  if (date === '—') return '—';
  const rawTime = row?.JOBCARDTIME;
  const time = hasText(rawTime) ? String(rawTime).trim() : '';
  return time ? `${date} · ${time}` : date;
}

/** Stage eventDate is a real timestamp; show it explicitly in the factory time zone. */
export function formatRecordedEvent(value, { dateOnly = false } = {}) {
  if (!hasText(value)) return '—';
  if (dateOnly) return formatErpCalendarDate(value);
  const raw = String(value).trim();
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(parsed) + ' IST';
}

function eventStamp(raw, dateOnly = false) {
  if (!hasText(raw)) return null;
  const text = String(raw).trim();
  // ERP closure/invoice carries only a calendar date. Place it after
  // timed events on that date for display; do not invent a closure clock time.
  const date = dateOnly && erpCalendarDate(text) ? new Date(`${erpCalendarDate(text)}T23:59:59.999Z`) : new Date(text);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

export function getTimelineEvents(row) {
  return ALL_TIMELINE_EVENTS.flatMap((stage, stageOrder) => {
    const value = row?.[stage.key];
    const stamp = eventStamp(value, stage.dateOnly);
    if (stamp === null) return [];
    return [{ ...stage, value, stamp, stageOrder, display: formatRecordedEvent(value, {dateOnly: stage.dateOnly}) }];
  }).sort((a, b) => a.stamp - b.stamp || a.stageOrder - b.stageOrder);
}

/** Stage dates describe JOB-CARD activity, not per-order allocated output. */
export function getLotStatus(row) {
  if (eventStamp(row?.JOBCARDCLOSEDDATE, true) !== null) return 'Closed';
  if (PRODUCTION_STAGES.some(stage => eventStamp(row?.[stage.key]) !== null)) return 'In production';
  return 'Open';
}

export function getLatestActivity(row) {
  const events = getTimelineEvents(row);
  return events.length ? events[events.length - 1] : null;
}

export function formatTimelineRow(row) {
  const latest = getLatestActivity(row);
  return {
    ...row,
    OPENED_DISPLAY: formatErpOpening(row),
    LATEST_STAGE: latest?.short || 'No activity recorded',
    LATEST_STAGE_DATE: latest?.display || '',
    STAGE_STATUS: getLotStatus(row),
    EVENT_COUNT: getTimelineEvents(row).length,
  };
}

/** Parsed for sorting only: ERP date+time are local wall-clock fields. */
export function openingSortKey(row) {
  const ymd = erpCalendarDate(row?.JOBCARDDATE).replaceAll('-', '');
  if (!ymd) return 0;
  const raw = String(row?.JOBCARDTIME ?? '').trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(raw);
  if (!match) return Number(ymd + '0000');
  let hour = Number(match[1]);
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  if (hour > 23 || Number(match[2]) > 59) return Number(ymd + '0000');
  return Number(ymd + String(hour).padStart(2, '0') + match[2]);
}
