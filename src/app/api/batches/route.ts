import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredBatches, saveStoredBatch } from '@/lib/batchStore';
import { getStoredLeads } from '@/lib/leadStore';
import { TripBatch } from '@/types';


function leadMatchesBatch(lead: any, batch: any): boolean {
  if (lead.batch_id && String(lead.batch_id) === String(batch.id)) {
    return true;
  }
  const bTitle = (batch.title || '').trim().toLowerCase();
  const bDest = (batch.destination || '').trim().toLowerCase();
  const lDest = (lead.preferred_destination || lead.destination || '').trim().toLowerCase();

  if (!lDest) return false;

  if (bTitle && (lDest === bTitle || lDest.includes(bTitle) || bTitle.includes(lDest))) {
    return true;
  }

  if (bDest && (lDest === bDest || lDest.includes(bDest) || bDest.includes(lDest))) {
    return true;
  }

  return false;
}

async function enrichBatchesWithLeadCounts(batches: TripBatch[]): Promise<TripBatch[]> {
  let dbLeads: any[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from('leads')
        .select('id, batch_id, preferred_destination, number_of_travellers, booking_stage')
        .in('booking_stage', ['advance_paid', 'booking_confirmed']);
      if (Array.isArray(data)) {
        dbLeads = data;
      }
    } catch (err) {
      console.warn('Could not query leads for batch counts from Supabase:', err);
    }
  }

  const localLeads = getStoredLeads().filter(
    (l) => l.booking_stage === 'advance_paid' || l.booking_stage === 'booking_confirmed'
  );

  const combinedLeadsMap = new Map<string, any>();
  dbLeads.forEach((l) => combinedLeadsMap.set(l.id, l));
  localLeads.forEach((l) => combinedLeadsMap.set(l.id, l));
  const bookedLeads = Array.from(combinedLeadsMap.values());

  return batches.map((batch) => {
    const matching = bookedLeads.filter((l) => leadMatchesBatch(l, batch));
    const confirmedCount = matching.reduce((sum, l) => {
      const pax = Number(l.number_of_travellers);
      return sum + (isNaN(pax) || pax <= 0 ? 1 : pax);
    }, 0);

    return {
      ...batch,
      confirmed_pax: confirmedCount,
      confirmed_seats: confirmedCount,
    };
  });
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    const enriched = await enrichBatchesWithLeadCounts(getStoredBatches());
    return NextResponse.json(enriched);
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('trip_batches')
      .select('*')
      .order('proposed_date', { ascending: true });

    if (error) {
      console.error('Supabase error fetching batches, using local store:', error);
      const enriched = await enrichBatchesWithLeadCounts(getStoredBatches());
      return NextResponse.json(enriched);
    }

    const raw = (data && data.length > 0) ? data : getStoredBatches();
    const enriched = await enrichBatchesWithLeadCounts(raw);
    return NextResponse.json(enriched);
  } catch (err) {
    console.error('Error fetching batches:', err);
    const enriched = await enrichBatchesWithLeadCounts(getStoredBatches());
    return NextResponse.json(enriched);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nowISO = new Date().toISOString();
    const todayDateStr = nowISO.split('T')[0];

    const batchId = body.id || `batch-${Date.now()}`;
    const destination = body.destination || body.title || 'New Trip';
    const proposedDate = body.proposed_date || body.start_date || todayDateStr;

    const newBatch: TripBatch = {
      id: batchId,
      title: body.title || `${destination} Batch`,
      created_at: body.created_at || nowISO,
      updated_at: body.updated_at || nowISO,
      destination: destination,
      proposed_date: proposedDate,
      start_date: body.start_date || proposedDate,
      end_date: body.end_date || null,
      capacity: Number(body.total_capacity || body.capacity) || 12,
      total_capacity: Number(body.total_capacity || body.capacity) || 12,
      minimum_viable_size: Number(body.minimum_viable_size) || 6,
      departure_city: body.departure_city || null,
      status: body.status || 'open_for_booking',
      proposed_price: Number(body.price_per_pax || body.proposed_price) || 0,
      price_per_pax: Number(body.price_per_pax || body.proposed_price) || 0,
      notes: body.notes || '',
    };

    // Save locally to in-memory store
    saveStoredBatch(newBatch);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseClient();
        const fullPayload = {
          id: newBatch.id,
          destination: newBatch.destination,
          proposed_date: newBatch.proposed_date,
          title: newBatch.title,
          start_date: newBatch.start_date,
          end_date: newBatch.end_date,
          status: newBatch.status,
          proposed_price: newBatch.proposed_price,
          price_per_pax: newBatch.price_per_pax,
          capacity: newBatch.capacity,
          departure_city: newBatch.departure_city,
          notes: newBatch.notes,
          created_at: newBatch.created_at,
          updated_at: newBatch.updated_at,
        };

        const { data, error } = await supabase
          .from('trip_batches')
          .insert([fullPayload])
          .select()
          .single();

        if (error) {
          console.error('Full batch insert error, retriving 3-column fallback payload:', error.message);
          
          // Fallback for tables that currently only have (id, destination, proposed_date)
          const fallbackPayload = {
            id: newBatch.id,
            destination: newBatch.destination,
            proposed_date: newBatch.proposed_date,
          };

          const { data: fbData, error: fbError } = await supabase
            .from('trip_batches')
            .insert([fallbackPayload])
            .select()
            .single();

          if (fbError) {
            console.error('Fallback batch insert error:', fbError.message);
          } else if (fbData) {
            return NextResponse.json(fbData, { status: 201 });
          }
        } else if (data) {
          return NextResponse.json(data, { status: 201 });
        }
      } catch (dbErr: any) {
        console.error('Supabase error during batch creation:', dbErr?.message || dbErr);
      }
    }

    return NextResponse.json(newBatch, { status: 201 });
  } catch (err: any) {
    console.error('Error creating batch:', err);
    return NextResponse.json({ error: err.message || 'Failed to create batch' }, { status: 500 });
  }
}
