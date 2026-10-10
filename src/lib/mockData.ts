import { Lead, TripBatch, LeadActivity, DemandGroup, TeamMember } from '@/types';
import { isPreferredDateInMonth } from '@/lib/utils';

const nowISO = new Date().toISOString();
const todayDateStr = nowISO.split('T')[0];

export let MOCK_TEAM_MEMBERS: TeamMember[] = [];

export let MOCK_LEADS: Lead[] = [
  {
    id: 'lead-1',
    full_name: 'Ananya Sharma',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919876543210',
    email: 'ananya.s@gmail.com',
    whatsapp_profile_name: 'Ananya S',
    lead_source: 'instagram',
    preferred_destination: 'Spiti Valley',
    preferred_travel_date: '2026-10-15',
    date_flexibility: 'flexible_within_range',
    departure_city: 'Delhi',
    number_of_travellers: 2,
    budget_per_person: 35000,
    interest_level: 'high_intent',
    lead_temperature: 'hot',
    booking_stage: 'contacted',
    next_followup_date: todayDateStr,
    next_followup_time: '16:00',
    last_contacted_date: new Date(Date.now() - 3600000 * 4).toISOString(),
    assigned_team_member: 'Fazl',
    batch_id: 'batch-1',
    ad_campaign: null,
    ad_id: null,
    preferred_contact_method: 'whatsapp',
    notes: 'Inquired about Spiti Oct 15 batch. Very excited about stargazing night.',
  },
  {
    id: 'lead-2',
    full_name: 'Rohan Mehta',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919812345678',
    email: 'rohan.m@yahoo.com',
    whatsapp_profile_name: 'Rohan (Travel)',
    lead_source: 'whatsapp',
    preferred_destination: 'Meghalaya',
    preferred_travel_date: '2026-11-05',
    date_flexibility: 'specific_date_only',
    departure_city: 'Guwahati',
    number_of_travellers: 1,
    budget_per_person: 25000,
    interest_level: 'high_intent',
    lead_temperature: 'hot',
    booking_stage: 'advance_paid',
    next_followup_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    next_followup_time: '11:00',
    last_contacted_date: new Date(Date.now() - 86400000 * 1).toISOString(),
    assigned_team_member: 'Jifri',
    batch_id: 'batch-2',
    ad_campaign: null,
    ad_id: null,
    preferred_contact_method: 'whatsapp',
    notes: 'Paid token of ₹5,000 for Meghalaya. Needs seat confirmation receipt.',
  },
  {
    id: 'lead-3',
    full_name: 'Vikram & Friends',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919988776655',
    email: 'vikram.v@outlook.com',
    whatsapp_profile_name: 'Vikram V',
    lead_source: 'referral',
    preferred_destination: 'Spiti Valley',
    preferred_travel_date: '2026-10-15',
    date_flexibility: 'flexible_within_range',
    departure_city: 'Chandigarh',
    number_of_travellers: 4,
    budget_per_person: 32000,
    interest_level: 'high_intent',
    lead_temperature: 'warm',
    booking_stage: 'follow_up_required',
    next_followup_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    next_followup_time: '14:30',
    last_contacted_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    assigned_team_member: 'Fazl',
    batch_id: 'batch-1',
    ad_campaign: null,
    ad_id: null,
    preferred_contact_method: 'phone_call',
    notes: 'Group of 4 looking for group discount on Spiti departure.',
  },
  {
    id: 'lead-4',
    full_name: 'Kavya Nair',
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919711223344',
    email: null,
    whatsapp_profile_name: 'Kavya N',
    lead_source: 'facebook',
    preferred_destination: 'Kashmir',
    preferred_travel_date: '2026-12-20',
    date_flexibility: 'any_future_batch',
    departure_city: 'Mumbai',
    number_of_travellers: 2,
    budget_per_person: 45000,
    interest_level: 'interested',
    lead_temperature: 'warm',
    booking_stage: 'waiting_for_price',
    next_followup_date: todayDateStr,
    next_followup_time: '17:30',
    last_contacted_date: new Date(Date.now() - 86400000 * 3).toISOString(),
    assigned_team_member: 'Jifri',
    batch_id: null,
    ad_campaign: 'Kashmir_Winter_Promo',
    ad_id: 'fb-ad-99',
    preferred_contact_method: 'whatsapp',
    notes: 'Wants snow winter trip itinerary for Gulmarg & Pahalgam.',
  },
  {
    id: 'lead-5',
    full_name: 'Siddharth Roy',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919655443322',
    email: 'sid.roy@gmail.com',
    whatsapp_profile_name: 'Sid Roy',
    lead_source: 'website',
    preferred_destination: 'Bali',
    preferred_travel_date: '2026-11-12',
    date_flexibility: 'flexible_within_range',
    departure_city: 'Bengaluru',
    number_of_travellers: 1,
    budget_per_person: 60000,
    interest_level: 'interested',
    lead_temperature: 'cold',
    booking_stage: 'waiting_for_date',
    next_followup_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    next_followup_time: '12:00',
    last_contacted_date: new Date(Date.now() - 86400000 * 5).toISOString(),
    assigned_team_member: 'Shibil',
    batch_id: null,
    ad_campaign: null,
    ad_id: null,
    preferred_contact_method: 'email',
    notes: 'Enquired about Bali stranger trip dates for November.',
  },
  {
    id: 'lead-6',
    full_name: 'Neha & Tanvi',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919544332211',
    email: null,
    whatsapp_profile_name: 'Neha Gupta',
    lead_source: 'instagram',
    preferred_destination: 'Spiti Valley',
    preferred_travel_date: '2026-10-15',
    date_flexibility: 'flexible_within_range',
    departure_city: 'Delhi',
    number_of_travellers: 2,
    budget_per_person: 32000,
    interest_level: 'high_intent',
    lead_temperature: 'hot',
    booking_stage: 'ready_to_book',
    next_followup_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    next_followup_time: '15:00',
    last_contacted_date: new Date(Date.now() - 86400000 * 1).toISOString(),
    assigned_team_member: 'Fazl',
    batch_id: 'batch-1',
    ad_campaign: null,
    ad_id: null,
    preferred_contact_method: 'whatsapp',
    notes: 'Ready to pay token for 2 pax Spiti trip.',
  },
  {
    id: 'lead-7',
    full_name: 'Faisal & Friends (Kochi)',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919447123456',
    email: 'faisal.k@gmail.com',
    whatsapp_profile_name: 'Faisal K',
    lead_source: 'manual_entry',
    preferred_destination: 'Vattavada',
    preferred_travel_date: 'Oct 24, 25 (Sat, Sun)',
    date_flexibility: 'flexible_within_range',
    departure_city: 'Eranakulam',
    number_of_travellers: 4,
    budget_per_person: 3800,
    interest_level: 'high_intent',
    lead_temperature: 'hot',
    booking_stage: 'advance_paid',
    next_followup_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    next_followup_time: '10:00',
    last_contacted_date: new Date(Date.now() - 86400000 * 1).toISOString(),
    assigned_team_member: 'Fazl',
    batch_id: 'batch-3',
    ad_campaign: null,
    ad_id: null,
    preferred_contact_method: 'whatsapp',
    notes: 'Advance of ₹4,000 paid for Vattavada Oct 24-25 weekend batch.',
  },
  {
    id: 'lead-8',
    full_name: 'Sneha & Team',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: nowISO,
    whatsapp_number: '+919745987654',
    email: 'sneha.vattavada@gmail.com',
    whatsapp_profile_name: 'Sneha V',
    lead_source: 'instagram',
    preferred_destination: 'Vattavada',
    preferred_travel_date: 'Oct 24, 25 (Sat, Sun)',
    date_flexibility: 'specific_date_only',
    departure_city: 'Kottayam',
    number_of_travellers: 3,
    budget_per_person: 3800,
    interest_level: 'high_intent',
    lead_temperature: 'hot',
    booking_stage: 'ready_to_book',
    next_followup_date: todayDateStr,
    next_followup_time: '14:00',
    last_contacted_date: new Date(Date.now() - 3600000 * 2).toISOString(),
    assigned_team_member: 'Shibil',
    batch_id: 'batch-3',
    ad_campaign: null,
    ad_id: null,
    preferred_contact_method: 'phone_call',
    notes: 'Interested in Vattavada camp. Awaiting final headcount from friends.',
  },
];

