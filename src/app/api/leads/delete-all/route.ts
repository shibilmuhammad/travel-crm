import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { clearStoredLeads } from '@/lib/leadStore';
import { clearStoredActivities } from '@/lib/activityStore';

export async function DELETE(request: NextRequest) {
  try {
    clearStoredLeads();
    clearStoredActivities();

    if (isSupabaseConfigured()) {
      const supabase = createSupabaseClient();
      try {
        await supabase.from('lead_activities').delete().neq('id', '');
      } catch (actErr: any) {
        console.warn('Supabase delete lead_activities error:', actErr?.message || actErr);
      }
      const { error } = await supabase.from('leads').delete().neq('id', '');
      if (error) console.error('Supabase delete all leads error:', error.message);
    }

    return NextResponse.json({ success: true, message: 'All leads deleted' });
  } catch (err: any) {
    console.error('Error deleting all leads:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete leads' }, { status: 500 });
  }
}
