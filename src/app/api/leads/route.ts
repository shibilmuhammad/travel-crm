import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getMockLeads } from '@/lib/mockData';
import { Lead } from '@/types';
import { getStoredLeads, saveStoredLead, saveAllStoredLeads, updateStoredLead } from '@/lib/leadStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') || '';
  const destination = searchParams.get('destination') || '';
  const interestLevel = searchParams.get('interest_level') || '';
  const bookingStage = searchParams.get('booking_stage') || '';
  const followupDate = searchParams.get('followup_date') || '';
  const leadSource = searchParams.get('lead_source') || '';
  const dateFlexibility = searchParams.get('date_flexibility') || '';
  const preferredDate = searchParams.get('preferred_date') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '25');

  const batchId = searchParams.get('batch_id') || '';
  const assignedTeamMember = searchParams.get('assigned_team_member') || '';
  const leadTemperature = searchParams.get('lead_temperature') || '';
  const month = searchParams.get('month') || '';

  if (!isSupabaseConfigured()) {
    const currentLeads = getStoredLeads();
    const result = getMockLeads({
      search,
      destination,
      interestLevel,
      bookingStage,
      booking_stage: bookingStage,
      followupDate,
      leadSource,
      dateFlexibility,
      preferredDate,
      preferred_date: preferredDate,
      batch_id: batchId,
      assigned_team_member: assignedTeamMember,
      lead_temperature: leadTemperature,
      month,
      sortBy,
      sortOrder,
      page: page.toString(),
      pageSize: pageSize.toString(),
    }, currentLeads);
    return NextResponse.json(result);
  }

  try {
    const supabase = createSupabaseClient();
    let query = supabase.from('leads').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%,whatsapp_profile_name.ilike.%${search}%`);
    }
    if (destination) {
      query = query.ilike('preferred_destination', `%${destination}%`);
    }
    if (interestLevel) {
      query = query.eq('interest_level', interestLevel);
    }
    if (bookingStage) {
      query = query.eq('booking_stage', bookingStage);
    }
    if (followupDate) {
      query = query.eq('next_followup_date', followupDate);
    }
    if (leadSource) {
      query = query.eq('lead_source', leadSource);
    }
    if (dateFlexibility) {
      query = query.eq('date_flexibility', dateFlexibility);
    }
    if (preferredDate) {
      query = query.eq('preferred_travel_date', preferredDate);
    }

    const validSorts = ['created_at', 'last_contacted_date', 'next_followup_date', 'full_name', 'interest_level'];
    const safeSort = validSorts.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(safeSort, { ascending: sortOrder === 'asc', nullsFirst: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      leads: data,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (err) {
    const currentLeads = getStoredLeads();
    const result = getMockLeads({ search, destination, interestLevel, bookingStage, sortBy, sortOrder }, currentLeads);
    return NextResponse.json(result);
  }
}

import { normalizePhoneNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isSupabaseConfigured()) {
    const nowISO = new Date().toISOString();
    const normPhone = normalizePhoneNumber(body.whatsapp_number);
    const inputDigits = normPhone.replace(/\D/g, '').slice(-10);

    const currentLeads = getStoredLeads();

    // Duplicate detection by 10-digit phone number
    if (inputDigits) {
      const existingIndex = currentLeads.findIndex((l) => {
        const lDigits = (l.whatsapp_number || '').replace(/\D/g, '').slice(-10);
        return lDigits === inputDigits;
      });

      if (existingIndex !== -1) {
        const existing = currentLeads[existingIndex];
        const updatedLead: Lead = {
          ...existing,
          updated_at: nowISO,
          full_name: (body.full_name && body.full_name !== normPhone) ? body.full_name : existing.full_name,
          email: body.email || existing.email,
          departure_city: body.departure_city || existing.departure_city,
          preferred_destination: body.preferred_destination || existing.preferred_destination,
          preferred_travel_date: body.preferred_travel_date || existing.preferred_travel_date,
          batch_id: body.batch_id || existing.batch_id,
          lead_temperature: body.lead_temperature || existing.lead_temperature,
          interest_level: body.interest_level || existing.interest_level,
          booking_stage: body.booking_stage || existing.booking_stage,
          advance_amount: body.advance_amount ?? existing.advance_amount,
          payment_date: body.payment_date || existing.payment_date,
          notes: body.notes ? (existing.notes && existing.notes !== body.notes ? `${existing.notes} | ${body.notes}` : body.notes) : existing.notes,
          next_followup_date: body.next_followup_date || existing.next_followup_date,
          assigned_team_member: body.assigned_team_member || existing.assigned_team_member,
        };

        saveStoredLead(updatedLead);
        return NextResponse.json({ ...updatedLead, isDuplicate: true }, { status: 200 });
      }
    }

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      created_at: nowISO,
      updated_at: nowISO,
      full_name: body.full_name || 'New Lead',
      whatsapp_number: normPhone,
      whatsapp_profile_name: body.whatsapp_profile_name || '',
      lead_source: body.lead_source || 'whatsapp',
      preferred_destination: body.preferred_destination || '',
      preferred_travel_date: body.preferred_travel_date || '',
      date_flexibility: body.date_flexibility || 'not_decided',
      departure_city: body.departure_city || null,
      number_of_travellers: Number(body.number_of_travellers || body.pax_count) || 1,
      budget_per_person: Number(body.budget_per_person) || null,
      advance_amount: body.advance_amount ? Number(body.advance_amount) : null,
      payment_date: body.payment_date || null,
      lead_temperature: body.lead_temperature || body.interest_level || 'new',
      interest_level: body.interest_level || body.lead_temperature || 'new',
      booking_stage: body.booking_stage || 'not_contacted',
      preferred_contact_method: body.preferred_contact_method || 'whatsapp',
      next_followup_date: body.next_followup_date || null,
      next_followup_time: body.next_followup_time || null,
      last_contacted_date: nowISO,
      assigned_team_member: body.assigned_team_member || body.assigned_to || null,
      batch_id: body.batch_id || null,
      ad_campaign: body.ad_campaign || null,
      ad_id: body.ad_id || null,
      notes: body.notes || '',
    };
    saveStoredLead(newLead);
    return NextResponse.json(newLead, { status: 201 });
  }

  try {
    const supabase = createSupabaseClient();
    const nowISO = new Date().toISOString();
    const leadId = body.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const insertPayload = {
      id: leadId,
      full_name: body.full_name || 'New Lead',
      whatsapp_number: body.whatsapp_number || '',
      whatsapp_profile_name: body.whatsapp_profile_name || '',
      email: body.email || null,
      departure_city: body.departure_city || null,
      preferred_destination: body.preferred_destination || body.destination || '',
      preferred_travel_date: body.preferred_travel_date || body.preferred_date || '',
      date_flexibility: body.date_flexibility || 'not_decided',
      lead_source: body.lead_source || 'manual_entry',
      assigned_team_member: body.assigned_team_member || body.assigned_to || null,
      lead_temperature: body.lead_temperature || body.interest_level || 'new',
      booking_stage: body.booking_stage || 'not_contacted',
      advance_amount: body.advance_amount ? Number(body.advance_amount) : null,
      payment_date: body.payment_date || null,
      notes: body.notes || '',
      next_followup_date: body.next_followup_date || null,
      batch_id: body.batch_id || null,
      created_at: body.created_at || nowISO,
      updated_at: nowISO,
    };

    const { data, error } = await supabase.from('leads').insert([insertPayload]).select().single();
    if (error) {
      console.error('Supabase lead insert error:', error);
      // Fallback save locally if Supabase table is not set up
      saveStoredLead(insertPayload);
      return NextResponse.json(insertPayload, { status: 201 });
    }
    saveStoredLead(data);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Failed to insert lead to Supabase:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
