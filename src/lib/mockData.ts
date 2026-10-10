import { Lead, TripBatch, LeadActivity, DemandGroup, TeamMember } from '@/types';
import { isPreferredDateInMonth } from '@/lib/utils';

const nowISO = new Date().toISOString();
const todayDateStr = nowISO.split('T')[0];

export let MOCK_TEAM_MEMBERS: TeamMember[] = [];
export let MOCK_LEADS: Lead[] = [];
export let MOCK_ACTIVITIES: LeadActivity[] = [];
export let MOCK_BATCHES: TripBatch[] = [];

export function getMockLeads(filters: Record<string, string>, leadList?: Lead[]) {
  let leads = leadList ? [...leadList] : [...MOCK_LEADS];

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
  const interest = filters.interest_level || filters.interestLevel;
  if (interest && interest !== 'all') {
    leads = leads.filter((l) => l.interest_level === interest || l.lead_temperature === interest);
  }

  const temp = filters.lead_temperature || filters.leadTemperature;
  if (temp && temp !== 'all') {
    leads = leads.filter((l) => l.lead_temperature === temp || l.interest_level === temp);
  }

  const stage = filters.booking_stage || filters.bookingStage;
  if (stage && stage !== 'all') {
    leads = leads.filter((l) => l.booking_stage === stage);
  }

  const batch = filters.batch_id || filters.batchId;
  if (batch && batch !== 'all') {
    const targetBatch = MOCK_BATCHES.find((b) => b.id === batch);
    const bTitle = (targetBatch?.title || '').toLowerCase().trim();
    const bDest = (targetBatch?.destination || '').toLowerCase().trim();

    leads = leads.filter((l) => {
      if (l.batch_id === batch) return true;
      const leadDest = (l.preferred_destination || '').toLowerCase().trim();
      const leadNotes = (l.notes || '').toLowerCase().trim();

      if (
        (bDest && (leadDest.includes(bDest) || bDest.includes(leadDest))) ||
        (bTitle && (leadDest.includes(bTitle) || bTitle.includes(leadDest) || leadNotes.includes(bTitle)))
      ) {
        l.batch_id = batch;
        return true;
      }
      return false;
    });
  }

  const assigned = filters.assigned_team_member || filters.assignedTo;
  if (assigned && assigned !== 'all') {
    leads = leads.filter(
      (l) => l.assigned_team_member?.toLowerCase().includes(assigned.toLowerCase())
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
