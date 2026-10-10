import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_BATCHES } from '@/lib/mockData';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { id: _id, created_at, ...updates } = body;

  if (!isSupabaseConfigured()) {
    const idx = MOCK_BATCHES.findIndex((b) => b.id === id);
    if (idx !== -1) {
      MOCK_BATCHES[idx] = { ...MOCK_BATCHES[idx], ...updates };
      return NextResponse.json(MOCK_BATCHES[idx]);
    }
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('trip_batches')
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
    const idx = MOCK_BATCHES.findIndex((b) => b.id === id);
    if (idx !== -1) MOCK_BATCHES.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('trip_batches').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
