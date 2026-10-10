'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ActivityTypeBadge } from '@/components/crm/StatusBadges';
import { MessageSquare, Search, RefreshCw } from 'lucide-react';
import type { LeadActivity, ActivityType } from '@/types';
import { ACTIVITY_TYPE_LABELS } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function ActivityPage() {
  const [activities, setActivities] = useState<(LeadActivity & { lead_name?: string; lead_phone?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType | ''>('');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = activities.filter((a) => {
    const matchesType = !typeFilter || a.activity_type === typeFilter;
    const matchesSearch = !search || (a.notes || '').toLowerCase().includes(search.toLowerCase()) || (a.team_member || '').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <DashboardLayout
      title="Call Notes & Activity History"
      description="Searchable feed of all recorded customer calls, WhatsApp messages, and staff interaction notes."
      actions={
        <Button variant="outline" size="sm" onClick={fetchActivities} disabled={loading} className="border-slate-300 text-slate-700 text-xs gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="bg-white border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search notes or team member…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>

            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v as ActivityType)}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-slate-300 text-slate-900 text-xs">
                <SelectValue placeholder="All Interaction Types" />
              </SelectTrigger>
              <SelectContent className="bg-white text-slate-900">
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y divide-slate-100 pt-2">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading activity feed…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No activities match your filter.</div>
            ) : (
              filtered.map((act) => (
                <div key={act.id} className="py-4 space-y-2 hover:bg-slate-50 p-3 rounded-lg transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ActivityTypeBadge type={act.activity_type} />
                      <span className="font-bold text-slate-900">{act.team_member || 'Staff'}</span>
                    </div>
                    <span className="text-slate-400 font-mono">{formatDateTime(act.activity_date || act.created_at)}</span>
                  </div>

                  {act.notes && (
                    <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-md border border-slate-200 leading-relaxed">
                      {act.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
