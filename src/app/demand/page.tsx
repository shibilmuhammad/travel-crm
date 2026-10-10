'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InterestBadge, BookingBadge } from '@/components/crm/StatusBadges';
import {
  TrendingUp, Users, Calendar, Rocket, MapPin, IndianRupee,
  Filter, ChevronDown, ChevronUp, Check, AlertCircle, RefreshCw, X,
} from 'lucide-react';
import type { DemandGroup, DemandFilters, Lead } from '@/types';
import { INTEREST_LEVEL_LABELS, BOOKING_STAGE_LABELS } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function DemandPage() {
  const [groups, setGroups] = useState<DemandGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [batchModalGroup, setBatchModalGroup] = useState<DemandGroup | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<DemandFilters>({});

  // Create Batch Form state
  const [batchForm, setBatchForm] = useState({
    destination: '',
    proposed_date: '',
    end_date: '',
    proposed_price: '',
    capacity: '12',
    minimum_viable_size: '6',
    departure_city: '',
    notes: '',
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);

  const fetchDemand = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.destination) params.set('destination', filters.destination);
      if (filters.travel_date) params.set('travel_date', filters.travel_date);
      if (filters.date_range_start) params.set('date_range_start', filters.date_range_start);
      if (filters.date_range_end) params.set('date_range_end', filters.date_range_end);
      if (filters.departure_city) params.set('departure_city', filters.departure_city);

      const res = await fetch(`/api/demand?${params}`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDemand();
  }, [fetchDemand]);

  const openBatchModal = (group: DemandGroup) => {
    setBatchModalGroup(group);
    setBatchForm({
      destination: group.destination,
      proposed_date: group.preferred_date || new Date().toISOString().split('T')[0],
      end_date: '',
      proposed_price: group.estimated_revenue && group.total_travellers
        ? Math.round(group.estimated_revenue / group.total_travellers).toString()
        : '25000',
      capacity: '12',
      minimum_viable_size: '6',
      departure_city: group.departure_city || '',
      notes: `Batch created from Demand Cluster (${group.total_customers} leads, ${group.total_travellers} travellers).`,
    });
    setBatchSuccess(false);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchModalGroup) return;

    setBatchSubmitting(true);
    try {
      const payload = {
        ...batchForm,
        proposed_price: batchForm.proposed_price ? parseFloat(batchForm.proposed_price) : null,
        capacity: parseInt(batchForm.capacity) || 12,
        minimum_viable_size: parseInt(batchForm.minimum_viable_size) || 6,
        linked_lead_ids: batchModalGroup.leads.map((l) => l.id),
      };

      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create batch');

      setBatchSuccess(true);
      setTimeout(() => {
        setBatchModalGroup(null);
        setBatchSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setBatchSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Trip Demand Planning" description="Aggregated enquiry interest clustered by destination & preferred travel month to decide batch launches.">
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{groups.length}</strong> active demand clusters
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" /> Filter Demand
          </Button>
        </div>

        {/* Demand Groups */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : groups.length === 0 ? (
          <Card className="bg-white border-slate-200 p-12 text-center text-slate-500">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-sm font-semibold">No demand clusters found.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group, idx) => {
              const groupKey = `${group.destination}-${group.preferred_date || 'nodate'}`;
              const isExpanded = expandedGroup === groupKey;

              const demandTier = group.high_intent >= 2 || group.total_travellers >= 5
                ? 'High Demand Ready'
                : group.total_travellers >= 3
                ? 'Moderate Interest'
                : 'Low / Emerging';

              let tierBg = 'bg-slate-100 text-slate-700 border-slate-200';
              if (demandTier === 'High Demand Ready') tierBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              else if (demandTier === 'Moderate Interest') tierBg = 'bg-blue-50 text-blue-700 border-blue-200';

              return (
                <Card key={idx} className="bg-white border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900">{group.destination}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tierBg}`}>
                          {demandTier}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>🗓️ Travel Date: <strong>{group.preferred_date ? formatDate(group.preferred_date) : 'Flexible'}</strong></span>
                        <span>👥 {group.total_customers} Enquiries ({group.total_travellers} Travellers)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openBatchModal(group)}
                        size="sm"
                        className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white text-xs font-semibold gap-1.5 shadow"
                      >
                        <Rocket className="w-3.5 h-3.5" /> Launch Batch
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}
                        className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Lead List */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold text-slate-700 mb-2">Interested Customers in this Cluster</div>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5">Name</th>
                              <th className="px-4 py-2.5">Phone</th>
                              <th className="px-4 py-2.5">Pax</th>
                              <th className="px-4 py-2.5">Budget</th>
                              <th className="px-4 py-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.leads.map((lead: Lead) => (
                              <tr key={lead.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-bold text-slate-900">{lead.full_name}</td>
                                <td className="px-4 py-2.5 text-slate-600 font-mono">{lead.whatsapp_number}</td>
                                <td className="px-4 py-2.5 text-slate-600">{lead.number_of_travellers || 1}</td>
                                <td className="px-4 py-2.5 text-slate-600">{lead.budget_per_person ? formatCurrency(lead.budget_per_person) : '—'}</td>
                                <td className="px-4 py-2.5">
                                  <InterestBadge level={lead.interest_level || 'new'} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
