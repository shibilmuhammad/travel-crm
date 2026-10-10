import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { updateStoredTeamMember, deleteStoredTeamMember } from '@/lib/teamStore';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const updatedLocal = updateStoredTeamMember(id, body);

  if (!isSupabaseConfigured()) {
    if (updatedLocal) return NextResponse.json(updatedLocal);
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('team_members').update(body).eq('id', id).select().single();
    if (error) {
      console.error('Supabase update team member error:', error);
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
  deleteStoredTeamMember(id);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) console.error('Supabase delete team member error:', error);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting team member:', err);
    return NextResponse.json({ success: true });
  }
}
