import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { updateStoredTeamMember, deleteStoredTeamMember } from '@/lib/teamStore';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (!isSupabaseConfigured()) {
    const updated = updateStoredTeamMember(id, body);
    if (updated) {
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('team_members').update(body).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    deleteStoredTeamMember(id);
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

