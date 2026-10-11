import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLeads } from '@/lib/leadStore';
import { MOCK_LEADS } from '@/lib/mockData';
import type { Lead, TodayPriority } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const staff = searchParams.get('assigned_team_member');
  const today = new Date().toISOString().split('T')[0];

  let leads: Lead[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseClient();
      let query = supabase.from('leads').select('*').limit(500);
      if (staff && staff !== 'all') {
        query = query.ilike('assigned_team_member', `%${staff}%`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        leads = data;
      } else {
        leads = getStoredLeads();
      }
    } catch {
      leads = getStoredLeads();
    }
  } else {
    leads = getStoredLeads().length > 0 ? getStoredLeads() : MOCK_LEADS;
  }

  if (staff && staff !== 'all') {
    leads = leads.filter(
      (l) => (l.assigned_team_member || '').toLowerCase() === staff.toLowerCase()
    );
  }

  const seenLeadIds = new Set<string>();
  const priorities: TodayPriority[] = [];

  // 1. Overdue follow-ups (highest urgency)
  const overdueLeads = leads
    .filter(
      (l) =>
        l.next_followup_date &&
        l.next_followup_date < today &&
        l.next_followup_status !== 'completed' &&
        l.booking_stage !== 'booking_confirmed' &&
        l.booking_stage !== 'lost_closed'
    )
    .sort((a, b) => (a.next_followup_date || '').localeCompare(b.next_followup_date || ''));

  for (const l of overdueLeads) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'overdue_followup',
        lead: l,
        urgency: 'urgent',
        note: `Overdue since ${l.next_followup_date}`,
      });
    }
  }

  // 2. Follow-ups due today
  const todayLeads = leads
    .filter(
      (l) =>
        l.next_followup_date === today &&
        l.next_followup_status !== 'completed' &&
        l.booking_stage !== 'booking_confirmed' &&
        l.booking_stage !== 'lost_closed'
    )
    .sort((a, b) => (a.next_followup_time || '12:00').localeCompare(b.next_followup_time || '12:00'));

  for (const l of todayLeads) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'call_due',
        lead: l,
        urgency: 'high',
        note: l.next_followup_time ? `Scheduled for ${l.next_followup_time}` : 'Follow-up due today',
      });
    }
  }

  // 3. Hot leads with no upcoming follow-up
  const hotLeadsWithoutFollowup = leads.filter(
    (l) =>
      (l.lead_temperature === 'hot' || l.interest_level === 'high_intent') &&
      !l.next_followup_date &&
      l.booking_stage !== 'booking_confirmed' &&
      l.booking_stage !== 'lost_closed'
  );

  for (const l of hotLeadsWithoutFollowup) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'hot_no_followup',
        lead: l,
        urgency: 'high',
        note: 'Hot lead — no upcoming follow-up scheduled',
      });
    }
  }

  // 4. High-intent leads awaiting confirmation (Ready to Book)
  const readyToBookLeads = leads.filter(
    (l) => l.booking_stage === 'ready_to_book'
  );

  for (const l of readyToBookLeads) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'awaiting_confirmation',
        lead: l,
        urgency: 'high',
        note: 'Ready to book — awaiting payment/confirmation link',
      });
    }
  }

  // 5. Leads waiting for a suitable date
  const waitingDateLeads = leads.filter(
    (l) => l.booking_stage === 'waiting_for_date'
  );

  for (const l of waitingDateLeads) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'waiting_for_date',
        lead: l,
        urgency: 'medium',
        note: 'Waiting for suitable date / batch announcement',
      });
    }
  }

  // 6. Leads waiting for price
  const waitingPriceLeads = leads.filter(
    (l) => l.booking_stage === 'waiting_for_price'
  );

  for (const l of waitingPriceLeads) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'waiting_for_price',
        lead: l,
        urgency: 'medium',
        note: 'Quote requested — waiting for pricing details',
      });
    }
  }

  // 7. New leads not yet contacted
  const uncontactedLeads = leads.filter(
    (l) =>
      l.booking_stage === 'not_contacted' ||
      (l.lead_temperature === 'new' && !l.last_contacted_date)
  );

  for (const l of uncontactedLeads) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'not_contacted',
        lead: l,
        urgency: 'normal',
        note: 'New enquiry — initial qualification call needed',
      });
    }
  }

  // 8. Unassigned leads
  const unassignedLeads = leads.filter(
    (l) => !l.assigned_team_member || l.assigned_team_member === 'Unassigned'
  );

  for (const l of unassignedLeads) {
    if (!seenLeadIds.has(l.id)) {
      seenLeadIds.add(l.id);
      priorities.push({
        type: 'unassigned',
        lead: l,
        urgency: 'normal',
        note: 'Unassigned lead — needs staff allocation',
      });
    }
  }

  return NextResponse.json(priorities);
}

