import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLeads, updateStoredLead, deleteStoredLead } from '@/lib/leadStore';
import { normalizePhoneNumber } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    const leads = getStoredLeads();
    const lead = leads.find((l) => l.id === id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(lead);
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    if (error) throw error;

    const normalized = {
      ...data,
      preferred_destination: data.preferred_destination || data.destination || '',
      preferred_travel_date: data.preferred_travel_date || data.preferred_date || '',
      number_of_travellers: Number(data.number_of_travellers || data.pax_count) || 1,
      budget_per_person: Number(data.budget_per_person || data.budget) || null,
      lead_temperature: data.lead_temperature || data.interest_level || 'new',
      interest_level: data.interest_level || data.lead_temperature || 'new',
    };

    return NextResponse.json(normalized);
  } catch (err: any) {
    const leads = getStoredLeads();
    const lead = leads.find((l) => l.id === id);
    if (lead) return NextResponse.json(lead);
    return NextResponse.json({ error: err.message || 'Lead not found' }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { id: _id, created_at, ...updates } = body;
  updates.updated_at = new Date().toISOString();

  if (updates.whatsapp_number) {
    updates.whatsapp_number = normalizePhoneNumber(updates.whatsapp_number);
  }

  // Always update local/in-memory store first
  const updatedLocal = updateStoredLead(id, updates);

  if (!isSupabaseConfigured()) {
    if (!updatedLocal) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(updatedLocal);
  }

  try {
    const supabase = createSupabaseClient();

    // Primary formatted payload for Supabase update
    const patchPayload: Record<string, any> = { ...updates };
    if (updates.preferred_destination) {
      patchPayload.destination = updates.preferred_destination;
    }
    if (updates.preferred_travel_date) {
      patchPayload.preferred_date = updates.preferred_travel_date;
    }
    if (updates.number_of_travellers) {
      patchPayload.pax_count = updates.number_of_travellers;
    }
    if (updates.budget_per_person) {
      patchPayload.budget = String(updates.budget_per_person);
    }
    if (updates.interest_level && !updates.lead_temperature) {
      patchPayload.lead_temperature = updates.interest_level;
    }

    let { data, error } = await supabase
      .from('leads')
      .update(patchPayload)
      .eq('id', id)
      .select()
      .single();

    // Fallback if schema is missing an optional column
    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      console.warn('Supabase lead patch missing column, retrying with core columns:', error.message);
      
      const corePatch: Record<string, any> = {};
      const allowedCols = [
        'full_name', 'whatsapp_number', 'email', 'destination', 'preferred_destination',
        'preferred_date', 'preferred_travel_date', 'date_flexibility', 'pax_count',
        'departure_city', 'lead_temperature', 'interest_level', 'booking_stage',
        'lead_source', 'assigned_team_member', 'batch_id', 'budget', 'notes', 'updated_at'
      ];

      for (const col of allowedCols) {
        if (col in patchPayload) {
          corePatch[col] = patchPayload[col];
        }
      }

      const retryRes = await supabase
        .from('leads')
        .update(corePatch)
        .eq('id', id)
        .select()
        .single();

      if (retryRes.data) {
        data = retryRes.data;
        error = null;
      }
    }

    if (error) {
      console.error('Supabase PATCH lead error, returning local updated version:', error.message);
      if (updatedLocal) return NextResponse.json(updatedLocal);
      throw error;
    }

    const normalized = {
      ...data,
      preferred_destination: data.preferred_destination || data.destination || '',
      preferred_travel_date: data.preferred_travel_date || data.preferred_date || '',
      number_of_travellers: Number(data.number_of_travellers || data.pax_count) || 1,
      budget_per_person: Number(data.budget_per_person || data.budget) || null,
      lead_temperature: data.lead_temperature || data.interest_level || 'new',
      interest_level: data.interest_level || data.lead_temperature || 'new',
    };

    return NextResponse.json(normalized);
  } catch (err: any) {
    if (updatedLocal) return NextResponse.json(updatedLocal);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteStoredLead(id);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) console.error('Supabase delete lead error:', error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting lead:', err);
    return NextResponse.json({ success: true });
  }
}
