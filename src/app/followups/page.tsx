'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadDetailModal } from '@/components/crm/LeadDetailModal';
import { LeadForm } from '@/components/crm/LeadForm';
import { CompleteFollowupModal } from '@/components/crm/CompleteFollowupModal';
import {
  Eye, Check, RefreshCw, CheckCircle2, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, X,
  Phone, MessageSquare
} from 'lucide-react';
import type { Lead, BookingStage, LeadTemperature } from '@/types';
import {
  BOOKING_STAGE_LABELS,
  BOOKING_STAGE_COLORS,
  LEAD_TEMPERATURE_LABELS,
  LEAD_TEMPERATURE_COLORS,
} from '@/types';
import { formatDate, formatPhoneNumber, getCallLink, getWhatsAppLink, parseToISODate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

type TabType = 'today' | 'overdue' | 'upcoming' | 'done';
type SortField = 'scheduled' | 'booking_stage' | 'lead_status' | 'name' | 'last_contacted';

const getLeadStatusPriority = (lead: Lead): number => {
  const status = (lead.lead_temperature || lead.interest_level || '').toLowerCase().trim();
  if (status === 'hot' || status === 'high_intent') return 1;
  if (status === 'warm' || status === 'interested') return 2;
  if (status === 'cold' || status === 'low_interest') return 3;
  if (status === 'not_interested' || status === 'not interested') return 4;
  return 5;
};

export default function FollowupsPage() {
  const { currentUser, isTelecaller, teamMembers } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');

  const [bookingStageFilter, setBookingStageFilter] = useState<string>('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [sortBy, setSortBy] = useState<SortField>('scheduled');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [completeLead, setCompleteLead] = useState<Lead | null>(null);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?page_size=500`);
      const data = await res.json();
      const leads: Lead[] = data.leads || [];
      setAllLeads(leads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const handleViewLead = (lead: Lead) => {
    setViewLead(lead);
    if (typeof window !== 'undefined') {
      window.history.pushState({ viewLeadId: lead.id }, '', `/followups?id=${lead.id}`);
    }
  };

  const handleCloseLead = () => {
    setViewLead(null);
    if (typeof window !== 'undefined' && window.location.search.includes('id=')) {
      window.history.pushState(null, '', '/followups');
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setViewLead(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (viewLead?.id === id) handleCloseLead();
        fetchFollowups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [todayStr, setTodayStr] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setTodayStr(`${y}-${m}-${d}`);
  }, []);

  const matchesStaff = (assigned?: string | null, filter?: string | null): boolean => {
    if (!filter || filter === 'all') return true;
    if (!assigned) return false;
    const a = assigned.trim().toLowerCase();
    const f = filter.trim().toLowerCase();
    if (a === f) return true;
    if (a.includes(f) || f.includes(a)) return true;
    const aFirst = a.split(/\s+/)[0];
    const fFirst = f.split(/\s+/)[0];
    return Boolean(aFirst && fFirst && aFirst === fFirst);
  };

  // Telecaller / Staff filter logic
  const filteredLeadsByStaff = allLeads.filter((l) => {
    if (isTelecaller) {
      const myName = currentUser?.full_name || currentUser?.name || '';
      return matchesStaff(l.assigned_team_member, myName);
    }
    if (selectedStaff !== 'all') {
      return matchesStaff(l.assigned_team_member, selectedStaff);
    }
    return true;
  });

  // Group leads into tab categories using normalized date strings
  const todayList = !todayStr ? [] : filteredLeadsByStaff.filter((l) => {
    if (l.next_followup_status === 'completed' || l.booking_stage === 'lost_closed' || l.booking_stage === 'booking_confirmed') {
      return false;
    }
    const dateStr = parseToISODate(l.next_followup_date);
    return Boolean(dateStr && dateStr === todayStr);
  });

  const overdueList = !todayStr ? [] : filteredLeadsByStaff.filter((l) => {
    if (l.next_followup_status === 'completed' || l.booking_stage === 'lost_closed' || l.booking_stage === 'booking_confirmed') {
      return false;
    }
    const dateStr = parseToISODate(l.next_followup_date);
    return Boolean(dateStr && dateStr < todayStr);
  });

  const upcomingList = !todayStr ? [] : filteredLeadsByStaff.filter((l) => {
    if (l.next_followup_status === 'completed' || l.booking_stage === 'lost_closed' || l.booking_stage === 'booking_confirmed') {
      return false;
    }
    const dateStr = parseToISODate(l.next_followup_date);
    return Boolean(dateStr && dateStr > todayStr);
  });

  const doneList = filteredLeadsByStaff.filter(
    (l) => l.next_followup_status === 'completed' || l.booking_stage === 'booking_confirmed'
  );

  const tabLists: Record<TabType, Lead[]> = {
    today: todayList,
    overdue: overdueList,
    upcoming: upcomingList,
    done: doneList,
  };

  const currentTabLeads = tabLists[activeTab] || [];

  // Filter current tab leads by Booking Stage, Lead Status, and Search Query
  const filteredLeads = currentTabLeads.filter((l) => {
    if (bookingStageFilter !== 'all' && l.booking_stage !== bookingStageFilter) {
      return false;
    }
    if (leadStatusFilter !== 'all' && (l.lead_temperature || 'new') !== leadStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (l.full_name || '').toLowerCase().includes(q);
      const phoneMatch = (l.whatsapp_number || '').includes(q);
      if (!nameMatch && !phoneMatch) return false;
    }
    return true;
  });

  // Sort filtered leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'scheduled') {
      const dateA = (a.next_followup_date || '') + (a.next_followup_time || '');
      const dateB = (b.next_followup_date || '') + (b.next_followup_time || '');
      comp = dateA.localeCompare(dateB);
    } else if (sortBy === 'booking_stage') {
      const stageA = BOOKING_STAGE_LABELS[a.booking_stage || 'not_contacted'] || '';
      const stageB = BOOKING_STAGE_LABELS[b.booking_stage || 'not_contacted'] || '';
      comp = stageA.localeCompare(stageB);
    } else if (sortBy === 'lead_status') {
      const priorityA = getLeadStatusPriority(a);
      const priorityB = getLeadStatusPriority(b);
      comp = priorityA - priorityB;
      if (comp === 0) {
        comp = (a.full_name || '').localeCompare(b.full_name || '');
      }
    } else if (sortBy === 'name') {
      comp = (a.full_name || '').localeCompare(b.full_name || '');
    } else if (sortBy === 'last_contacted') {
      const dateA = a.last_contacted_date || '';
      const dateB = b.last_contacted_date || '';
      comp = dateA.localeCompare(dateB);
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const handleHeaderSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const hasActiveFilters =
    bookingStageFilter !== 'all' || leadStatusFilter !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setBookingStageFilter('all');
    setLeadStatusFilter('all');
    setSearchQuery('');
  };

  // If user clicked "View Lead", render the exact Lead Detail View page
  if (viewLead) {
    return (
      <DashboardLayout>
        <LeadDetailModal
          lead={viewLead}
          onClose={handleCloseLead}
          onUpdate={async (updatedLead) => {
            if (updatedLead) {
              // Optimistically update the viewed lead immediately
              setViewLead(updatedLead);
              // Also update it in allLeads so tab counts stay accurate
              setAllLeads((prev) =>
                prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
              );
            }
            // Refresh allLeads from server in background (don't await so UI isn't blocked)
            fetchFollowups();
          }}
          onEdit={(l) => setEditLead(l)}
          onDelete={(id) => handleDeleteLead(id)}
        />

        {editLead && (
          <LeadForm
            lead={editLead}
            open={!!editLead}
            onClose={() => setEditLead(null)}
            onSuccess={() => {
              fetchFollowups();
              setEditLead(null);
            }}
          />
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Follow-ups" description="Manage and log daily follow-up calls with customers.">
      <div className="space-y-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs: Today, Overdue, Upcoming, Done */}
          <div className="flex items-center gap-2 bg-slate-100/70 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Today
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                activeTab === 'today' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {todayList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'overdue'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Overdue
              {overdueList.length > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                  activeTab === 'overdue' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
                }`}>
                  {overdueList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Upcoming
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                activeTab === 'upcoming' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {upcomingList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('done')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'done'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Done
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                activeTab === 'done' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {doneList.length}
              </span>
            </button>
          </div>

          {/* Telecaller Filter Dropdown */}
          {!isTelecaller && (
            <div className="flex items-center gap-2">
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-[180px] bg-white border-slate-300 text-xs font-semibold text-slate-800 rounded-lg shadow-2xs">
                  <SelectValue placeholder="All Telecallers" />
                </SelectTrigger>
                <SelectContent className="bg-white text-xs text-slate-800">
                  <SelectItem value="all">All Telecallers</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.full_name || member.name || ''}>
                      {member.full_name || member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filters & Sorting Toolbar */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-2xl p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lead or phone number..."
                className="pl-9 bg-slate-50 border-slate-200 text-xs h-9 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Booking Stage Filter */}
              <div className="w-[160px]">
                <Select value={bookingStageFilter} onValueChange={setBookingStageFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-xs font-semibold text-slate-700 h-9 rounded-lg">
                    <SelectValue placeholder="Booking Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs text-slate-800">
                    <SelectItem value="all">All Booking Statuses</SelectItem>
                    {Object.entries(BOOKING_STAGE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead Status (Temperature) Filter */}
              <div className="w-[150px]">
                <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-xs font-semibold text-slate-700 h-9 rounded-lg">
                    <SelectValue placeholder="Lead Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs text-slate-800">
                    <SelectItem value="all">All Lead Statuses</SelectItem>
                    {Object.entries(LEAD_TEMPERATURE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By Select */}
              <div className="w-[150px]">
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortField)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-xs font-semibold text-slate-700 h-9 rounded-lg">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs text-slate-800">
                    <SelectItem value="scheduled">Scheduled Date</SelectItem>
                    <SelectItem value="booking_stage">Booking Status</SelectItem>
                    <SelectItem value="lead_status">Lead Status</SelectItem>
                    <SelectItem value="name">Lead Name</SelectItem>
                    <SelectItem value="last_contacted">Last Contacted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-9 px-3 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg gap-1"
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-3.5 h-3.5 text-slate-500" /> Asc
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 text-slate-500" /> Desc
                  </>
                )}
              </Button>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-lg gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Follow-up Table Card */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-2xl overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <div>
              Showing {sortedLeads.length} of {currentTabLeads.length}{' '}
              {currentTabLeads.length === 1 ? 'follow-up' : 'follow-ups'}
            </div>
            {hasActiveFilters && (
              <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtered
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : sortedLeads.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-medium">
              {hasActiveFilters
                ? 'No follow-ups match the selected filters.'
                : `No follow-ups found in ${activeTab} queue.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th
                      onClick={() => handleHeaderSort('scheduled')}
                      className="pb-3 font-semibold cursor-pointer hover:text-slate-700 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        SCHEDULED FOR
                        {sortBy === 'scheduled' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort('name')}
                      className="pb-3 font-semibold cursor-pointer hover:text-slate-700 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        LEAD & PHONE
                        {sortBy === 'name' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort('lead_status')}
                      className="pb-3 font-semibold cursor-pointer hover:text-slate-700 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        LEAD STATUS
                        {sortBy === 'lead_status' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort('booking_stage')}
                      className="pb-3 font-semibold cursor-pointer hover:text-slate-700 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        BOOKING STATUS
                        {sortBy === 'booking_stage' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="pb-3 font-semibold">TELECALLER</th>
                    <th className="pb-3 font-semibold">NOTES</th>
                    <th className="pb-3 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sortedLeads.map((lead) => {
                    const tempKey: LeadTemperature = lead.lead_temperature || 'new';
                    const stageKey: BookingStage = lead.booking_stage || 'not_contacted';

                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div>{formatDate(lead.next_followup_date)}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {lead.next_followup_time || '10:00 AM'}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="font-extrabold text-slate-900">{lead.full_name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <a
                              href={getCallLink(lead.whatsapp_number)}
                              className="p-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                              title="Call Phone"
                            >
                              <Phone className="w-3 h-3 text-slate-600" />
                            </a>
                            <a
                              href={getWhatsAppLink(lead.whatsapp_number)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                              title="WhatsApp Message"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                            </a>
                            <span className="text-slate-600 font-mono text-[11px] font-semibold">
                              {formatPhoneNumber(lead.whatsapp_number)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 text-[11px] font-extrabold rounded-full inline-block ${
                              LEAD_TEMPERATURE_COLORS[tempKey] || LEAD_TEMPERATURE_COLORS.new
                            }`}
                          >
                            {LEAD_TEMPERATURE_LABELS[tempKey] || 'New'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg inline-block ${
                              BOOKING_STAGE_COLORS[stageKey] || BOOKING_STAGE_COLORS.not_contacted
                            }`}
                          >
                            {BOOKING_STAGE_LABELS[stageKey] || 'Not Contacted'}
                          </span>
                        </td>
                        <td className="py-4 font-semibold text-slate-700">
                          {lead.assigned_team_member || 'Fazl'}
                        </td>
                        <td className="py-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {lead.notes || '—'}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={getCallLink(lead.whatsapp_number)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 shadow-2xs transition-colors"
                              title="Call Lead"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-700" />
                            </a>
                            <a
                              href={getWhatsAppLink(lead.whatsapp_number)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-colors"
                              title="WhatsApp Message"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            </a>

                            <Button
                              onClick={() => handleViewLead(lead)}
                              variant="outline"
                              size="sm"
                              className="bg-white border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold px-3 py-1 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" /> View Lead
                            </Button>

                            {activeTab === 'done' || lead.next_followup_status === 'completed' ? (
                              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Done
                              </span>
                            ) : (
                              <Button
                                onClick={() => setCompleteLead(lead)}
                                size="sm"
                                className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white text-xs font-bold px-3 py-1 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Check className="w-3.5 h-3.5" /> Done
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Complete Follow-up Call Note Modal */}
      {completeLead && (
        <CompleteFollowupModal
          lead={completeLead}
          open={!!completeLead}
          onClose={() => setCompleteLead(null)}
          onSuccess={() => fetchFollowups()}
        />
      )}
    </DashboardLayout>
  );
}

