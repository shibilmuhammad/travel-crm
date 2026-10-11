'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InterestBadge, BookingBadge } from '@/components/crm/StatusBadges';
import { LogCallModal } from '@/components/crm/LogCallModal';
import { LeadDetailModal } from '@/components/crm/LeadDetailModal';
import {
  Users, Flame, Calendar, CheckCircle2, IndianRupee, Clock,
  Phone, ArrowRight, RefreshCw, AlertTriangle, UserCheck,
  TrendingUp, MapPin, Building, Shield, ExternalLink,
  ChevronRight, Compass, ArrowUpRight, ArrowDownRight,
  Filter, Check, MessageSquare, Plus, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie
} from 'recharts';
import type { Lead, TripBatch, LeadActivity, TodayPriority, LeadTemperature, BookingStage } from '@/types';
import {
  BOOKING_STAGE_LABELS, LEAD_TEMPERATURE_LABELS, LEAD_SOURCE_LABELS,
  BOOKING_STAGE_COLORS, LEAD_TEMPERATURE_COLORS
} from '@/types';
import {
  formatCurrency, formatDate, formatDateTime, getWhatsAppLink, getCallLink,
  normalizePhoneNumber
} from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// Helper to get date string in YYYY-MM-DD (safe for SSR prerender)
function getDateStr(offsetDays = 0): string {
  if (typeof window === 'undefined') return '';
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// Preset range generator
function getDateRangeFromPreset(preset: string): { start: string; end: string } {
  if (typeof window === 'undefined') return { start: '', end: '' };
  const today = getDateStr(0);
  const now = new Date();

  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'last_7_days':
      return { start: getDateStr(-6), end: today };
    case 'last_30_days':
      return { start: getDateStr(-29), end: today };
    case 'this_month': {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      return { start, end };
    }
    default:
      return { start: '', end: '' };
  }
}

