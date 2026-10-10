import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredBatches, saveStoredBatch } from '@/lib/batchStore';
import { TripBatch } from '@/types';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(getStoredBatches());
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('trip_batches')
      .select('*')
      .order('proposed_date', { ascending: true });

    if (error) {
      console.error('Supabase error fetching batches, using local store:', error);
      return NextResponse.json(getStoredBatches());
    }

    if (data && data.length > 0) {
      return NextResponse.json(data);
    }
    return NextResponse.json(getStoredBatches());
  } catch (err) {
    console.error('Error fetching batches:', err);
    return NextResponse.json(getStoredBatches());
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

    // Save to local JSON store as primary/fallback
    saveStoredBatch(newBatch);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseClient();
        const insertPayload = {
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
          .insert([insertPayload])
          .select()
          .single();

        if (error) {
          console.error('Supabase insert batch error (saved to local fallback):', error);
        } else if (data) {
          return NextResponse.json(data, { status: 201 });
        }
      } catch (dbErr) {
        console.error('Supabase client error on batch insert:', dbErr);
      }
    }

    return NextResponse.json(newBatch, { status: 201 });
  } catch (err: any) {
    console.error('Error creating batch:', err);
    return NextResponse.json({ error: err.message || 'Failed to create batch' }, { status: 500 });
  }
}
