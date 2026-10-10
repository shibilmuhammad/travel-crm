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
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch team_members error, using local store:', error);
      return NextResponse.json(getStoredTeamMembers());
    }

    if (data && data.length > 0) {
      return NextResponse.json(data);
    }
    return NextResponse.json(getStoredTeamMembers());
  } catch (err) {
    console.error('Error fetching team_members:', err);
    return NextResponse.json(getStoredTeamMembers());
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nowISO = new Date().toISOString();
    const memberId = body.id || `user-${Date.now()}`;
    const fullName = body.full_name || body.name || 'Team Member';
    const email = body.email || `user-${Date.now()}@unzolo.com`;

    const newMember: TeamMember = {
      id: memberId,
      full_name: fullName,
      name: fullName,
      email: email,
      phone: body.phone || null,
      password: body.password || 'password123',
      role: body.role || 'telecaller',
      employee_id: body.employee_id || null,
      daily_call_target: Number(body.daily_call_target) || 0,
      daily_conversion_target: Number(body.daily_conversion_target) || 0,
      status: body.status || 'active',
      last_login: body.last_login || null,
      created_at: body.created_at || nowISO,
    };

    // Always update local/in-memory store first
    saveStoredTeamMember(newMember);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseClient();
        const fullPayload = {
          id: newMember.id,
          full_name: newMember.full_name,
          name: newMember.name,
          email: newMember.email,
          phone: newMember.phone,
          password: newMember.password,
          role: newMember.role,
          employee_id: newMember.employee_id,
          daily_call_target: newMember.daily_call_target,
          daily_conversion_target: newMember.daily_conversion_target,
          status: newMember.status,
          last_login: newMember.last_login,
          created_at: newMember.created_at,
        };

        // Use upsert so existing records update password and user details seamlessly
        const { data, error } = await supabase
          .from('team_members')
          .upsert([fullPayload], { onConflict: 'email' })
          .select()
          .single();

        if (error) {
          console.error('Supabase team_members upsert error, trying fallback:', error.message);
          const fallbackPayload = {
            id: newMember.id,
            full_name: newMember.full_name,
            email: newMember.email,
          };

          const { data: fbData, error: fbError } = await supabase
            .from('team_members')
            .upsert([fallbackPayload], { onConflict: 'email' })
            .select()
            .single();

          if (fbError) {
            console.error('Fallback team member upsert error:', fbError.message);
          } else if (fbData) {
            return NextResponse.json(fbData, { status: 201 });
          }
        } else if (data) {
          return NextResponse.json(data, { status: 201 });
        }
      } catch (dbErr: any) {
        console.error('Supabase error upserting team member:', dbErr?.message || dbErr);
      }
    }

    return NextResponse.json(newMember, { status: 201 });
  } catch (err: any) {
    console.error('Error creating team member:', err);
    return NextResponse.json({ error: err.message || 'Failed to create team member' }, { status: 500 });
  }
}
