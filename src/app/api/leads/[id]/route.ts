import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLeads, updateStoredLead, deleteStoredLead } from '@/lib/leadStore';

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
    return NextResponse.json(data);
  } catch (err: any) {
    const leads = getStoredLeads();
    const lead = leads.find((l) => l.id === id);
    if (lead) return NextResponse.json(lead);
    return NextResponse.json({ error: err.message || 'Lead not found' }, { status: 404 });
  }
}

import { normalizePhoneNumber } from '@/lib/utils';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { id: _id, created_at, ...updates } = body;

  if (updates.whatsapp_number) {
    updates.whatsapp_number = normalizePhoneNumber(updates.whatsapp_number);
  }

  if (!isSupabaseConfigured()) {
    const updated = updateStoredLead(id, updates);
    if (!updated) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    deleteStoredLead(id);
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