export default function DashboardPage() {
  const { currentUser, isTelecaller, teamMembers } = useAuth();

  // Filters State
  const [datePreset, setDatePreset] = useState<string>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [filterDestination, setFilterDestination] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>(
    isTelecaller ? (currentUser?.full_name || currentUser?.name || 'all') : 'all'
  );

  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<TripBatch[]>([]);
  const [priorities, setPriorities] = useState<TodayPriority[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsData, setStatsData] = useState<any>(null);

  // Modals State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [logCallLead, setLogCallLead] = useState<Lead | null>(null);

  // Batch Creation Modal State from Demand Cluster
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    destination: '',
    proposed_date: '',
    proposed_price: '',
    capacity: '12',
    departure_city: '',
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Compute active start & end dates
  const activeDateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return { start: customStart, end: customEnd };
    }
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customStart, customEnd]);

  // Fetch all core data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeDateRange.start) params.set('startDate', activeDateRange.start);
      if (activeDateRange.end) params.set('endDate', activeDateRange.end);
      if (filterDestination && filterDestination !== 'all') params.set('destination', filterDestination);
      if (filterSource && filterSource !== 'all') params.set('lead_source', filterSource);
      if (filterStaff && filterStaff !== 'all') params.set('assigned_team_member', filterStaff);

      const [statsRes, prioritiesRes, leadsRes, activitiesRes, batchesRes] = await Promise.all([
        fetch(`/api/dashboard/stats?${params.toString()}`),
        fetch(`/api/dashboard/priorities?${filterStaff !== 'all' ? `assigned_team_member=${encodeURIComponent(filterStaff)}` : ''}`),
        fetch('/api/leads?page_size=1000'),
        fetch('/api/activities'),
        fetch('/api/batches'),
      ]);

      const [statsJson, prioritiesJson, leadsJson, activitiesJson, batchesJson] = await Promise.all([
        statsRes.json(),
        prioritiesRes.json(),
        leadsRes.json(),
        activitiesRes.json(),
        batchesRes.json(),
      ]);

      setStatsData(statsJson);
      setPriorities(Array.isArray(prioritiesJson) ? prioritiesJson : []);
      setLeads(Array.isArray(leadsJson.leads) ? leadsJson.leads : []);
      setActivities(Array.isArray(activitiesJson) ? activitiesJson.slice(0, 15) : []);
      setBatches(Array.isArray(batchesJson) ? batchesJson : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeDateRange, filterDestination, filterSource, filterStaff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique destinations for filter dropdown
  const uniqueDestinations = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      const d = l.preferred_destination || l.destination;
      if (d && d.trim()) set.add(d.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered Leads in the current cohort
  const cohortLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filterDestination && filterDestination !== 'all') {
        const d = (l.preferred_destination || l.destination || '').toLowerCase();
        if (!d.includes(filterDestination.toLowerCase())) return false;
      }
      if (filterSource && filterSource !== 'all') {
        if ((l.lead_source || '').toLowerCase() !== filterSource.toLowerCase()) return false;
      }
      if (filterStaff && filterStaff !== 'all') {
        if ((l.assigned_team_member || '').toLowerCase() !== filterStaff.toLowerCase()) return false;
      }
      if (activeDateRange.start && activeDateRange.end) {
        const leadDate = (l.created_at || '').split('T')[0];
        if (leadDate && (leadDate < activeDateRange.start || leadDate > activeDateRange.end)) {
          return false;
        }
      }
      return true;
    });
  }, [leads, filterDestination, filterSource, filterStaff, activeDateRange]);

  // Top Cards Calculations
  const totalLeads = cohortLeads.length;
  const newLeads = cohortLeads.filter((l) => l.lead_temperature === 'new' || l.interest_level === 'new').length;
  const hotLeads = cohortLeads.filter((l) => l.lead_temperature === 'hot' || l.interest_level === 'high_intent').length;
  const todayStr = getDateStr(0);

  const followupsTodayList = leads.filter((l) => {
    if (filterStaff !== 'all' && (l.assigned_team_member || '').toLowerCase() !== filterStaff.toLowerCase()) return false;
    return l.next_followup_date === todayStr && l.next_followup_status !== 'completed';
  });
  const overdueFollowupsList = leads.filter((l) => {
    if (filterStaff !== 'all' && (l.assigned_team_member || '').toLowerCase() !== filterStaff.toLowerCase()) return false;
    return (
      l.next_followup_date &&
      l.next_followup_date < todayStr &&
      l.next_followup_status !== 'completed' &&
      l.booking_stage !== 'booking_confirmed' &&
      l.booking_stage !== 'lost_closed'
    );
  });

  const confirmedBookings = cohortLeads.filter((l) => l.booking_stage === 'booking_confirmed').length;
  const conversionRate = totalLeads > 0 ? ((confirmedBookings / totalLeads) * 100).toFixed(1) : '0.0';

  const advancePaymentsSum = cohortLeads
    .filter((l) => Number(l.advance_amount) > 0)
    .reduce((sum, l) => sum + Number(l.advance_amount || 0), 0);
  const bookingsWithAdvanceCount = cohortLeads.filter((l) => Number(l.advance_amount) > 0).length;

  // Comparison metrics vs prior equivalent period from statsData
  const prevTotal = statsData?.prev_total_leads ?? 0;
  const leadsDiffPct = prevTotal > 0
    ? (((totalLeads - prevTotal) / prevTotal) * 100).toFixed(0)
    : null;

  // Customer Status Breakdown (exact 5 statuses)
  const statusCounts = useMemo(() => {
    const counts: Record<LeadTemperature, number> = {
      new: 0,
      hot: 0,
      warm: 0,
      cold: 0,
      not_interested: 0,
    };
    cohortLeads.forEach((l) => {
      const t = (l.lead_temperature || l.interest_level || 'new') as LeadTemperature;
      if (t in counts) counts[t]++;
      else counts.new++;
    });
    return counts;
  }, [cohortLeads]);

  // Booking Stage Breakdown (exact 9 stages)
  const stageCounts = useMemo(() => {
    const counts: Record<BookingStage, number> = {
      not_contacted: 0,
      contacted: 0,
      follow_up_required: 0,
      waiting_for_date: 0,
      waiting_for_price: 0,
      ready_to_book: 0,
      advance_paid: 0,
      booking_confirmed: 0,
      lost_closed: 0,
    };
    cohortLeads.forEach((l) => {
      const s = (l.booking_stage || 'not_contacted') as BookingStage;
      if (s in counts) counts[s]++;
      else counts.not_contacted++;
    });
    return counts;
  }, [cohortLeads]);

  // Lead Source Conversion Breakdown
  const sourcesTable = useMemo(() => {
    const map = new Map<string, { total: number; confirmed: number; advance: number }>();
    cohortLeads.forEach((l) => {
      const src = l.lead_source || 'manual_entry';
      if (!map.has(src)) map.set(src, { total: 0, confirmed: 0, advance: 0 });
      const item = map.get(src)!;
      item.total++;
      if (l.booking_stage === 'booking_confirmed') item.confirmed++;
      if (Number(l.advance_amount) > 0) item.advance += Number(l.advance_amount);
    });

    return Array.from(map.entries())
      .map(([src, d]) => ({
        source: src,
        total: d.total,
        confirmed: d.confirmed,
        conversionRate: d.total > 0 ? ((d.confirmed / d.total) * 100).toFixed(1) : '0.0',
        advance: d.advance,
      }))
      .sort((a, b) => b.total - a.total);
  }, [cohortLeads]);

  // Team Member Conversion Breakdown
  const teamTable = useMemo(() => {
    const map = new Map<string, { total: number; contacted: number; confirmed: number; advance: number }>();
    cohortLeads.forEach((l) => {
      const staff = l.assigned_team_member || 'Unassigned';
      if (!map.has(staff)) map.set(staff, { total: 0, contacted: 0, confirmed: 0, advance: 0 });
      const item = map.get(staff)!;
      item.total++;
      if (l.booking_stage && l.booking_stage !== 'not_contacted') item.contacted++;
      if (l.booking_stage === 'booking_confirmed') item.confirmed++;
      if (Number(l.advance_amount) > 0) item.advance += Number(l.advance_amount);
    });

    return Array.from(map.entries())
      .map(([member, d]) => ({
        member,
        total: d.total,
        contacted: d.contacted,
        confirmed: d.confirmed,
        conversionRate: d.total > 0 ? ((d.confirmed / d.total) * 100).toFixed(1) : '0.0',
        advance: d.advance,
      }))
      .sort((a, b) => b.total - a.total);
  }, [cohortLeads]);

  // Location Insights: Customer Cities vs Departure Cities
  const customerCities = useMemo(() => {
    const map = new Map<string, { total: number; confirmed: number }>();
    cohortLeads.forEach((l) => {
      const c = (l.city || '').trim();
      if (c) {
        if (!map.has(c)) map.set(c, { total: 0, confirmed: 0 });
        const item = map.get(c)!;
        item.total++;
        if (l.booking_stage === 'booking_confirmed') item.confirmed++;
      }
    });
    return Array.from(map.entries())
      .map(([city, d]) => ({ city, count: d.total, confirmed: d.confirmed }))
      .sort((a, b) => b.count - a.count);
  }, [cohortLeads]);

  const departureCities = useMemo(() => {
    const map = new Map<string, { total: number; confirmed: number }>();
    cohortLeads.forEach((l) => {
      const dc = (l.departure_city || '').trim();
      if (dc) {
        if (!map.has(dc)) map.set(dc, { total: 0, confirmed: 0 });
        const item = map.get(dc)!;
        item.total++;
        if (l.booking_stage === 'booking_confirmed') item.confirmed++;
      }
    });
    return Array.from(map.entries())
      .map(([city, d]) => ({ city, count: d.total, confirmed: d.confirmed }))
      .sort((a, b) => b.count - a.count);
  }, [cohortLeads]);

  // Demand Clusters (grouped by Destination + Travel Date + Departure City)
  const demandClusters = useMemo(() => {
    const validLeads = leads.filter(
      (l) =>
        l.booking_stage !== 'lost_closed' &&
        l.lead_temperature !== 'not_interested' &&
        l.interest_level !== 'not_interested'
    );

    const map = new Map<string, {
      destination: string;
      preferred_date: string | null;
      isFlexible: boolean;
      departure_city: string | null;
      leads: Lead[];
    }>();

    for (const lead of validLeads) {
      if (filterDestination !== 'all') {
        const dest = (lead.preferred_destination || lead.destination || '').toLowerCase();
        if (!dest.includes(filterDestination.toLowerCase())) continue;
      }

      const dest = lead.preferred_destination || lead.destination || 'Unspecified';
      const isFlex = lead.date_flexibility === 'any_future_batch' || !lead.preferred_travel_date;
      const dateKey = isFlex ? 'any_future' : (lead.preferred_travel_date || lead.preferred_date || 'flexible');
      const depCity = lead.departure_city || null;
      const key = `${dest.toLowerCase()}|${dateKey.toLowerCase()}|${(depCity || 'all').toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          destination: dest,
          preferred_date: isFlex ? null : (lead.preferred_travel_date || lead.preferred_date || null),
          isFlexible: isFlex,
          departure_city: depCity,
          leads: [],
        });
      }
      map.get(key)!.leads.push(lead);
    }

    return Array.from(map.values())
      .map((g) => {
        const groupLeads = g.leads;
        const totalCustomers = groupLeads.length;
        const totalTravellers = groupLeads.reduce(
          (sum, l) => sum + (Number(l.number_of_travellers || (l as any).pax_count) || 1),
          0
        );
        const hot = groupLeads.filter((l) => l.lead_temperature === 'hot' || l.interest_level === 'high_intent').length;
        const warm = groupLeads.filter((l) => l.lead_temperature === 'warm' || l.interest_level === 'interested').length;
        const readyToBook = groupLeads.filter((l) => l.booking_stage === 'ready_to_book').length;
        const advancePaid = groupLeads.filter((l) => l.booking_stage === 'advance_paid' || Number(l.advance_amount) > 0).length;
        const confirmed = groupLeads.filter((l) => l.booking_stage === 'booking_confirmed').length;

        // Potential revenue calculated only from recorded budgets
        let estRevenue: number | null = null;
        let revenueSum = 0;
        let hasPrice = false;
        groupLeads.forEach((l) => {
          const budget = Number(l.budget_per_person || (l as any).budget);
          const pax = Number(l.number_of_travellers || (l as any).pax_count) || 1;
          if (budget > 0) {
            revenueSum += budget * pax;
            hasPrice = true;
          }
        });
        if (hasPrice) estRevenue = revenueSum;

        return {
          destination: g.destination,
          preferred_date: g.preferred_date,
          isFlexible: g.isFlexible,
          departure_city: g.departure_city,
          total_customers: totalCustomers,
          total_travellers: totalTravellers,
          hot,
          warm,
          readyToBook,
          advancePaid,
          confirmed,
          estRevenue,
          leads: groupLeads,
        };
      })
      .sort((a, b) => b.total_travellers - a.total_travellers);
  }, [leads, filterDestination]);

  // Open Proposed Batch Modal from cluster
  const handleOpenBatchModal = (cluster: any) => {
    setBatchForm({
      destination: cluster.destination,
      proposed_date: cluster.preferred_date || getDateStr(14),
      proposed_price: cluster.estRevenue && cluster.total_travellers
        ? Math.round(cluster.estRevenue / cluster.total_travellers).toString()
        : '',
      capacity: '12',
      departure_city: cluster.departure_city || '',
    });
    setBatchModalOpen(true);
  };

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchSubmitting(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: batchForm.destination,
          proposed_date: batchForm.proposed_date,
          proposed_price: batchForm.proposed_price ? Number(batchForm.proposed_price) : null,
          capacity: Number(batchForm.capacity) || 12,
          departure_city: batchForm.departure_city || null,
          status: 'proposed',
        }),
      });
      if (res.ok) {
        alert('🎉 Proposed Batch created successfully!');
        setBatchModalOpen(false);
        fetchData();
      } else {
        alert('Failed to create batch');
      }
    } catch (err: any) {
      alert('Error creating batch: ' + err.message);
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setDatePreset('this_month');
    setCustomStart('');
    setCustomEnd('');
    setFilterDestination('all');
    setFilterSource('all');
    setFilterStaff('all');
  };

  return (
    <DashboardLayout
      title="Company Performance Dashboard"
      description="Real-time enquiry conversions, customer journey stages, location demand, and daily priorities."
    >
      <div className="space-y-6">
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 1. GLOBAL FILTER BAR & COHORT EXPLANATION                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <Card className="bg-white border-slate-200 shadow-xs p-4 rounded-xl">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-50 text-blue-700">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900">Dashboard Cohort Filters</span>
                  <span className="text-[11px] text-slate-500 block">
                    {totalLeads} matching enquiries in cohort
                  </span>
                </div>
              </div>

              <Button
                onClick={handleResetFilters}
                variant="outline"
                size="sm"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 border-slate-200 h-8 gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Date Preset */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Enquiry Period
                </label>
                <Select value={datePreset} onValueChange={setDatePreset}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Destination Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Destination
                </label>
                <Select value={filterDestination} onValueChange={setFilterDestination}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="All Destinations" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="all">All Destinations</SelectItem>
                    {uniqueDestinations.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead Source Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Lead Source
                </label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="all">All Sources</SelectItem>
                    {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Staff Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Assigned Team Member
                </label>
                <Select value={filterStaff} onValueChange={setFilterStaff}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="all">All Team Members</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.full_name || m.name || ''}>
                        {m.full_name || m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Date Range Row if 'custom' is selected */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>From:</span>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-8 w-36 text-xs bg-slate-50"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>To:</span>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-8 w-36 text-xs bg-slate-50"
                  />
                </div>
              </div>
            )}

            {/* Date Distinction Note */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between gap-2">
              <span>
                Cohort metrics are calculated from <strong>Enquiry Date (Created At)</strong>. Advance Payments reflect actual receipts. Demand clusters group by <strong>Preferred Travel Date</strong>.
              </span>
              <span className="font-mono text-slate-700 font-semibold flex-shrink-0">
                {activeDateRange.start ? `${activeDateRange.start} → ${activeDateRange.end}` : 'All Time'}
              </span>
            </div>
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 2. QUICK SUMMARY CARDS (7 CARDS)                                      */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Card 1: Total Leads */}
          <Card className="bg-white border-slate-200 shadow-2xs p-3.5 rounded-xl hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <span>Total Leads</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalLeads}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              {leadsDiffPct ? (
                <span className={Number(leadsDiffPct) >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                  {Number(leadsDiffPct) >= 0 ? `+${leadsDiffPct}%` : `${leadsDiffPct}%`} vs prior period
                </span>
              ) : (
                'In selected cohort'
              )}
            </div>
          </Card>

          {/* Card 2: New Leads */}
          <Card className="bg-white border-slate-200 shadow-2xs p-3.5 rounded-xl hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <span>New Leads</span>
              <Compass className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-blue-900 mt-1">{newLeads}</div>
            <div className="text-[10px] text-slate-500 mt-1">Awaiting qualification</div>
          </Card>

          {/* Card 3: Hot Leads */}
          <Card className="bg-rose-50/40 border-rose-200 shadow-2xs p-3.5 rounded-xl hover:border-rose-300 transition-colors">
            <div className="flex items-center justify-between text-rose-800 text-[10px] font-bold uppercase tracking-wider">
              <span>Hot Leads</span>
              <Flame className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-950 mt-1">{hotLeads}</div>
            <div className="text-[10px] text-rose-700 mt-1">Highest intent cohort</div>
          </Card>

          {/* Card 4: Follow-ups Due Today */}
          <Card className="bg-amber-50/40 border-amber-200 shadow-2xs p-3.5 rounded-xl hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between text-amber-900 text-[10px] font-bold uppercase tracking-wider">
              <span>Due Today</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">{followupsTodayList.length}</div>
            <div className="text-[10px] text-amber-800 mt-1 font-medium">
              {overdueFollowupsList.length > 0 ? (
                <span className="text-rose-600 font-bold">+{overdueFollowupsList.length} overdue</span>
              ) : (
                '0 overdue'
              )}
            </div>
          </Card>

          {/* Card 5: Confirmed Bookings */}
          <Card className="bg-emerald-50/40 border-emerald-200 shadow-2xs p-3.5 rounded-xl hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              <span>Confirmed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">{confirmedBookings}</div>
            <div className="text-[10px] text-emerald-700 mt-1">Stage confirmed</div>
          </Card>

          {/* Card 6: Conversion Rate */}
          <Card className="bg-white border-slate-200 shadow-2xs p-3.5 rounded-xl hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <span>Conversion</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{conversionRate}%</div>
            <div className="text-[10px] text-slate-500 mt-1" title="Confirmed Bookings ÷ Total Leads in period">
              {confirmedBookings}/{totalLeads} cohort leads
            </div>
          </Card>

          {/* Card 7: Total Advance Payments */}
          <Card className="bg-white border-slate-200 shadow-2xs p-3.5 rounded-xl hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <span>Advance Paid</span>
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              ₹{advancePaymentsSum.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {bookingsWithAdvanceCount} payments recorded
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 3. CUSTOMER STATUS OVERVIEW (TWO DEDICATED CHARTS)                     */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Leads by Lead Status */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Intent (Lead Status)</h3>
                <p className="text-[11px] text-slate-500">Distribution across 5 intent temperatures. Click to view leads.</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{totalLeads} Total</span>
            </div>

            <div className="space-y-2.5 pt-4">
              {([
                { key: 'new', label: 'New / Unassessed', color: 'bg-slate-400', count: statusCounts.new },
                { key: 'hot', label: 'Hot', color: 'bg-rose-500', count: statusCounts.hot },
                { key: 'warm', label: 'Warm', color: 'bg-amber-500', count: statusCounts.warm },
                { key: 'cold', label: 'Cold', color: 'bg-slate-300', count: statusCounts.cold },
                { key: 'not_interested', label: 'Not Interested', color: 'bg-slate-200', count: statusCounts.not_interested },
              ] as const).map((item) => {
                const pct = totalLeads > 0 ? ((item.count / totalLeads) * 100).toFixed(0) : '0';
                return (
                  <Link
                    key={item.key}
                    href={`/leads?lead_temperature=${item.key}`}
                    className="block group p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800 group-hover:text-blue-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.count}</span>
                        <span className="text-slate-400 text-[11px] w-8 text-right font-mono">{pct}%</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Chart 2: Leads by Booking Stage */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Journey (Booking Stage)</h3>
                <p className="text-[11px] text-slate-500">Pipeline progression across 9 stages. Click to view leads.</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{totalLeads} Total</span>
            </div>

            <div className="space-y-1.5 pt-3 max-h-[300px] overflow-y-auto pr-1">
              {(Object.keys(stageCounts) as BookingStage[]).map((stg) => {
                const count = stageCounts[stg];
                const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : '0';
                return (
                  <Link
                    key={stg}
                    href={`/leads?booking_stage=${stg}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border truncate ${BOOKING_STAGE_COLORS[stg]}`}>
                        {BOOKING_STAGE_LABELS[stg]}
                      </span>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-900 font-mono">{count}</span>
                      <span className="text-slate-400 text-[10px] font-mono w-7 text-right">{pct}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 4. SALES AND CONVERSION INSIGHTS                                       */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversion by Lead Source */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 rounded-xl lg:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Source Conversion & Paying Customers</h3>
                <p className="text-[11px] text-slate-500">
                  Tracks which sources generate actual paying customers, not just raw enquiries.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="py-2 px-2">Lead Source</th>
                    <th className="py-2 px-2 text-center">Enquiries</th>
                    <th className="py-2 px-2 text-center">Confirmed</th>
                    <th className="py-2 px-2 text-center">Conv. Rate</th>
                    <th className="py-2 px-2 text-right">Advance Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sourcesTable.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No enquiries recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    sourcesTable.map((s) => (
                      <tr key={s.source} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-2 font-medium text-slate-800">
                          <Link href={`/leads?lead_source=${s.source}`} className="hover:text-blue-700 hover:underline">
                            {(LEAD_SOURCE_LABELS as Record<string, string>)[s.source] || s.source}
                          </Link>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-700">{s.total}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-800">{s.confirmed}</td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            Number(s.conversionRate) >= 15 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.conversionRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                          {s.advance > 0 ? `₹${s.advance.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Lost Leads and Drop-off Analysis */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Lost Leads & Reasons</h3>
                <p className="text-[11px] text-slate-500">Analysis of unclosed enquiries</p>
              </div>

              <div className="pt-4 space-y-3">
                <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-rose-800 uppercase">Lost / Closed Leads</div>
                    <div className="text-xl font-black text-rose-950 mt-0.5">
                      {stageCounts.lost_closed + statusCounts.not_interested}
                    </div>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-rose-500 opacity-80" />
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-700 block">Recorded Drop-off Reasons:</span>
                  {statsData?.lost_reasons && statsData.lost_reasons.length > 0 ? (
                    <div className="space-y-1">
                      {statsData.lost_reasons.map((r: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 text-slate-700">
                          <span>{r.reason}</span>
                          <span className="font-mono font-bold">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-slate-50 border border-slate-200/60 text-slate-500 text-[11px] leading-relaxed">
                      <strong>Insufficient data:</strong> Specific drop-off reasons have not been recorded in call notes yet. Telecallers should log reasons during interaction calls.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 text-[10px] text-slate-400 border-t border-slate-100 mt-4">
              Denominator: Total cohort enquiries ({totalLeads}).
            </div>
          </Card>
        </div>

        {/* Team Performance Table */}
        <Card className="bg-white border-slate-200 shadow-xs p-5 rounded-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Conversion by Assigned Team Member</h3>
              <p className="text-[11px] text-slate-500">Individual telecaller contact volume and booking conversion</p>
            </div>
          </div>

          <div className="overflow-x-auto pt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold">
                  <th className="py-2 px-2">Team Member</th>
                  <th className="py-2 px-2 text-center">Assigned Leads</th>
                  <th className="py-2 px-2 text-center">Contacted</th>
                  <th className="py-2 px-2 text-center">Confirmed</th>
                  <th className="py-2 px-2 text-center">Conversion %</th>
                  <th className="py-2 px-2 text-right">Advances Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamTable.map((t) => (
                  <tr key={t.member} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-2 font-semibold text-slate-800">
                      <Link href={`/leads?assigned_team_member=${encodeURIComponent(t.member)}`} className="hover:text-blue-700 hover:underline">
                        {t.member}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-700">{t.total}</td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-700">{t.contacted}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-800">{t.confirmed}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-900">{t.conversionRate}%</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                      {t.advance > 0 ? `₹${t.advance.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 5. CUSTOMER LOCATION INSIGHTS (WHERE OUR CUSTOMERS ARE FROM)          */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Customer Cities */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Customer Residence Cities</h3>
              </div>
              <span className="text-[11px] text-slate-500">Where clients live</span>
            </div>

            <div className="space-y-2 pt-3">
              {customerCities.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No customer cities recorded yet in this cohort.
                </div>
              ) : (
                customerCities.slice(0, 8).map((c) => (
                  <Link
                    key={c.city}
                    href={`/leads?search=${encodeURIComponent(c.city)}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <span className="font-semibold text-slate-800 text-xs group-hover:text-blue-700">
                      {c.city}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-600">{c.count} leads</span>
                      {c.confirmed > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold">
                          {c.confirmed} confirmed
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Top Departure Cities */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Trip Departure Cities</h3>
              </div>
              <span className="text-[11px] text-slate-500">Where tours start</span>
            </div>

            <div className="space-y-2 pt-3">
              {departureCities.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No departure cities specified yet.
                </div>
              ) : (
                departureCities.slice(0, 8).map((c) => (
                  <Link
                    key={c.city}
                    href={`/leads?search=${encodeURIComponent(c.city)}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <span className="font-semibold text-slate-800 text-xs group-hover:text-emerald-700">
                      {c.city}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-600">{c.count} leads</span>
                      {c.confirmed > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold">
                          {c.confirmed} booked
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 6. FUTURE TRIP DEMAND — HIGH PRIORITY                                  */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <Card className="bg-white border-slate-200 shadow-xs p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-50 text-purple-700">
                  <Compass className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Future Trip Demand Clusters</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifies which upcoming destinations and weekends have verified customer interest before launching new batches.
              </p>
            </div>

            <Link href="/demand">
              <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 border-slate-200">
                Full Demand Manager <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {demandClusters.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No active demand clusters recorded.
              </div>
            ) : (
              demandClusters.slice(0, 6).map((c, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{c.destination}</span>
                      {c.isFlexible ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          Flexible Future Demand (Any Trip)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(c.preferred_date)}
                        </span>
                      )}
                      {c.departure_city && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          From: {c.departure_city}
                        </span>
                      )}
                    </div>

                    {/* Metrics Breakdown Row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span><strong>{c.total_customers}</strong> Customers</span>
                      <span>•</span>
                      <span><strong>{c.total_travellers}</strong> Potential Travellers (Party Size)</span>
                      <span>•</span>
                      <span className="text-rose-700 font-semibold">{c.hot} Hot</span>
                      <span>•</span>
                      <span className="text-teal-700 font-semibold">{c.readyToBook} Ready to Book</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">{c.confirmed} Confirmed</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Estimated Potential Revenue:{' '}
                      <strong className="text-slate-800">
                        {c.estRevenue ? `₹${c.estRevenue.toLocaleString('en-IN')}` : 'Insufficient price data'}
                      </strong>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/leads?destination=${encodeURIComponent(c.destination)}`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 font-semibold text-slate-700 border-slate-300">
                        View {c.total_customers} Leads
                      </Button>
                    </Link>

                    <Button
                      onClick={() => handleOpenBatchModal(c)}
                      size="sm"
                      className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Propose Batch
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 7. TODAY'S PRIORITIES (ACTION LIST)                                    */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <Card className="bg-white border-slate-200 shadow-xs p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900">Action Needed Today</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Prioritized queue: overdue follow-ups, scheduled calls, uncontacted hot leads, and pending quotes.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
              {priorities.length} Tasks Pending
            </span>
          </div>

          <div className="space-y-2.5">
            {priorities.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                🎉 All caught up! No urgent actions or overdue follow-ups for today.
              </div>
            ) : (
              priorities.slice(0, 10).map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {p.urgency === 'urgent' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                          OVERDUE
                        </span>
                      ) : p.urgency === 'high' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          HIGH
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          QUEUE
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span>{p.lead.full_name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({p.lead.whatsapp_number})</span>
                        {p.lead.assigned_team_member && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            • {p.lead.assigned_team_member}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>📍 {p.lead.preferred_destination || 'General Enquiry'}</span>
                        <span>🗓️ {p.lead.preferred_travel_date || 'Flexible'}</span>
                        <span>•</span>
                        <span className="text-slate-700 font-semibold">{p.note}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={getWhatsAppLink(p.lead.whatsapp_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>

                    <a
                      href={getCallLink(p.lead.whatsapp_number)}
                      className="px-2.5 py-1 rounded-md bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>

                    <Button
                      onClick={() => setLogCallLead(p.lead)}
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-7 px-2.5 text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      Log
                    </Button>

                    <Button
                      onClick={() => setSelectedLead(p.lead)}
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-7 px-2.5 text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 8. RECENT ACTIVITY TIMELINE                                            */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <Card className="bg-white border-slate-200 shadow-xs p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Recent Team Activity</h2>
            </div>
            <Link href="/activity">
              <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
                View All Activity →
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent interactions recorded yet. Calls and notes logged will appear here.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {act.team_member || 'Agent'} • <span className="capitalize">{act.activity_type.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(act.activity_date || act.created_at)}
                      </span>
                    </div>
                    {act.notes && <p className="text-slate-600 text-[11px] mt-0.5">{act.notes}</p>}
                    {act.outcome && (
                      <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        Outcome: {act.outcome}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updated) => {
            if (updated) setSelectedLead(updated);
            fetchData();
          }}
          onEdit={() => {}}
          onDelete={() => {
            setSelectedLead(null);
            fetchData();
          }}
        />
      )}

      {logCallLead && (
        <LogCallModal
          lead={logCallLead}
          open={!!logCallLead}
          onClose={() => setLogCallLead(null)}
          onSuccess={() => {
            setLogCallLead(null);
            fetchData();
          }}
        />
      )}

      {/* Create Proposed Batch Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="bg-white border-slate-200 shadow-xl max-w-md w-full p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Proposed Batch from Demand</h3>
            <p className="text-xs text-slate-500">
              Validating customer interest into an operational batch for bookings.
            </p>

            <form onSubmit={handleCreateBatchSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Destination</label>
                <Input
                  value={batchForm.destination}
                  onChange={(e) => setBatchForm({ ...batchForm, destination: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Proposed Date</label>
                <Input
                  type="date"
                  value={batchForm.proposed_date}
                  onChange={(e) => setBatchForm({ ...batchForm, proposed_date: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Departure City</label>
                <Input
                  value={batchForm.departure_city}
                  onChange={(e) => setBatchForm({ ...batchForm, departure_city: e.target.value })}
                  placeholder="e.g. Kochi"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Price per Pax (₹)</label>
                  <Input
                    type="number"
                    value={batchForm.proposed_price}
                    onChange={(e) => setBatchForm({ ...batchForm, proposed_price: e.target.value })}
                    placeholder="e.g. 25000"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Capacity (Seats)</label>
                  <Input
                    type="number"
                    value={batchForm.capacity}
                    onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBatchModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={batchSubmitting}
                  size="sm"
                  className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white text-xs font-semibold"
                >
                  {batchSubmitting ? 'Creating...' : 'Create Batch'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
