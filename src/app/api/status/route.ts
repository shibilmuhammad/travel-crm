import { NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const isConfigured = isSupabaseConfigured();
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!isConfigured) {
    return NextResponse.json({
      connected: false,
      message: 'Supabase environment variables missing or using placeholders in Vercel',
      env: {
        has_url: Boolean(envUrl),
        has_key: hasKey,
      },
      tables: null,
    });
  }

  try {
    const supabase = createSupabaseClient();
    const [teamRes, leadsRes, batchesRes, actRes] = await Promise.all([
      supabase.from('team_members').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('trip_batches').select('id', { count: 'exact', head: true }),
      supabase.from('lead_activities').select('id', { count: 'exact', head: true }),
    ]);

    const errors = [teamRes.error, leadsRes.error, batchesRes.error, actRes.error].filter(Boolean);

    return NextResponse.json({
      connected: errors.length === 0,
      message: errors.length === 0 ? 'Successfully connected to Supabase' : 'Connected to Supabase but some tables errored',
      env: {
        has_url: true,
        has_key: true,
        url: envUrl,
      },
      tables: {
        team_members: { count: teamRes.count ?? 0, error: teamRes.error?.message || null },
        leads: { count: leadsRes.count ?? 0, error: leadsRes.error?.message || null },
        trip_batches: { count: batchesRes.count ?? 0, error: batchesRes.error?.message || null },
        lead_activities: { count: actRes.count ?? 0, error: actRes.error?.message || null },
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      message: err?.message || 'Failed to connect to Supabase client',
      env: {
        has_url: Boolean(envUrl),
        has_key: hasKey,
      },
      tables: null,
    });
  }
}
