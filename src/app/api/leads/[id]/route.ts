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
      destination: data.destination || data.preferred_destination || '',
      preferred_travel_date: data.preferred_travel_date || data.preferred_date || '',
      preferred_date: data.preferred_date || data.preferred_travel_date || '',
      number_of_travellers: Number(data.number_of_travellers || data.pax_count) || 1,
      pax_count: Number(data.pax_count || data.number_of_travellers) || 1,
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

  // Ensure dual column alias synchronization
  if (updates.preferred_destination) {
    updates.destination = updates.preferred_destination;
  } else if (updates.destination) {
    updates.preferred_destination = updates.destination;
  }

  if (updates.preferred_travel_date) {
    updates.preferred_date = updates.preferred_travel_date;
  } else if (updates.preferred_date) {
    updates.preferred_travel_date = updates.preferred_date;
  }

  if (updates.lead_temperature) {
    updates.interest_level = updates.lead_temperature;
  } else if (updates.interest_level) {
    updates.lead_temperature = updates.interest_level;
  }

  if (updates.number_of_travellers) {
    updates.pax_count = updates.number_of_travellers;
  } else if (updates.pax_count) {
    updates.number_of_travellers = updates.pax_count;
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
    if (updates.budget_per_person) {
      patchPayload.budget = String(updates.budget_per_person);
    }

    // Dynamic column stripping loop: if Supabase complains a column is missing in schema, strip it and retry
    let currentPayload: Record<string, any> = { ...patchPayload };
    let { data, error } = await supabase
      .from('leads')
      .update(currentPayload)
      .eq('id', id)
      .select()
      .single();

    let retries = 15;
    while (error && (error.code === 'PGRST204' || error.message.includes('column')) && retries > 0) {
      retries--;
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        // Only strip the exact column reported as missing — never blindly drop followup fields
        console.warn(`Supabase PATCH missing column '${missingCol}', stripping and retrying...`);
        delete currentPayload[missingCol];
      } else {
        // Unknown column error — break out to avoid accidentally stripping follow-up fields
        console.warn('Supabase PATCH column error (unknown column), stopping retry:', error.message);
        break;
      }

      const retryRes = await supabase
        .from('leads')
        .update(currentPayload)
        .eq('id', id)
        .select()
        .single();

      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error('Supabase PATCH lead error, returning local updated version:', error.message);
      if (updatedLocal) return NextResponse.json(updatedLocal);
      throw error;
    }

    const normalized = {
      ...data,
      preferred_destination: data.preferred_destination || data.destination || '',
      destination: data.destination || data.preferred_destination || '',
      preferred_travel_date: data.preferred_travel_date || data.preferred_date || '',
      preferred_date: data.preferred_date || data.preferred_travel_date || '',
      number_of_travellers: Number(data.number_of_travellers || data.pax_count) || 1,
      pax_count: Number(data.pax_count || data.number_of_travellers) || 1,
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
