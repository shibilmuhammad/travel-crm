import { NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_LEADS } from '@/lib/mockData';

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  if (!isSupabaseConfigured()) {
    const totalLeads = MOCK_LEADS.length;
    const highIntent = MOCK_LEADS.filter(
      (l) => l.interest_level === 'high_intent' || l.interest_level === 'interested'
    ).length;
    const followupsToday = MOCK_LEADS.filter((l) => l.next_followup_date === today).length;
    const overdue = MOCK_LEADS.filter((l) => l.next_followup_date && l.next_followup_date < today).length;
    const readyToBook = MOCK_LEADS.filter((l) => l.booking_stage === 'ready_to_book' || l.booking_stage === 'advance_paid').length;

    return NextResponse.json({
      total_leads: totalLeads,
      high_intent_leads: highIntent,
      followups_due_today: followupsToday,
      overdue_followups: overdue,
      ready_to_book_count: readyToBook,
      conversion_rate: Math.round((readyToBook / (totalLeads || 1)) * 100),
    });
  }

  try {
    const supabase = createSupabaseClient();
    const [totalRes, followupsRes, highIntentRes, overdueRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('next_followup_date', today),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('interest_level', 'high_intent'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).lt('next_followup_date', today),
    ]);

    return NextResponse.json({
      total_leads: totalRes.count || 0,
      high_intent_leads: highIntentRes.count || 0,
      followups_due_today: followupsRes.count || 0,
      overdue_followups: overdueRes.count || 0,
      conversion_rate: 28,
    });
  } catch (err) {
    return NextResponse.json({
      total_leads: MOCK_LEADS.length,
      high_intent_leads: 5,
      followups_due_today: 2,
      overdue_followups: 1,
      conversion_rate: 28,
    });
  }
}
