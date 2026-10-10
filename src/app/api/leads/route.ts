import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getMockLeads } from '@/lib/mockData';
import { Lead } from '@/types';
import { getStoredLeads, saveStoredLead, saveAllStoredLeads } from '@/lib/leadStore';
import { normalizePhoneNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') || '';
  const destination = searchParams.get('destination') || '';
  const interestLevel = searchParams.get('interest_level') || searchParams.get('interestLevel') || '';
  const bookingStage = searchParams.get('booking_stage') || searchParams.get('bookingStage') || '';
  const followupDate = searchParams.get('followup_date') || searchParams.get('followupDate') || '';
  const leadSource = searchParams.get('lead_source') || searchParams.get('leadSource') || '';
  const dateFlexibility = searchParams.get('date_flexibility') || searchParams.get('dateFlexibility') || '';
  const preferredDate = searchParams.get('preferred_date') || searchParams.get('preferredDate') || '';
  const sortBy = searchParams.get('sort_by') || searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || searchParams.get('pageSize') || '500');

  const batchId = searchParams.get('batch_id') || searchParams.get('batchId') || '';
  const assignedTeamMember = searchParams.get('assigned_team_member') || searchParams.get('assignedTo') || '';
  const leadTemperature = searchParams.get('lead_temperature') || searchParams.get('leadTemperature') || '';
  const month = searchParams.get('month') || '';

  if (!isSupabaseConfigured()) {
    const currentLeads = getStoredLeads();
    const result = getMockLeads({
      search,
      destination,
      interestLevel,
      interest_level: interestLevel,
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
    if (destination && destination !== 'all') {
      query = query.or(`preferred_destination.ilike.%${destination}%,destination.ilike.%${destination}%`);
    }
    if (interestLevel && interestLevel !== 'all') {
      query = query.or(`interest_level.eq.${interestLevel},lead_temperature.eq.${interestLevel}`);
    }
    if (leadTemperature && leadTemperature !== 'all') {
      query = query.or(`lead_temperature.eq.${leadTemperature},interest_level.eq.${leadTemperature}`);
    }
    if (bookingStage && bookingStage !== 'all') {
      query = query.eq('booking_stage', bookingStage);
    }
    if (followupDate) {
      query = query.or(`next_followup_date.eq.${followupDate}`);
    }
    if (leadSource && leadSource !== 'all') {
      query = query.eq('lead_source', leadSource);
    }
    if (dateFlexibility && dateFlexibility !== 'all') {
      query = query.eq('date_flexibility', dateFlexibility);
    }
    if (preferredDate && preferredDate !== 'all') {
      query = query.or(`preferred_travel_date.ilike.%${preferredDate}%,preferred_date.ilike.%${preferredDate}%`);
    }
    if (batchId && batchId !== 'all') {
      query = query.eq('batch_id', batchId);
    }
    if (assignedTeamMember && assignedTeamMember !== 'all') {
      query = query.ilike('assigned_team_member', `%${assignedTeamMember}%`);
    }
    if (month && month !== 'all') {
      query = query.or(`preferred_travel_date.ilike.%${month}%,preferred_date.ilike.%${month}%`);
    }

    const validSorts = ['created_at', 'last_contacted_date', 'next_followup_date', 'full_name', 'interest_level'];
    const safeSort = validSorts.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(safeSort, { ascending: sortOrder === 'asc', nullsFirst: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase fetch leads error, falling back to stored leads:', error);
      const currentLeads = getStoredLeads();
      const result = getMockLeads({
        search,
        destination,
        interestLevel,
        interest_level: interestLevel,
        bookingStage,
        booking_stage: bookingStage,
        batch_id: batchId,
        assigned_team_member: assignedTeamMember,
        lead_temperature: leadTemperature,
        preferred_date: preferredDate,
        month,
        sortBy,
        sortOrder,
      }, currentLeads);
      return NextResponse.json(result);
    }

    const storedLeads = getStoredLeads();

    // Normalize rows so frontend gets complete Lead object properties
    const normalizedData = (data || []).map((row: any) => {
      const matchedLocal = storedLeads.find((sl) => sl.id === row.id || (sl.whatsapp_number && sl.whatsapp_number === row.whatsapp_number));
      return {
        ...row,
        preferred_destination: row.preferred_destination || row.destination || matchedLocal?.preferred_destination || '',
        preferred_travel_date: row.preferred_travel_date || row.preferred_date || matchedLocal?.preferred_travel_date || '',
        number_of_travellers: Number(row.number_of_travellers || row.pax_count || matchedLocal?.number_of_travellers) || 1,
        budget_per_person: Number(row.budget_per_person || row.budget || matchedLocal?.budget_per_person) || null,
        lead_temperature: row.lead_temperature || row.interest_level || matchedLocal?.lead_temperature || 'new',
        interest_level: row.interest_level || row.lead_temperature || matchedLocal?.interest_level || 'new',
        advance_amount: row.advance_amount !== undefined && row.advance_amount !== null ? row.advance_amount : (matchedLocal?.advance_amount ?? null),
        payment_date: row.payment_date || matchedLocal?.payment_date || null,
        next_followup_date: row.next_followup_date || matchedLocal?.next_followup_date || null,
        next_followup_time: row.next_followup_time || matchedLocal?.next_followup_time || null,
        next_followup_status: row.next_followup_status || matchedLocal?.next_followup_status || null,
      };
    });

    if (normalizedData.length > 0) {
      saveAllStoredLeads(normalizedData);
    }

    return NextResponse.json({
      leads: normalizedData,
      total: count || normalizedData.length,
      page,
      pageSize,
      totalPages: Math.ceil((count || normalizedData.length) / pageSize),
    });
  } catch (err) {
    console.error('Error in GET /api/leads:', err);
    const currentLeads = getStoredLeads();
    const result = getMockLeads({ search, destination, interestLevel, bookingStage, sortBy, sortOrder }, currentLeads);
    return NextResponse.json(result);
  }
}

const SAFE_CORE_COLUMNS = [
  'id', 'full_name', 'whatsapp_number', 'whatsapp_profile_name', 'email',
  'departure_city', 'destination', 'preferred_destination', 'preferred_date',
  'preferred_travel_date', 'date_flexibility', 'lead_source', 'assigned_team_member',
  'lead_temperature', 'interest_level', 'booking_stage', 'pax_count', 'budget',
  'notes', 'batch_id', 'created_at', 'updated_at'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nowISO = new Date().toISOString();
    const normPhone = normalizePhoneNumber(body.whatsapp_number || body.phone || '');

    const leadId = body.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const destination = body.preferred_destination || body.destination || '';
    const travelDate = body.preferred_travel_date || body.preferred_date || '';

    const newLead: Lead = {
      id: leadId,
      created_at: body.created_at || nowISO,
      updated_at: nowISO,
      full_name: body.full_name || 'New Lead',
      whatsapp_number: normPhone,
      whatsapp_profile_name: body.whatsapp_profile_name || '',
      email: body.email || null,
      lead_source: body.lead_source || 'manual_entry',
      preferred_destination: destination,
      preferred_travel_date: travelDate,
      date_flexibility: body.date_flexibility || 'not_decided',
      departure_city: body.departure_city || null,
      number_of_travellers: Number(body.number_of_travellers || body.pax_count) || 1,
      budget_per_person: body.budget_per_person ? Number(body.budget_per_person) : (body.budget ? Number(body.budget) : null),
      advance_amount: body.advance_amount ? Number(body.advance_amount) : null,
      payment_date: body.payment_date || null,
      lead_temperature: body.lead_temperature || body.interest_level || 'new',
      interest_level: body.interest_level || body.lead_temperature || 'new',
      booking_stage: body.booking_stage || 'not_contacted',
      preferred_contact_method: body.preferred_contact_method || 'whatsapp',
      next_followup_date: body.next_followup_date || null,
      next_followup_time: body.next_followup_time || null,
      next_followup_status: body.next_followup_date ? 'pending' : null,
      last_contacted_date: nowISO,
      assigned_team_member: body.assigned_team_member || body.assigned_to || null,
      batch_id: body.batch_id || null,
      ad_campaign: body.ad_campaign || null,
      ad_id: body.ad_id || null,
      notes: body.notes || '',
    };

    // Always update local/in-memory store first
    saveStoredLead(newLead);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseClient();

        // Check for duplicate lead by whatsapp_number
        let targetId = newLead.id;
        let isDuplicate = false;
        if (normPhone) {
          const { data: existing } = await supabase
            .from('leads')
            .select('id')
            .eq('whatsapp_number', normPhone)
            .maybeSingle();

          if (existing && existing.id) {
            targetId = existing.id;
            isDuplicate = true;
          }
        }

        // Primary payload compatible with full schema
        const insertPayload: Record<string, any> = {
          id: targetId,
          full_name: newLead.full_name,
          whatsapp_number: newLead.whatsapp_number,
          whatsapp_profile_name: newLead.whatsapp_profile_name,
          email: newLead.email,
          departure_city: newLead.departure_city,
          destination: newLead.preferred_destination,
          preferred_destination: newLead.preferred_destination,
          preferred_date: newLead.preferred_travel_date,
          preferred_travel_date: newLead.preferred_travel_date,
          date_flexibility: newLead.date_flexibility,
          lead_source: newLead.lead_source,
          assigned_team_member: newLead.assigned_team_member,
          lead_temperature: newLead.lead_temperature,
          interest_level: newLead.interest_level,
          booking_stage: newLead.booking_stage,
          pax_count: newLead.number_of_travellers,
          budget: newLead.budget_per_person ? String(newLead.budget_per_person) : null,
          advance_amount: newLead.advance_amount,
          payment_date: newLead.payment_date,
          next_followup_date: newLead.next_followup_date,
          next_followup_time: newLead.next_followup_time,
          next_followup_status: newLead.next_followup_date ? 'pending' : null,
          notes: newLead.notes,
          batch_id: newLead.batch_id,
          created_at: newLead.created_at,
          updated_at: newLead.updated_at,
        };

        // Dynamic column stripping loop: if Supabase complains a column is missing in schema, strip it and retry
        let currentPayload: Record<string, any> = { ...insertPayload };
        let { data, error } = await supabase
          .from('leads')
          .upsert([currentPayload], { onConflict: 'id' })
          .select()
          .single();

        let retries = 15;
        while (error && (error.code === 'PGRST204' || error.message.includes('column')) && retries > 0) {
          retries--;
          const match = error.message.match(/Could not find the '([^']+)' column/i);
          if (match && match[1]) {
            const missingCol = match[1];
            console.warn(`Supabase missing column '${missingCol}', stripping and retrying...`);
            delete currentPayload[missingCol];
          } else {
            const ABSOLUTE_MINIMAL_COLS = [
              'id', 'full_name', 'whatsapp_number', 'destination', 'preferred_date',
              'lead_temperature', 'booking_stage', 'lead_source', 'assigned_team_member',
              'created_at', 'updated_at'
            ];
            const minimalPayload: Record<string, any> = {};
            for (const c of ABSOLUTE_MINIMAL_COLS) {
              if (c in currentPayload) minimalPayload[c] = currentPayload[c];
            }
            currentPayload = minimalPayload;
          }

          const retryRes = await supabase
            .from('leads')
            .upsert([currentPayload], { onConflict: 'id' })
            .select()
            .single();

          data = retryRes.data;
          error = retryRes.error;
        }

        if (data) {
          return NextResponse.json({ ...newLead, ...data, isDuplicate }, { status: 201 });
        }
      } catch (dbErr: any) {
        console.error('Supabase error inserting lead:', dbErr?.message || dbErr);
      }
    }

    return NextResponse.json(newLead, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create lead:', err);
    return NextResponse.json({ error: err.message || 'Failed to create lead' }, { status: 500 });
  }
}
