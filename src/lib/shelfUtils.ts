import { differenceInDays, addMonths, parseISO } from "date-fns";

export type ExpirationStatus = 'safe' | 'warning' | 'critical' | 'expired' | 'not_opened';

export interface ExpirationInfo {
  daysLeft: number | null;
  status: ExpirationStatus;
  label: string;
}

export function calculateExpiration(openedAt: string | null, shelfLifeMonths: number): ExpirationInfo {
  if (!openedAt) {
    return { daysLeft: null, status: 'not_opened', label: 'Not opened' };
  }

  const expiryDate = addMonths(parseISO(openedAt), shelfLifeMonths);
  const daysLeft = differenceInDays(expiryDate, new Date());

  if (daysLeft <= 0) {
    return { daysLeft, status: 'expired', label: 'Expired' };
  }
  if (daysLeft <= 7) {
    return { daysLeft, status: 'critical', label: 'Expiring soon' };
  }
  if (daysLeft <= 30) {
    return { daysLeft, status: 'warning', label: 'Expiring' };
  }

  return { daysLeft, status: 'safe', label: 'Safe' };
}

export function getStatusColor(status: ExpirationStatus): string {
  switch (status) {
    case 'expired': return 'text-destructive';
    case 'critical': return 'text-destructive font-bold animate-pulse';
    case 'warning': return 'text-severity-high';
    case 'safe': return 'text-severity-low';
    default: return 'text-muted-foreground';
  }
}

export function getStatusBg(status: ExpirationStatus): string {
  switch (status) {
    case 'expired': return 'bg-destructive/10 border-destructive/30';
    case 'critical': return 'bg-destructive/20 border-destructive/50 ring-1 ring-destructive/20';
    case 'warning': return 'bg-severity-high/10 border-severity-high/30';
    case 'safe': return 'bg-severity-low/10 border-severity-low/30';
    default: return 'bg-muted/50';
  }
}
