import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { clearStoredLeads } from '@/lib/leadStore';

export async function DELETE(request: NextRequest) {
  try {
    clearStoredLeads();

    if (isSupabaseConfigured()) {
      const supabase = createSupabaseClient();
      const { error } = await supabase.from('leads').delete().neq('id', '');
      if (error) console.error('Supabase delete all error:', error.message);
    }

    return NextResponse.json({ success: true, message: 'All leads deleted' });
  } catch (err: any) {
    console.error('Error deleting all leads:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete leads' }, { status: 500 });
  }
}
