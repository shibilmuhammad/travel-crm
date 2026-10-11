import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { Lead } from '@/types';
import { getStoredLeads, saveAllStoredLeads, clearStoredLeads } from '@/lib/leadStore';
import { clearStoredActivities } from '@/lib/activityStore';
import { normalizePhoneNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: Record<string, any>[] = Array.isArray(body) ? body : (body.leads || []);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ count: 0, duplicates: 0, skipped: 0, duplicateLeads: [] });
    }

    const cleanReimport = Boolean(body?.clean_reimport || body?.cleanReimport);
    if (cleanReimport) {
      clearStoredLeads();
      clearStoredActivities();
    }

    const currentLeads = cleanReimport ? [] : [...getStoredLeads()];
    const phoneMap = new Map<string, Lead>();
    currentLeads.forEach((l) => {
      const p = normalizePhoneNumber(l.whatsapp_number);
      if (p) phoneMap.set(p, l);
    });

    let importedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    const foundDuplicates: any[] = [];
    const newLeadsToAppend: Lead[] = [];
    const nowISO = new Date().toISOString();

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNumber = Number(row.rowNumber || idx + 2);

      const normPhone = normalizePhoneNumber(row.whatsapp_number || row.phone || '');
      if (!normPhone || normPhone === '—') {
        skippedCount++;
        continue;
      }

      // Check duplicate
      const existing = phoneMap.get(normPhone);
      if (existing) {
        duplicateCount++;
        // Update existing record with any newly provided non-empty fields
        if (row.advance_amount !== null && row.advance_amount !== undefined) {
          existing.advance_amount = Number(row.advance_amount);
        }
        if (row.payment_date) existing.payment_date = row.payment_date;
        if (row.booking_stage && row.booking_stage !== 'not_contacted') {
          existing.booking_stage = row.booking_stage;
        }
        if (row.notes) {
          existing.notes = existing.notes ? `${existing.notes} | ${row.notes}` : row.notes;
        }
        if (row.next_followup_date) {
          existing.next_followup_date = row.next_followup_date;
          existing.next_followup_time = row.next_followup_time || '10:00 AM';
          existing.next_followup_status = 'pending';
        }
        existing.updated_at = nowISO;

        foundDuplicates.push({
          rowNumber,
          uploadedName: row.full_name || row.name || normPhone,
          phone: normPhone,
          existingName: existing.full_name || normPhone,
          destination: existing.preferred_destination || existing.destination || row.preferred_destination || '',
          bookingStage: existing.booking_stage || row.booking_stage || 'not_contacted',
          advanceAmount: existing.advance_amount !== undefined && existing.advance_amount !== null
            ? Number(existing.advance_amount)
            : (row.advance_amount ? Number(row.advance_amount) : null),
          assignedTo: existing.assigned_team_member || 'Shibil Muhammad',
        });
        continue;
      }

      // Valid new lead
      const leadId = row.id || `lead-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const dest = row.preferred_destination || row.destination || 'Vattavada';
      const travelDate = row.preferred_travel_date || row.preferred_date || '';
      const nextFollowup = row.next_followup_date || null;

      let assignedMember = row.assigned_team_member || 'Shibil Muhammad';
      if (!assignedMember || assignedMember.toLowerCase() === 'unassigned' || assignedMember.toLowerCase() === 'shibil') {
        assignedMember = 'Shibil Muhammad';
      }

      const newLead: Lead = {
        id: leadId,
        created_at: row.created_at || nowISO,
        updated_at: nowISO,
        full_name: (row.full_name || row.name || normPhone).trim(),
        whatsapp_number: normPhone,
        whatsapp_profile_name: row.whatsapp_profile_name || '',
        email: row.email || null,
        lead_source: row.lead_source || 'manual_entry',
        preferred_destination: dest,
        preferred_travel_date: travelDate,
        date_flexibility: row.date_flexibility || 'not_decided',
        departure_city: row.departure_city || row.city || null,
        number_of_travellers: Number(row.number_of_travellers || row.pax_count) || 1,
        budget_per_person: row.budget_per_person ? Number(row.budget_per_person) : null,
        advance_amount: row.advance_amount ? Number(row.advance_amount) : null,
        payment_date: row.payment_date || null,
        lead_temperature: row.lead_temperature || row.interest_level || 'new',
        interest_level: row.interest_level || row.lead_temperature || 'new',
        booking_stage: row.booking_stage || 'not_contacted',
        preferred_contact_method: 'whatsapp',
        next_followup_date: nextFollowup,
        next_followup_time: row.next_followup_time || (nextFollowup ? '10:00 AM' : null),
        next_followup_status: nextFollowup ? 'pending' : null,
        last_contacted_date: nowISO,
        assigned_team_member: assignedMember,
        batch_id: row.batch_id || null,
        ad_campaign: null,
        ad_id: null,
        notes: row.notes || '',
      };

      newLeadsToAppend.push(newLead);
      phoneMap.set(normPhone, newLead);
      importedCount++;
    }

    const merged = cleanReimport
      ? newLeadsToAppend
      : [...newLeadsToAppend, ...currentLeads];
    saveAllStoredLeads(merged);

    if (isSupabaseConfigured() && newLeadsToAppend.length > 0) {
      try {
        const supabase = createSupabaseClient();
        const supabasePayload = newLeadsToAppend.map((l) => ({
          id: l.id,
          full_name: l.full_name,
          whatsapp_number: l.whatsapp_number,
          destination: l.preferred_destination,
          preferred_date: l.preferred_travel_date,
          booking_stage: l.booking_stage,
          lead_temperature: l.lead_temperature,
          lead_source: l.lead_source,
          assigned_team_member: l.assigned_team_member,
          departure_city: l.departure_city,
          notes: l.notes,
          created_at: l.created_at,
          updated_at: l.updated_at,
        }));
        await supabase.from('leads').upsert(supabasePayload, { onConflict: 'id' });
      } catch (dbErr: any) {
        console.warn('Supabase bulk upsert error:', dbErr?.message || dbErr);
      }
    }

    return NextResponse.json({
      count: importedCount,
      duplicates: duplicateCount,
      skipped: skippedCount,
      duplicateLeads: foundDuplicates,
    });
  } catch (err: any) {
    console.error('Failed to import leads in bulk:', err);
    return NextResponse.json({ error: err.message || 'Failed to import bulk leads' }, { status: 500 });
  }
}
