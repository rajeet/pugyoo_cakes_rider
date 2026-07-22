/** Shared visual tokens for Pugyoo Ops */
export const colors = {
  bg: '#EEF2F4',
  bgWarm: '#E8EEF0',
  surface: '#FFFFFF',
  ink: '#15202B',
  muted: '#64748B',
  border: '#E2E8F0',
  accent: '#0F766E',
  accentDark: '#0B5F59',
  accentSoft: '#CCFBF1',
  accentText: '#115E59',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  success: '#059669',
  warning: '#D97706',
  overlay: 'rgba(15, 23, 32, 0.45)',
}

export const statusColor: Record<string, string> = {
  pending: '#D97706',
  confirmed: '#2563EB',
  preparing: '#0891B2',
  ready: '#7C3AED',
  out_for_delivery: '#EA580C',
  delivered: '#059669',
  cancelled: '#DC2626',
  refunded: '#64748B',
  paid: '#059669',
  success: '#059669',
  failed: '#DC2626',
  unpaid: '#DC2626',
}

export const ALL_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]

export const formatLabel = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Rider: only out_for_delivery from ready, delivered from out_for_delivery */
export const riderStatusOptions = (currentStatus: string): string[] => {
  if (currentStatus === 'ready') return ['out_for_delivery']
  if (currentStatus === 'out_for_delivery') return ['delivered']
  return []
}

/** Admin: any status except the current one */
export const adminStatusOptions = (currentStatus: string): string[] =>
  ALL_ORDER_STATUSES.filter((s) => s !== currentStatus)
