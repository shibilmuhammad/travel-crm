import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_BATCHES } from '@/lib/mockData';
import { TripBatch } from '@/types';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(MOCK_BATCHES);
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('trip_batches')
      .select('*')
      .order('proposed_date', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(MOCK_BATCHES);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isSupabaseConfigured()) {
    const nowISO = new Date().toISOString();
    const newBatch: TripBatch = {
      id: `batch-${Date.now()}`,
      title: body.title || `${body.destination} Batch`,
      created_at: nowISO,
      updated_at: nowISO,
      destination: body.destination || 'New Trip',
      proposed_date: body.start_date || body.proposed_date || nowISO.split('T')[0],
      start_date: body.start_date || body.proposed_date || nowISO.split('T')[0],
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
    MOCK_BATCHES.unshift(newBatch);
    return NextResponse.json(newBatch, { status: 201 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('trip_batches').insert([body]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