export let MOCK_ACTIVITIES: LeadActivity[] = [
  {
    id: 'int-1',
    lead_id: 'lead-1',
    activity_type: 'phone_call',
    activity_date: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    notes: 'Called Ananya. She confirmed 2 seats for Spiti Oct 15. Asking if batch will be confirmed soon.',
    outcome: 'Connected',
    next_action: 'Send payment link',
    next_followup_date: todayDateStr,
    team_member: 'Fazl',
    updated_interest_level: 'high_intent',
    updated_booking_stage: 'contacted',
    updated_preferred_date: '2026-10-15',
  },
  {
    id: 'int-2',
    lead_id: 'lead-2',
    activity_type: 'whatsapp_message',
    activity_date: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    notes: 'Received token payment screenshot of ₹5,000 for Meghalaya Nov 5 batch.',
    outcome: 'Token Received',
    next_action: 'Issue booking pass',
    next_followup_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    team_member: 'Jifri',
    updated_interest_level: 'high_intent',
    updated_booking_stage: 'advance_paid',
    updated_preferred_date: '2026-11-05',
  },
];

export let MOCK_BATCHES: TripBatch[] = [
  {
    id: 'batch-1',
    title: 'Spiti Autumn Circuit Batch #1',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: nowISO,
    destination: 'Spiti Valley',
    proposed_date: '2026-10-15',
    start_date: '2026-10-15',
    end_date: '2026-10-23',
    capacity: 12,
    total_capacity: 12,
    confirmed_pax: 8,
    minimum_viable_size: 6,
    departure_city: 'Delhi',
    status: 'open_for_booking',
    proposed_price: 32500,
    price_per_pax: 32500,
    notes: 'Batch almost full. 4 seats remaining.',
    total_linked_leads: 3,
    high_intent_count: 3,
    ready_to_book_count: 1,
    advance_paid_count: 0,
    confirmed_count: 0,
  },
  {
    id: 'batch-2',
    title: 'Meghalaya Living Root Bridges Batch',
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: nowISO,
    destination: 'Meghalaya',
    proposed_date: '2026-11-05',
    start_date: '2026-11-05',
    end_date: '2026-11-11',
    capacity: 10,
    total_capacity: 10,
    confirmed_pax: 4,
    minimum_viable_size: 5,
    departure_city: 'Guwahati',
    status: 'validating_demand',
    proposed_price: 24500,
    price_per_pax: 24500,
    notes: 'Promote on Instagram for November dates.',
    total_linked_leads: 1,
    high_intent_count: 1,
    ready_to_book_count: 0,
    advance_paid_count: 1,
    confirmed_count: 0,
  },
  {
    id: 'batch-3',
    title: 'Vattavada Camp 1',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: nowISO,
    destination: 'Vattavada',
    proposed_date: '2026-10-24',
    start_date: '2026-10-24',
    end_date: '2026-10-25',
    capacity: 15,
    total_capacity: 15,
    confirmed_pax: 6,
    minimum_viable_size: 8,
    departure_city: 'Eranakulam',
    status: 'open_for_booking',
    proposed_price: 3800,
    price_per_pax: 3800,
    notes: 'Vattavada weekend camping batch. High demand from Kochi/Kottayam.',
    total_linked_leads: 4,
    high_intent_count: 4,
    ready_to_book_count: 2,
    advance_paid_count: 2,
    confirmed_count: 1,
  },
];

