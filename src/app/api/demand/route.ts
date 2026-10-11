import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLeads } from '@/lib/leadStore';
import { MOCK_LEADS } from '@/lib/mockData';
import type { Lead } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination') || '';
  const departureCity = searchParams.get('departure_city') || '';
  const travelDate = searchParams.get('travel_date') || '';

  let leads: Lead[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseClient();
      let query = supabase.from('leads').select('*').limit(1000);
      if (destination && destination !== 'all') {
        query = query.ilike('preferred_destination', `%${destination}%`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        leads = data;
      } else {
        leads = getStoredLeads();
      }
    } catch {
      leads = getStoredLeads();
    }
  } else {
    leads = getStoredLeads().length > 0 ? getStoredLeads() : MOCK_LEADS;
  }

  // Filter out lost / closed / not interested leads from future demand clustering
  let filtered = leads.filter(
    (l) =>
      l.booking_stage !== 'lost_closed' &&
      l.lead_temperature !== 'not_interested' &&
      l.interest_level !== 'not_interested'
  );

  if (destination && destination !== 'all') {
    filtered = filtered.filter((l) =>
      (l.preferred_destination || l.destination || '')
        .toLowerCase()
        .includes(destination.toLowerCase())
    );
  }

  if (departureCity && departureCity !== 'all') {
    filtered = filtered.filter((l) =>
      (l.departure_city || '').toLowerCase().includes(departureCity.toLowerCase())
    );
  }

  if (travelDate && travelDate !== 'all') {
    filtered = filtered.filter((l) =>
      (l.preferred_travel_date || l.preferred_date || '')
        .toLowerCase()
        .includes(travelDate.toLowerCase())
    );
  }

  // Group by: destination + (preferred_date or 'Any Future Trip') + departure_city
  const groupMap = new Map<string, {
    destination: string;
    preferred_date: string | null;
    date_flexibility: string;
    departure_city: string | null;
    leads: Lead[];
  }>();

  for (const lead of filtered) {
    const dest = lead.preferred_destination || lead.destination || 'Unspecified';
    const isFlexible = lead.date_flexibility === 'any_future_batch' || !lead.preferred_travel_date;
    const dateStr = isFlexible ? 'Any Future Trip' : (lead.preferred_travel_date || lead.preferred_date || 'Flexible');
    const depCity = lead.departure_city || null;

    const key = `${dest.toLowerCase()}|${dateStr.toLowerCase()}|${(depCity || 'all').toLowerCase()}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        destination: dest,
        preferred_date: isFlexible ? null : (lead.preferred_travel_date || lead.preferred_date || null),
        date_flexibility: lead.date_flexibility || (isFlexible ? 'any_future_batch' : 'specific_date_only'),
        departure_city: depCity,
        leads: [],
      });
    }
    groupMap.get(key)!.leads.push(lead);
  }

  const demandClusters = Array.from(groupMap.values()).map((g) => {
    const groupLeads = g.leads;
    const totalCustomers = groupLeads.length;
    const totalTravellers = groupLeads.reduce(
      (sum, l) => sum + (Number(l.number_of_travellers || (l as any).pax_count) || 1),
      0
    );

    const hotCount = groupLeads.filter(
      (l) => l.lead_temperature === 'hot' || l.interest_level === 'high_intent'
    ).length;

    const warmCount = groupLeads.filter(
      (l) => l.lead_temperature === 'warm' || l.interest_level === 'interested'
    ).length;

    const readyToBookCount = groupLeads.filter(
      (l) => l.booking_stage === 'ready_to_book'
    ).length;

    const advancePaidCount = groupLeads.filter(
      (l) => l.booking_stage === 'advance_paid' || Number(l.advance_amount) > 0
    ).length;

    const confirmedCount = groupLeads.filter(
      (l) => l.booking_stage === 'booking_confirmed'
    ).length;

    // Categories:
    const isFlexible = g.date_flexibility === 'any_future_batch' || !g.preferred_date;
    const generalInterestCount = isFlexible ? totalCustomers : 0;
    const dateSpecificCount = !isFlexible ? totalCustomers : 0;

    // Estimated potential revenue only where budget or price is present
    let estimatedRevenue: number | null = null;
    let revenueSum = 0;
    let hasPricing = false;
    for (const l of groupLeads) {
      const budget = Number(l.budget_per_person || (l as any).budget);
      const pax = Number(l.number_of_travellers || (l as any).pax_count) || 1;
      if (budget > 0) {
        revenueSum += budget * pax;
        hasPricing = true;
      }
    }
    if (hasPricing) {
      estimatedRevenue = revenueSum;
    }

    return {
      destination: g.destination,
      preferred_date: g.preferred_date,
      date_flexibility: g.date_flexibility,
      departure_city: g.departure_city,
      total_customers: totalCustomers,
      total_travellers: totalTravellers,
      hot_leads: hotCount,
      warm_leads: warmCount,
      ready_to_book: readyToBookCount,
      advance_paid: advancePaidCount,
      confirmed: confirmedCount,
      general_interest_count: generalInterestCount,
      date_specific_count: dateSpecificCount,
      high_intent: hotCount,
      estimated_revenue: estimatedRevenue,
      leads: groupLeads,
    };
  });

  // Sort by highest potential travellers, then ready to book
  demandClusters.sort((a, b) => {
    if (b.total_travellers !== a.total_travellers) {
      return b.total_travellers - a.total_travellers;
    }
    return b.ready_to_book - a.ready_to_book;
  });

  return NextResponse.json(demandClusters);
}

