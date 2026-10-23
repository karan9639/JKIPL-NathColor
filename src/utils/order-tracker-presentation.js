/** Presentation helpers only. The API and ERP business rules remain unchanged. */
export function getOrderId(order) {
  const value = order?.orderId ?? order?.ORDERID ?? order?.ORDERNUMBER ?? '';
  return String(value).trim();
}

export function uniqueOrderUnits(orders = []) {
  return [...new Set((orders || []).map((row) => String(row.uom || 'Not supplied').trim().toUpperCase()))];
}

export function normalizedLotRows(tracking, summary, trackingFailed = false) {
  if (Array.isArray(tracking?.lots)) return tracking.lots;
  if (trackingFailed) {
    return (summary?.jobCards || []).map((card) => ({
      jobCardNo: card.jobCardNo,
      manualLotNo: card.manualLotNo,
      kgs: card.kgs,
      status: 'unverified',
      events: null,
      stageUnavailable: true,
    }));
  }
  return [];
}

/** A status is supported only by imported data, not by assumed factory progress. */
export function orderTrackerStatus({ orders = [], schedules = [], lots = [] }) {
  if (lots.length) {
    if (lots.every((lot) => lot.status === 'closed')) return 'Job cards closed';
    if (lots.some((lot) => (lot.events || []).length > 0 || lot.status === 'in-production')) {
      return 'In production';
    }
    return 'Job card imported';
  }
  if (schedules.length) return 'Scheduled · awaiting job card';
  if (orders.length) return 'Order received · awaiting planning';
  return 'No imported order data';
}

export function trackerSummaryValue(trackingValue, summaryValue) {
  return trackingValue ?? summaryValue ?? null;
}