export function getMockLeads(filters: Record<string, string>) {
  let leads = [...MOCK_LEADS];

  if (filters.search) {
    const s = filters.search.toLowerCase();
    leads = leads.filter(
      (l) =>
        l.full_name.toLowerCase().includes(s) ||
        l.whatsapp_number.toLowerCase().includes(s) ||
        (l.email && l.email.toLowerCase().includes(s)) ||
        (l.preferred_destination && l.preferred_destination.toLowerCase().includes(s))
    );
  }
  if (filters.destination && filters.destination !== 'all') {
    const d = filters.destination.toLowerCase();
    leads = leads.filter(
      (l) =>
        (l.preferred_destination && l.preferred_destination.toLowerCase().includes(d)) ||
        (l.batch_id && MOCK_BATCHES.find((b) => b.id === l.batch_id)?.destination.toLowerCase().includes(d))
    );
  }
  if (filters.interestLevel && filters.interestLevel !== 'all') {
    leads = leads.filter((l) => l.interest_level === filters.interestLevel);
  }
  if (filters.lead_temperature && filters.lead_temperature !== 'all') {
    leads = leads.filter((l) => l.lead_temperature === filters.lead_temperature);
  }
  if (filters.bookingStage && filters.bookingStage !== 'all') {
    leads = leads.filter((l) => l.booking_stage === filters.bookingStage);
  }
  if (filters.batch_id && filters.batch_id !== 'all') {
    const targetBatch = MOCK_BATCHES.find((b) => b.id === filters.batch_id);
    const bTitle = (targetBatch?.title || '').toLowerCase().trim();
    const bDest = (targetBatch?.destination || '').toLowerCase().trim();

    leads = leads.filter((l) => {
      if (l.batch_id === filters.batch_id) return true;
      // If batch_id was not explicitly set on the lead, match by preferred destination or product title
      const leadDest = (l.preferred_destination || '').toLowerCase().trim();
      const leadNotes = (l.notes || '').toLowerCase().trim();

      if (
        (bDest && (leadDest.includes(bDest) || bDest.includes(leadDest))) ||
        (bTitle && (leadDest.includes(bTitle) || bTitle.includes(leadDest) || leadNotes.includes(bTitle)))
      ) {
        l.batch_id = filters.batch_id;
        return true;
      }
      return false;
    });
  }
  if (filters.assigned_team_member && filters.assigned_team_member !== 'all') {
    leads = leads.filter(
      (l) => l.assigned_team_member?.toLowerCase() === filters.assigned_team_member?.toLowerCase()
    );
  }
  const prefDateFilter = filters.preferred_date || (filters as any).preferredDate;
  if (prefDateFilter && prefDateFilter !== 'all') {
    const pDate = prefDateFilter.toLowerCase();
    leads = leads.filter((l) => {
      if (!l.preferred_travel_date || !l.preferred_travel_date.trim()) {
        return false;
      }
      const pd = l.preferred_travel_date.toLowerCase().trim();
      if (pd.includes('future') || l.date_flexibility === 'any_future_batch') {
        return true;
      }
      return (
        pd.includes(pDate) ||
        isPreferredDateInMonth(l.preferred_travel_date, pDate)
      );
    });
  }

  const monthFilter = filters.month;
  if (monthFilter && monthFilter !== 'all') {
    leads = leads.filter((l) => {
      if (!l.preferred_travel_date || !l.preferred_travel_date.trim()) {
        return false;
      }
      const pd = l.preferred_travel_date.toLowerCase().trim();
      if (pd.includes('future') || l.date_flexibility === 'any_future_batch') {
        return true;
      }
      return isPreferredDateInMonth(l.preferred_travel_date, monthFilter);
    });
  }

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'desc';

  leads.sort((a, b) => {
    const valA = (a as any)[sortBy] || '';
    const valB = (b as any)[sortBy] || '';
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return {
    leads,
    total: leads.length,
    page: parseInt(filters.page || '1'),
    pageSize: parseInt(filters.pageSize || '25'),
    totalPages: 1,
  };
}

export function getMockDemandGroups(): DemandGroup[] {
  const groupsMap: Record<string, Lead[]> = {};

  MOCK_LEADS.forEach((lead) => {
    if (!lead.preferred_destination) return;
    const dateKey = lead.preferred_travel_date || 'no-date';
    const key = `${lead.preferred_destination}___${dateKey}`;
    if (!groupsMap[key]) groupsMap[key] = [];
    groupsMap[key].push(lead);
  });

  return Object.entries(groupsMap).map(([key, leads]) => {
    const [destination, preferred_date] = key.split('___');
    const total_customers = leads.length;
    const total_travellers = leads.reduce((sum, l) => sum + (l.number_of_travellers || 1), 0);
    const high_intent = leads.filter((l) => l.interest_level === 'high_intent').length;
    const ready_to_book = leads.filter((l) => l.booking_stage === 'ready_to_book').length;
    const advance_paid = leads.filter((l) => l.booking_stage === 'advance_paid').length;
    const confirmed = leads.filter((l) => l.booking_stage === 'booking_confirmed').length;

    const estimated_revenue = leads.reduce((sum, l) => sum + (l.budget_per_person || 0) * (l.number_of_travellers || 1), 0);
    const latest_enquiry = leads.reduce((latest, l) => (l.created_at > latest ? l.created_at : latest), leads[0]?.created_at || nowISO);

    return {
      destination,
      preferred_date: preferred_date === 'no-date' ? null : preferred_date,
      date_flexibility: leads[0]?.date_flexibility || 'not_decided',
      departure_city: leads[0]?.departure_city || null,
      total_customers,
      total_travellers,
      high_intent,
      ready_to_book,
      advance_paid,
      confirmed,
      estimated_revenue,
      latest_enquiry,
      leads,
    };
  });
}
