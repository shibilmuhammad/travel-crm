'use client';

import { cn } from '@/lib/utils';
import {
  INTEREST_LEVEL_LABELS, BOOKING_STAGE_LABELS, ACTIVITY_TYPE_LABELS,
  LEAD_SOURCE_LABELS, DATE_FLEXIBILITY_LABELS, BATCH_STATUS_LABELS,
  type InterestLevel, type BookingStage, type ActivityType,
  type LeadSource, type DateFlexibility, type BatchStatus,
} from '@/types';

interface InterestBadgeProps {
  level: InterestLevel;
  className?: string;
}

const INTEREST_COLORS: Record<InterestLevel, string> = {
  new: 'bg-slate-100 text-slate-700 border border-slate-200',
  low_interest: 'bg-orange-50 text-orange-700 border border-orange-200',
  interested: 'bg-blue-50 text-blue-700 border border-blue-200',
  high_intent: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  not_interested: 'bg-red-50 text-red-700 border border-red-200',
};

const BOOKING_COLORS: Record<BookingStage, string> = {
  not_contacted: 'bg-slate-100 text-slate-600 border border-slate-200',
  contacted: 'bg-sky-50 text-sky-700 border border-sky-200',
  follow_up_required: 'bg-amber-50 text-amber-700 border border-amber-200',
  waiting_for_date: 'bg-purple-50 text-purple-700 border border-purple-200',
  waiting_for_price: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  ready_to_book: 'bg-teal-50 text-teal-700 border border-teal-200',
  advance_paid: 'bg-green-50 text-green-700 border border-green-200',
  booking_confirmed: 'bg-emerald-600 text-white border border-emerald-600 shadow-xs',
  lost_closed: 'bg-red-50 text-red-700 border border-red-200',
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  phone_call: '📞',
  whatsapp_message: '💬',
  follow_up: '🔔',
  booking_update: '📋',
  general_note: '📝',
};

const BATCH_COLORS: Record<BatchStatus, string> = {
  proposed: 'bg-slate-100 text-slate-700 border border-slate-200',
  validating_demand: 'bg-amber-50 text-amber-700 border border-amber-200',
  open_for_booking: 'bg-blue-50 text-blue-700 border border-blue-200',
  confirmed: 'bg-emerald-600 text-white border border-emerald-600 shadow-xs',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

export function InterestBadge({ level, className }: InterestBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold',
      INTEREST_COLORS[level] || INTEREST_COLORS['new'],
      className
    )}>
      {INTEREST_LEVEL_LABELS[level] || 'New'}
    </span>
  );
}

export function BookingBadge({ stage, className }: { stage: BookingStage; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold',
      BOOKING_COLORS[stage] || BOOKING_COLORS['not_contacted'],
      className
    )}>
      {BOOKING_STAGE_LABELS[stage] || 'Not Contacted'}
    </span>
  );
}

export function ActivityTypeBadge({ type, className }: { type: ActivityType; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200',
      className
    )}>
      <span>{ACTIVITY_ICONS[type]}</span>
      {ACTIVITY_TYPE_LABELS[type]}
    </span>
  );
}

export function LeadSourceBadge({ source, className }: { source: LeadSource | null; className?: string }) {
  if (!source) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200',
      className
    )}>
      {LEAD_SOURCE_LABELS[source] || source}
    </span>
  );
}

export function DateFlexBadge({ flex, className }: { flex: DateFlexibility; className?: string }) {
  const colors: Record<DateFlexibility, string> = {
    specific_date_only: 'bg-red-50 text-red-700 border-red-200',
    flexible_within_range: 'bg-blue-50 text-blue-700 border-blue-200',
    any_future_batch: 'bg-green-50 text-green-700 border-green-200',
    not_decided: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border',
      colors[flex] || colors['not_decided'],
      className
    )}>
      {DATE_FLEXIBILITY_LABELS[flex] || 'Not Decided'}
    </span>
  );
}

export function BatchStatusBadge({ status, className }: { status: BatchStatus; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold',
      BATCH_COLORS[status] || BATCH_COLORS['proposed'],
      className
    )}>
      {BATCH_STATUS_LABELS[status] || 'Proposed'}
    </span>
  );
}
