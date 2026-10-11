import { NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLeads } from '@/lib/leadStore';

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Supabase is not configured yet. Please put your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY into .env.local',
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseClient();
    const storedLeads = getStoredLeads();

    if (storedLeads.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No stored leads to sync.' });
    }

    const payload = storedLeads.map((l) => ({
      id: l.id,
      full_name: l.full_name,
      whatsapp_number: l.whatsapp_number,
      destination: l.preferred_destination,
      preferred_destination: l.preferred_destination,
      preferred_date: l.preferred_travel_date,
      preferred_travel_date: l.preferred_travel_date,
      booking_stage: l.booking_stage,
      lead_temperature: l.lead_temperature,
      interest_level: l.interest_level,
      lead_source: l.lead_source,
      assigned_team_member: l.assigned_team_member,
      departure_city: l.departure_city,
      advance_amount: l.advance_amount,
      payment_date: l.payment_date,
      notes: l.notes,
      next_followup_date: l.next_followup_date,
      created_at: l.created_at,
      updated_at: l.updated_at,
    }));

    const { error } = await supabase.from('leads').upsert(payload, { onConflict: 'id' });
    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: payload.length,
      message: `Successfully synced ${payload.length} leads into Supabase public.leads table!`,
    });
  } catch (err: any) {
    console.error('Error syncing leads to Supabase:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
