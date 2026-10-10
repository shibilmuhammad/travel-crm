import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { TeamMember } from '@/types';
import { getStoredTeamMembers, saveStoredTeamMember } from '@/lib/teamStore';

export async function GET() {
  if (!isSupabaseConfigured()) {
    const members = getStoredTeamMembers();
    return NextResponse.json(members);
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const members = getStoredTeamMembers();
    return NextResponse.json(members);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isSupabaseConfigured()) {
    const nowISO = new Date().toISOString();
    const newMember: TeamMember = {
      id: body.id || `user-${Date.now()}`,
      full_name: body.full_name || body.name || 'Team Member',
      name: body.full_name || body.name || 'Team Member',
      email: body.email || '',
      phone: body.phone || null,
      password: body.password || 'password123',
      role: body.role || 'telecaller',
      employee_id: body.employee_id || null,
      daily_call_target: Number(body.daily_call_target) || 0,
      daily_conversion_target: Number(body.daily_conversion_target) || 0,
      status: 'active',
      last_login: null,
      created_at: nowISO,
    };
    saveStoredTeamMember(newMember);
    return NextResponse.json(newMember, { status: 201 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('team_members').insert([body]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

