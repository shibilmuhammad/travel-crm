import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { updateStoredBatch, deleteStoredBatch, getStoredBatches } from '@/lib/batchStore';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { id: _id, created_at, ...updates } = body;
  updates.updated_at = new Date().toISOString();

  // Always update local store
  const updatedLocal = updateStoredBatch(id, updates);

  if (!isSupabaseConfigured()) {
    if (updatedLocal) {
      return NextResponse.json(updatedLocal);
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

    if (error) {
      console.error('Supabase error updating batch, returning local version:', error);
      if (updatedLocal) return NextResponse.json(updatedLocal);
      throw error;
    }
    return NextResponse.json(data);
  } catch (err: any) {
    if (updatedLocal) return NextResponse.json(updatedLocal);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Delete locally
  deleteStoredBatch(id);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('trip_batches').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete batch error:', error);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting batch from Supabase:', err);
    return NextResponse.json({ success: true }); // local deleted
  }
}
