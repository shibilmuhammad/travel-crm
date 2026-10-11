// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type InterestLevel =
  | 'new'
  | 'low_interest'
  | 'interested'
  | 'high_intent'
  | 'not_interested';

export type LeadTemperature = 'new' | 'hot' | 'warm' | 'cold' | 'not_interested';

export type BookingStage =
  | 'not_contacted'
  | 'contacted'
  | 'follow_up_required'
  | 'waiting_for_date'
  | 'waiting_for_price'
  | 'ready_to_book'
  | 'advance_paid'
  | 'booking_confirmed'
  | 'lost_closed';

export type DateFlexibility =
  | 'specific_date_only'
  | 'flexible_within_range'
  | 'any_future_batch'
  | 'not_decided';

export type ActivityType =
  | 'phone_call'
  | 'whatsapp_message'
  | 'follow_up'
  | 'booking_update'
  | 'general_note';

export type LeadSource =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'google_ads'
  | 'referral'
  | 'walk_in'
  | 'website'
  | 'manual_entry'
  | 'other';

export type BatchStatus =
  | 'proposed'
  | 'validating_demand'
  | 'open_for_booking'
  | 'confirmed'
  | 'cancelled';

export type UserRole = 'admin' | 'telecaller' | 'manager' | 'other';

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Lead {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email?: string | null;
  whatsapp_profile_name?: string | null;
  city?: string | null; // Customer city / location of residence
  preferred_destination?: string | null;
  destination?: string | null;
  preferred_travel_date?: string | null; // ISO date string
  preferred_date?: string | null;
  date_flexibility?: DateFlexibility;
  departure_city?: string | null;
  number_of_travellers?: number;
  budget_per_person?: number | null;
  advance_amount?: number | null; // Advance or booking payment amount
  payment_date?: string | null;   // Date payment was received
  interest_level?: InterestLevel;
  lead_temperature?: LeadTemperature | null; // Hot, Warm, Cold, Converted, Lost
  booking_stage?: BookingStage;
  preferred_contact_method?: string | null;
  last_contacted_date?: string | null;
  next_followup_date?: string | null;
  next_followup_time?: string | null;
  next_followup_status?: 'pending' | 'completed' | null;
  assigned_team_member?: string | null; // Staff member assigned
  batch_id?: string | null; // Associated trip/batch ID
  lead_source?: LeadSource | null;
  ad_campaign?: string | null;
  ad_id?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: ActivityType;
  activity_date: string; // ISO datetime
  notes: string | null;
  outcome: string | null;
  next_action: string | null;
  next_followup_date: string | null;
  team_member: string | null;
  updated_interest_level?: InterestLevel | null;
  updated_lead_temperature?: LeadTemperature | null;
  updated_booking_stage?: BookingStage | null;
  updated_preferred_date?: string | null;
  created_at: string;
}

export interface TripBatch {
  id: string;
  destination: string;
  proposed_date: string; // ISO date
  title?: string;
  start_date?: string;
  end_date: string | null;
  status: BatchStatus;
  proposed_price: number | null;
  price_per_pax?: number | null;
  capacity: number | null;
  total_capacity?: number | null;
  confirmed_pax?: number;
  confirmed_seats?: number;
  minimum_viable_size: number | null;
  departure_city: string | null;
  notes: string | null;
  leads_attached?: string[];
  created_at: string;
  updated_at?: string;
  total_linked_leads?: number;
  high_intent_count?: number;
  ready_to_book_count?: number;
  advance_paid_count?: number;
  confirmed_count?: number;
}

export interface BatchLead {
  id: string;
  batch_id: string;
  lead_id: string;
  created_at: string;
  lead?: Lead;
}

export interface TeamMember {
  id: string;
  full_name: string;
  name?: string;
  email: string;
  phone: string | null;
  password?: string;
  role: UserRole;
  employee_id?: string | null;
  daily_call_target: number;
  daily_conversion_target: number;
  status: 'active' | 'inactive';
  last_login: string | null;
  created_at: string;
}

// ─── Derived / Computed Types ─────────────────────────────────────────────────

export interface DemandGroup {
  destination: string;
  preferred_date: string | null;
  date_flexibility: DateFlexibility | null;
  departure_city: string | null;
  total_customers: number;
  total_travellers: number;
  high_intent: number;
  ready_to_book: number;
  advance_paid: number;
  confirmed: number;
  estimated_revenue: number | null;
  latest_enquiry: string;
  leads: Lead[];
}

