import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredActivities, saveStoredActivity } from '@/lib/activityStore';
import { updateStoredLead, getStoredLeads } from '@/lib/leadStore';
import { LeadActivity } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');

  const getInitialNoteActivity = (id: string): LeadActivity | null => {
    const leads = getStoredLeads();
    const l = leads.find((item) => item.id === id);
    if (l && l.notes && l.notes.trim() && l.notes !== '—') {
      return {
        id: `act-${l.id}-initial-note`,
        lead_id: l.id,
        activity_type: 'call_note',
        activity_date: l.created_at || new Date().toISOString(),
        notes: l.notes,
        outcome: null,
        next_action: null,
        next_followup_date: null,
        team_member: l.assigned_team_member || 'Shibil Muhammad',
        created_at: l.created_at || new Date().toISOString(),
      };
    }
    return null;
  };

  if (!isSupabaseConfigured()) {
    let result = getStoredActivities();
    if (leadId) {
      result = result.filter((i) => i.lead_id === leadId);
      if (result.length === 0) {
        const fallback = getInitialNoteActivity(leadId);
        if (fallback) result = [fallback];
      }
    }
    return NextResponse.json(result);
  }

  try {
    const supabase = createSupabaseClient();
    let query = supabase.from('lead_activities').select('*').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch lead_activities error, using local store:', error);
      let result = getStoredActivities();
      if (leadId) {
        result = result.filter((i) => i.lead_id === leadId);
        if (result.length === 0) {
          const fallback = getInitialNoteActivity(leadId);
          if (fallback) result = [fallback];
        }
      }
      return NextResponse.json(result);
    }
    let list = data || [];
    if (leadId && list.length === 0) {
      const fallback = getInitialNoteActivity(leadId);
      if (fallback) list = [fallback];
    }
    return NextResponse.json(list);
  } catch (err) {
    let result = getStoredActivities();
    if (leadId) {
      result = result.filter((i) => i.lead_id === leadId);
      if (result.length === 0) {
        const fallback = getInitialNoteActivity(leadId);
        if (fallback) result = [fallback];
      }
    }
    return NextResponse.json(result);
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const nowISO = new Date().toISOString();
    const activityId = body.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newActivity: LeadActivity = {
      id: activityId,
      lead_id,
      activity_type: activity_type || 'phone_call',
      activity_date: body.activity_date || nowISO,
      created_at: body.created_at || nowISO,
      notes: notes || '',
      outcome: outcome || null,
      next_action: next_action || null,
      updated_interest_level: updated_interest_level || null,
      updated_booking_stage: updated_booking_stage || null,
      updated_preferred_date: updated_preferred_date || null,
      next_followup_date: next_followup_date || null,
      team_member: team_member || 'Agent',
    };

    // Save activity in persistent local store
    saveStoredActivity(newActivity);

    // Update lead fields locally
    const leadUpdates: Record<string, any> = {
      last_contacted_date: nowISO,
      updated_at: nowISO,
    };
    if (updated_interest_level) {
      leadUpdates.interest_level = updated_interest_level;
      leadUpdates.lead_temperature = updated_interest_level;
    }
    if (updated_booking_stage) {
      leadUpdates.booking_stage = updated_booking_stage;
    }
    if (updated_preferred_date) {
      leadUpdates.preferred_travel_date = updated_preferred_date;
      leadUpdates.preferred_date = updated_preferred_date;
    }
    if (next_followup_date) {
      leadUpdates.next_followup_date = next_followup_date;
      if (body.next_followup_time) leadUpdates.next_followup_time = body.next_followup_time;
      if (body.next_followup_status) leadUpdates.next_followup_status = body.next_followup_status;
    }

    updateStoredLead(lead_id, leadUpdates);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseClient();

        // Standard insert payload matching lead_activities table
        const insertPayload = {
          id: newActivity.id,
          lead_id: newActivity.lead_id,
          activity_type: newActivity.activity_type,
          activity_date: newActivity.activity_date,
          notes: newActivity.notes,
          outcome: newActivity.outcome,
          next_action: newActivity.next_action,
          next_followup_date: newActivity.next_followup_date,
          team_member: newActivity.team_member,
          created_at: newActivity.created_at,
        };

        const { data, error } = await supabase
          .from('lead_activities')
          .insert([insertPayload])
          .select()
          .single();

        if (error) {
          console.error('Supabase lead_activities insert error:', error.message);
        }

        // Also update parent lead in Supabase
        const supabaseLeadUpdates: Record<string, any> = {
          last_contacted_date: nowISO,
          updated_at: nowISO,
        };
        if (updated_interest_level) {
          supabaseLeadUpdates.lead_temperature = updated_interest_level;
        }
        if (updated_booking_stage) {
          supabaseLeadUpdates.booking_stage = updated_booking_stage;
        }
        if (updated_preferred_date) {
          supabaseLeadUpdates.preferred_date = updated_preferred_date;
        }
        if (next_followup_date) {
          supabaseLeadUpdates.next_followup_date = next_followup_date;
        }

        await supabase.from('leads').update(supabaseLeadUpdates).eq('id', lead_id);

        if (data) return NextResponse.json(data, { status: 201 });
      } catch (dbErr: any) {
        console.error('Supabase error inserting activity:', dbErr?.message || dbErr);
      }
    }

    return NextResponse.json(newActivity, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create activity:', err);
    return NextResponse.json({ error: err.message || 'Failed to create activity' }, { status: 500 });
  }
}
