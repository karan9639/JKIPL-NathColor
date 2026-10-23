// Accept only recognizable job-card QR payloads. Never send arbitrary scanned URLs/text to the API.
const NUMBER = /^\d{1,20}$/;
const KEY = /^(?:jobcardno|jobcardnumber|job_card_no|job_card_number|job-card-no|job-card-number|djc)$/i;
const TAGGED = /^(?:job\s*card(?:\s*(?:no\.?|number|#))?|jobcard(?:\s*(?:no\.?|number))?|djc)\s*[:=#\-]\s*(\d{1,20})$/i;

export function parseJobCardQr(payload) {
  if (typeof payload !== 'string' && typeof payload !== 'number') return null;
  const raw = String(payload).trim();
  if (!raw || raw.length > 2048) return null;
  if (NUMBER.test(raw)) return raw; // Preserve leading zeros.

  const tagged = raw.match(TAGGED);
  if (tagged) return tagged[1];

  if (raw.startsWith('{')) {
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
      for (const [key, value] of Object.entries(obj)) {
        if (KEY.test(key) && NUMBER.test(String(value ?? '').trim())) return String(value).trim();
      }
    } catch {
      return null;
    }
    return null;
  }

  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    for (const [key, value] of url.searchParams) {
      if (KEY.test(key) && NUMBER.test(value)) return value;
    }
    const path = url.pathname.match(/\/(?:job-?cards?|djc)\/(\d{1,20})(?:\/?$)/i);
    return path?.[1] ?? null;
  } catch {
    return null;
  }
}
