import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLeads } from '@/lib/leadStore';
import { getStoredActivities } from '@/lib/activityStore';
import { MOCK_LEADS } from '@/lib/mockData';
import type { Lead, BookingStage, LeadTemperature } from '@/types';

function parseDateOnly(isoString?: string | null): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate'); // YYYY-MM-DD
  const endDate = searchParams.get('endDate');     // YYYY-MM-DD
  const destination = searchParams.get('destination');
  const leadSource = searchParams.get('lead_source');
  const staff = searchParams.get('assigned_team_member');

  const today = new Date().toISOString().split('T')[0];

  let allLeads: Lead[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase.from('leads').select('*').limit(1000);
      if (!error && data && data.length > 0) {
        allLeads = data;
      } else {
        allLeads = getStoredLeads();
      }
    } catch {
      allLeads = getStoredLeads();
    }
  } else {
    allLeads = getStoredLeads().length > 0 ? getStoredLeads() : MOCK_LEADS;
  }

  // Calculate prior equivalent period if dates provided
  let prevStart = '';
  let prevEnd = '';
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffMs = e.getTime() - s.getTime();
    const prevStartD = new Date(s.getTime() - diffMs - 86400000);
    const prevEndD = new Date(s.getTime() - 86400000);
    prevStart = prevStartD.toISOString().split('T')[0];
    prevEnd = prevEndD.toISOString().split('T')[0];
  }

  // Filter leads function
  const filterLeadSet = (leadList: Lead[], sDate?: string, eDate?: string) => {
    return leadList.filter((l) => {
      if (destination && destination !== 'all') {
        const dest = (l.preferred_destination || l.destination || '').toLowerCase();
        if (!dest.includes(destination.toLowerCase())) return false;
      }
      if (leadSource && leadSource !== 'all') {
        if ((l.lead_source || '').toLowerCase() !== leadSource.toLowerCase()) return false;
      }
      if (staff && staff !== 'all') {
        if ((l.assigned_team_member || '').toLowerCase() !== staff.toLowerCase()) return false;
      }
      if (sDate && eDate) {
        const leadDate = parseDateOnly(l.created_at);
        if (leadDate && (leadDate < sDate || leadDate > eDate)) return false;
      }
      return true;
    });
  };

  const currentCohort = filterLeadSet(allLeads, startDate || undefined, endDate || undefined);
  const priorCohort = (prevStart && prevEnd) ? filterLeadSet(allLeads, prevStart, prevEnd) : [];

  // Core metrics for current period
  const totalLeads = currentCohort.length;
  const newLeads = currentCohort.filter(
    (l) => l.lead_temperature === 'new' || l.interest_level === 'new'
  ).length;
  const hotLeads = currentCohort.filter(
    (l) => l.lead_temperature === 'hot' || l.interest_level === 'high_intent'
  ).length;

  const followupsToday = allLeads.filter((l) => {
    if (staff && staff !== 'all' && (l.assigned_team_member || '').toLowerCase() !== staff.toLowerCase()) {
      return false;
    }
    return l.next_followup_date === today && l.next_followup_status !== 'completed';
  }).length;

  const overdueFollowups = allLeads.filter((l) => {
    if (staff && staff !== 'all' && (l.assigned_team_member || '').toLowerCase() !== staff.toLowerCase()) {
      return false;
    }
    return (
      l.next_followup_date &&
      l.next_followup_date < today &&
      l.next_followup_status !== 'completed' &&
      l.booking_stage !== 'booking_confirmed' &&
      l.booking_stage !== 'lost_closed'
    );
  }).length;

  const confirmedBookings = currentCohort.filter(
    (l) => l.booking_stage === 'booking_confirmed'
  ).length;

  const conversionRate = totalLeads > 0
    ? Math.round((confirmedBookings / totalLeads) * 1000) / 10
    : 0;

  // Advance payments collected (sum of actual recorded advances)
  const advanceLeads = currentCohort.filter((l) => Number(l.advance_amount) > 0);
  const totalAdvanceCollected = advanceLeads.reduce(
    (sum, l) => sum + Number(l.advance_amount || 0),
    0
  );
  const bookingsWithAdvance = advanceLeads.length;

  // Prior cohort metrics for comparisons
  const prevTotalLeads = priorCohort.length;
  const prevConfirmed = priorCohort.filter((l) => l.booking_stage === 'booking_confirmed').length;
  const prevConversionRate = prevTotalLeads > 0
    ? Math.round((prevConfirmed / prevTotalLeads) * 1000) / 10
    : 0;
  const prevAdvanceCollected = priorCohort
    .filter((l) => Number(l.advance_amount) > 0)
    .reduce((sum, l) => sum + Number(l.advance_amount || 0), 0);

  // Status distribution (exact 5 values)
  const statusCounts: Record<LeadTemperature, number> = {
    new: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    not_interested: 0,
  };
  for (const l of currentCohort) {
    const temp = (l.lead_temperature || l.interest_level || 'new') as LeadTemperature;
    if (temp in statusCounts) {
      statusCounts[temp]++;
    } else {
      statusCounts.new++;
    }
  }

  // Booking Stage distribution (exact 9 values)
  const stageCounts: Record<BookingStage, number> = {
    not_contacted: 0,
    contacted: 0,
    follow_up_required: 0,
    waiting_for_date: 0,
    waiting_for_price: 0,
    ready_to_book: 0,
    advance_paid: 0,
    booking_confirmed: 0,
    lost_closed: 0,
  };
  for (const l of currentCohort) {
    const stg = (l.booking_stage || 'not_contacted') as BookingStage;
    if (stg in stageCounts) {
      stageCounts[stg]++;
    } else {
      stageCounts.not_contacted++;
    }
  }

  // Conversion by Lead Source
  const sourceMap = new Map<string, { total: number; confirmed: number; advance: number }>();
  for (const l of currentCohort) {
    const src = l.lead_source || 'manual_entry';
    if (!sourceMap.has(src)) {
      sourceMap.set(src, { total: 0, confirmed: 0, advance: 0 });
    }
    const rec = sourceMap.get(src)!;
    rec.total++;
    if (l.booking_stage === 'booking_confirmed') {
      rec.confirmed++;
    }
    if (Number(l.advance_amount) > 0) {
      rec.advance += Number(l.advance_amount);
    }
  }

  const sourcesBreakdown = Array.from(sourceMap.entries()).map(([source, s]) => ({
    source,
    total: s.total,
    confirmed: s.confirmed,
    conversion_rate: s.total > 0 ? Math.round((s.confirmed / s.total) * 1000) / 10 : 0,
    advance_collected: s.advance,
  })).sort((a, b) => b.total - a.total);

  // Conversion by Assigned Team Member
  const teamMap = new Map<string, { total: number; contacted: number; confirmed: number; advance: number }>();
  for (const l of currentCohort) {
    const member = l.assigned_team_member || 'Unassigned';
    if (!teamMap.has(member)) {
      teamMap.set(member, { total: 0, contacted: 0, confirmed: 0, advance: 0 });
    }
    const rec = teamMap.get(member)!;
    rec.total++;
    if (l.booking_stage && l.booking_stage !== 'not_contacted') {
      rec.contacted++;
    }
    if (l.booking_stage === 'booking_confirmed') {
      rec.confirmed++;
    }
    if (Number(l.advance_amount) > 0) {
      rec.advance += Number(l.advance_amount);
    }
  }

  const teamBreakdown = Array.from(teamMap.entries()).map(([member, t]) => ({
    member,
    total: t.total,
    contacted: t.contacted,
    confirmed: t.confirmed,
    conversion_rate: t.total > 0 ? Math.round((t.confirmed / t.total) * 1000) / 10 : 0,
    advance_collected: t.advance,
  })).sort((a, b) => b.total - a.total);

  // Customer Cities (location of customer)
  const customerCityMap = new Map<string, { total: number; confirmed: number }>();
  for (const l of currentCohort) {
    const c = (l.city || '').trim();
    if (c) {
      if (!customerCityMap.has(c)) customerCityMap.set(c, { total: 0, confirmed: 0 });
      const item = customerCityMap.get(c)!;
      item.total++;
      if (l.booking_stage === 'booking_confirmed') item.confirmed++;
    }
  }
  const topCustomerCities = Array.from(customerCityMap.entries())
    .map(([city, v]) => ({ city, count: v.total, confirmed: v.confirmed }))
    .sort((a, b) => b.count - a.count);

  // Departure Cities (trip departure city)
  const departureCityMap = new Map<string, { total: number; confirmed: number }>();
  for (const l of currentCohort) {
    const dc = (l.departure_city || '').trim();
    if (dc) {
      if (!departureCityMap.has(dc)) departureCityMap.set(dc, { total: 0, confirmed: 0 });
      const item = departureCityMap.get(dc)!;
      item.total++;
      if (l.booking_stage === 'booking_confirmed') item.confirmed++;
    }
  }
  const topDepartureCities = Array.from(departureCityMap.entries())
    .map(([city, v]) => ({ city, count: v.total, confirmed: v.confirmed }))
    .sort((a, b) => b.count - a.count);

  // Lost leads analysis
  const lostLeads = currentCohort.filter(
    (l) => l.booking_stage === 'lost_closed' || l.lead_temperature === 'not_interested'
  );
  const lostReasonsMap = new Map<string, number>();
  for (const l of lostLeads) {
    if (l.lost_reason) {
      lostReasonsMap.set(l.lost_reason, (lostReasonsMap.get(l.lost_reason) || 0) + 1);
    } else if (l.notes) {
      const lower = l.notes.toLowerCase();
      if (lower.includes('price') || lower.includes('cost') || lower.includes('expensive')) {
        lostReasonsMap.set('Price too high', (lostReasonsMap.get('Price too high') || 0) + 1);
      } else if (lower.includes('date') || lower.includes('timing') || lower.includes('schedule')) {
        lostReasonsMap.set('Dates mismatch', (lostReasonsMap.get('Dates mismatch') || 0) + 1);
      } else if (lower.includes('plan') || lower.includes('cancel') || lower.includes('postpone')) {
        lostReasonsMap.set('Trip postponed / cancelled', (lostReasonsMap.get('Trip postponed / cancelled') || 0) + 1);
      }
    }
  }
  const lostReasons = Array.from(lostReasonsMap.entries()).map(([reason, count]) => ({ reason, count }));

  return NextResponse.json({
    total_leads: totalLeads,
    new_enquiries: newLeads,
    new_leads: newLeads,
    hot_leads: hotLeads,
    followups_due_today: followupsToday,
    overdue_followups: overdueFollowups,
    high_intent_leads: hotLeads,
    leads_no_future_date: currentCohort.filter((l) => !l.preferred_travel_date).length,
    confirmed_bookings: confirmedBookings,
    conversion_rate: conversionRate,
    total_advance_collected: totalAdvanceCollected,
    bookings_with_advance: bookingsWithAdvance,
    prev_total_leads: prevTotalLeads,
    prev_confirmed_bookings: prevConfirmed,
    prev_conversion_rate: prevConversionRate,
    prev_advance_collected: prevAdvanceCollected,
    status_counts: statusCounts,
    stage_counts: stageCounts,
    sources_breakdown: sourcesBreakdown,
    team_breakdown: teamBreakdown,
    top_customer_cities: topCustomerCities,
    top_departure_cities: topDepartureCities,
    lost_leads_count: lostLeads.length,
    lost_reasons: lostReasons,
  });
}