export interface DashboardStats {
  total_leads: number;
  new_enquiries: number;
  new_leads: number;
  hot_leads: number;
  followups_due_today: number;
  overdue_followups: number;
  high_intent_leads: number;
  leads_no_future_date: number;
  confirmed_bookings: number;
  conversion_rate: number;
  total_advance_collected: number;
  bookings_with_advance: number;
  ready_to_book_count?: number;
  // Prior period comparisons
  prev_total_leads?: number;
  prev_confirmed_bookings?: number;
  prev_conversion_rate?: number;
  prev_advance_collected?: number;
}

export interface TodayPriority {
  type:
    | 'call_due'
    | 'overdue_followup'
    | 'hot_no_followup'
    | 'high_intent_no_booking'
    | 'waiting_for_date'
    | 'waiting_for_price'
    | 'not_contacted'
    | 'unassigned'
    | 'awaiting_confirmation';
  lead: Lead;
  note?: string;
  urgency?: 'urgent' | 'high' | 'medium' | 'normal';
}

// ─── Filter / Sort Types ──────────────────────────────────────────────────────

export interface LeadFilters {
  search?: string;
  destination?: string;
  preferred_date?: string;
  interest_level?: InterestLevel | '';
  lead_temperature?: LeadTemperature | '';
  booking_stage?: BookingStage | '';
  followup_date?: string;
  lead_source?: LeadSource | '';
  date_flexibility?: DateFlexibility | '';
  assigned_team_member?: string;
  batch_id?: string;
}

export type LeadSortField =
  | 'created_at'
  | 'interest_level'
  | 'next_followup_date'
  | 'last_contacted_date'
  | 'full_name';

export type SortOrder = 'asc' | 'desc';

export interface DemandFilters {
  destination?: string;
  travel_date?: string;
  date_range_start?: string;
  date_range_end?: string;
  date_flexibility?: DateFlexibility | '';
  departure_city?: string;
  interest_level?: InterestLevel | '';
  booking_stage?: BookingStage | '';
  min_travellers?: number;
  min_budget?: number;
  max_budget?: number;
}

// ─── Label Maps ──────────────────────────────────────────────────────────────

export const INTEREST_LEVEL_LABELS: Record<InterestLevel, string> = {
  new: 'New / Not Assessed',
  low_interest: 'Low Interest',
  interested: 'Interested',
  high_intent: 'High Intent',
  not_interested: 'Not Interested',
};

export const LEAD_TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  new: 'New / Unassessed',
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  not_interested: 'Not Interested',
};

export const BOOKING_STAGE_LABELS: Record<BookingStage, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  follow_up_required: 'Follow-up Required',
  waiting_for_date: 'Waiting for Date',
  waiting_for_price: 'Waiting for Price',
  ready_to_book: 'Ready to Book',
  advance_paid: 'Advance Paid',
  booking_confirmed: 'Booking Confirmed',
  lost_closed: 'Lost / Closed',
};

export const DATE_FLEXIBILITY_LABELS: Record<DateFlexibility, string> = {
  specific_date_only: 'Specific Date Only',
  flexible_within_range: 'Flexible Within Range',
  any_future_batch: 'Any Future Batch',
  not_decided: 'Not Decided',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  phone_call: 'Phone Call',
  whatsapp_message: 'WhatsApp Message',
  follow_up: 'Follow-up',
  booking_update: 'Booking Update',
  general_note: 'General Note',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  referral: 'Referral',
  walk_in: 'Walk-in',
  website: 'Website',
  manual_entry: 'Manual Entry',
  other: 'Other',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  proposed: 'Proposed',
  validating_demand: 'Validating Demand',
  open_for_booking: 'Open for Booking',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

// ─── Color Maps ───────────────────────────────────────────────────────────────

export const INTEREST_LEVEL_COLORS: Record<InterestLevel, string> = {
  new: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  low_interest: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  interested: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high_intent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  not_interested: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export const LEAD_TEMPERATURE_COLORS: Record<LeadTemperature, string> = {
  new: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold',
  hot: 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold shadow-2xs',
  warm: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
  cold: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium',
  not_interested: 'bg-slate-200 text-slate-500 border border-slate-300 font-medium',
};

export const BOOKING_STAGE_COLORS: Record<BookingStage, string> = {
  not_contacted: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium',
  contacted: 'bg-sky-50 text-sky-800 border border-sky-200 font-semibold',
  follow_up_required: 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold',
  waiting_for_date: 'bg-purple-50 text-purple-800 border border-purple-200 font-semibold',
  waiting_for_price: 'bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold',
  ready_to_book: 'bg-teal-50 text-teal-800 border border-teal-200 font-bold',
  advance_paid: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold shadow-2xs',
  booking_confirmed: 'bg-emerald-600 text-white border border-emerald-700 font-black shadow-2xs',
  lost_closed: 'bg-rose-50 text-rose-700 border border-rose-200 font-medium',
};
