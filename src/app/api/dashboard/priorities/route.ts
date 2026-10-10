import { NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_LEADS } from '@/lib/mockData';

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  if (!isSupabaseConfigured()) {
    const overdue = MOCK_LEADS.filter((l) => l.next_followup_date && l.next_followup_date < today);
    const todayDue = MOCK_LEADS.filter((l) => l.next_followup_date === today);
    const highIntent = MOCK_LEADS.filter((l) => l.interest_level === 'high_intent');

    const priorities = [
      ...overdue.map((lead) => ({ type: 'overdue_followup', lead, note: `Overdue since ${lead.next_followup_date}` })),
      ...todayDue.map((lead) => ({ type: 'call_due', lead, note: 'Follow-up scheduled for today' })),
      ...highIntent.map((lead) => ({ type: 'high_intent_no_booking', lead, note: 'High intent — action recommended' })),
    ];

    return NextResponse.json(priorities);
  }

  try {
    const supabase = createSupabaseClient();
    const { data: callsDue } = await supabase
      .from('leads')
      .select('*')
      .eq('next_followup_date', today)
      .limit(10);

    const priorities = (callsDue || []).map((lead) => ({
      type: 'call_due',
      lead,
      note: 'Follow-up scheduled for today',
    }));

    return NextResponse.json(priorities);
  } catch (err) {
    return NextResponse.json([]);
  }
}
