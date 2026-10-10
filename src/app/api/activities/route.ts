import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_ACTIVITIES, MOCK_LEADS } from '@/lib/mockData';
import { LeadActivity } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');

  if (!isSupabaseConfigured()) {
    let result = [...MOCK_ACTIVITIES];
    if (leadId) result = result.filter((i) => i.lead_id === leadId);
    return NextResponse.json(result);
  }

  try {
    const supabase = createSupabaseClient();
    let query = supabase.from('lead_activities').select('*').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    let result = [...MOCK_ACTIVITIES];
    if (leadId) result = result.filter((i) => i.lead_id === leadId);
    return NextResponse.json(result);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    lead_id,
    activity_type,
    notes,
    outcome,
    next_action,
    updated_interest_level,
    updated_booking_stage,
    updated_preferred_date,
    next_followup_date,
    team_member,
  } = body;

  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const nowISO = new Date().toISOString();
    const newActivity: LeadActivity = {
      id: `int-${Date.now()}`,
      lead_id,
      activity_type: activity_type || 'phone_call',
      activity_date: nowISO,
      created_at: nowISO,
      notes: notes || '',
      outcome: outcome || null,
      next_action: next_action || null,
      updated_interest_level: updated_interest_level || null,
      updated_booking_stage: updated_booking_stage || null,
      updated_preferred_date: updated_preferred_date || null,
      next_followup_date: next_followup_date || null,
      team_member: team_member || 'Agent',
    };
    MOCK_ACTIVITIES.unshift(newActivity);

    const leadIdx = MOCK_LEADS.findIndex((l) => l.id === lead_id);
    if (leadIdx !== -1) {
      MOCK_LEADS[leadIdx].last_contacted_date = nowISO;
      if (updated_interest_level) MOCK_LEADS[leadIdx].interest_level = updated_interest_level;
      if (updated_booking_stage) MOCK_LEADS[leadIdx].booking_stage = updated_booking_stage;
      if (updated_preferred_date) MOCK_LEADS[leadIdx].preferred_travel_date = updated_preferred_date;
      if (next_followup_date) MOCK_LEADS[leadIdx].next_followup_date = next_followup_date;
    }

    return NextResponse.json(newActivity, { status: 201 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('lead_activities').insert([body]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
