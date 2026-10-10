import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getMockDemandGroups } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(getMockDemandGroups());
  }

  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);

    const destination = searchParams.get('destination') || '';

    let query = supabase
      .from('leads')
      .select('*')
      .not('interest_level', 'eq', 'Not Interested');

    if (destination) query = query.ilike('preferred_destination', `%${destination}%`);

    const { data: leads, error } = await query;

    if (error) throw error;

    const groups = new Map<string, {
      destination: string;
      preferred_date: string | null;
      leads: any[];
    }>();

    for (const lead of leads || []) {
      const key = [
        lead.preferred_destination || 'Unknown',
        lead.preferred_travel_date || 'Flexible Date',
      ].join('|');

      if (!groups.has(key)) {
        groups.set(key, {
          destination: lead.preferred_destination || 'Unknown',
          preferred_date: lead.preferred_travel_date,
          leads: [],
        });
      }
      groups.get(key)!.leads.push(lead);
    }

    const demandGroups = Array.from(groups.values()).map((group) => {
      const groupLeads = group.leads;
      const totalPax = groupLeads.reduce((s, l) => s + (l.pax_count || 1), 0);
      const readyToBookPax = groupLeads
        .filter((l) => l.interest_level === 'Ready to Book' || l.interest_level === 'Very High')
        .reduce((s, l) => s + (l.pax_count || 1), 0);

      let demandTier: 'High Demand Ready' | 'Moderate Interest' | 'Low / Emerging' = 'Low / Emerging';
      if (totalPax >= 6 || readyToBookPax >= 4) {
        demandTier = 'High Demand Ready';
      } else if (totalPax >= 3) {
        demandTier = 'Moderate Interest';
      }

      return {
        destination: group.destination,
        preferred_date: group.preferred_date,
        total_leads: groupLeads.length,
        total_pax: totalPax,
        ready_to_book_pax: readyToBookPax,
        demand_tier: demandTier,
        leads: groupLeads,
      };
    });

    demandGroups.sort((a, b) => b.total_pax - a.total_pax);

    return NextResponse.json(demandGroups);
  } catch (err) {
    return NextResponse.json(getMockDemandGroups());
  }
}
