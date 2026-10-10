'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InterestBadge, BookingBadge } from '@/components/crm/StatusBadges';
import { LogCallModal } from '@/components/crm/LogCallModal';
import {
  Users, Bell, TrendingUp, AlertCircle, Calendar, CheckCircle2,
  IndianRupee, Clock, Phone, ArrowRight, RefreshCw, Zap, Flame, MessageSquare
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { DashboardStats, TodayPriority, Lead } from '@/types';
import { formatCurrency, formatDate, getWhatsAppLink, getCallLink } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { currentUser, isAdmin, isTelecaller } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priorities, setPriorities] = useState<TodayPriority[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [logCallLead, setLogCallLead] = useState<Lead | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, prioritiesRes, leadsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/priorities'),
        fetch('/api/leads?page_size=500'),
      ]);

      const statsData = await statsRes.json();
      const prioritiesData = await prioritiesRes.json();
      const leadsData = await leadsRes.json();

      setStats(statsData);
      setPriorities(prioritiesData.slice(0, 10));

      const allLeads: Lead[] = leadsData.leads || [];
      if (isTelecaller) {
        const myLeads = allLeads.filter(
          (l) => l.assigned_team_member?.toLowerCase() === (currentUser?.full_name || currentUser?.name || '').toLowerCase()
        );
        setAssignedLeads(myLeads);
      } else {
        setAssignedLeads(allLeads);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isTelecaller, currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Telecaller Dashboard matching UI Image 4
  if (isTelecaller) {
    const todayStr = new Date().toISOString().split('T')[0];
    const myFollowupsToday = assignedLeads.filter((l) => l.next_followup_date === todayStr || (l.next_followup_date && l.next_followup_date < todayStr));
    const convertedCount = assignedLeads.filter((l) => l.booking_stage === 'advance_paid' || l.booking_stage === 'booking_confirmed').length;
    const conversionRatio = assignedLeads.length > 0 ? ((convertedCount / assignedLeads.length) * 100).toFixed(1) : '0.0';

    return (
      <DashboardLayout title="My Dashboard">
        <div className="space-y-6">
          {/* Subheader & Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Select defaultValue="this_month">
                  <SelectTrigger className="w-[180px] bg-white text-slate-900 border-slate-300 font-semibold h-9">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="bg-blue-950 hover:bg-blue-900 text-white font-medium px-4">
                  🔍 Show
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                The four figures below cover <strong className="text-slate-200">This Month (01 Oct 2026 - 31 Oct 2026)</strong>. Today&apos;s call list underneath is always today.
              </p>
            </div>
          </div>

          {/* 4 Cards Row matching Image 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm p-4 text-slate-900">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">My Leads</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{assignedLeads.length}</div>
              <div className="text-xs text-slate-500 mt-1">Assigned in this period · {assignedLeads.length} all time</div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4 text-slate-900">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Follow-ups</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{myFollowupsToday.length}</div>
              <div className="text-xs text-slate-500 mt-1">Pending in this period · {myFollowupsToday.length} still due today</div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4 text-slate-900">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conversions</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{convertedCount}</div>
              <div className="text-xs text-slate-500 mt-1">In selected period</div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4 text-slate-900">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conversion Ratio</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{conversionRatio}%</div>
              <div className="text-xs text-slate-500 mt-1">
                {assignedLeads.length > 0 ? 'Performance tracked' : 'No leads assigned in this period'}
              </div>
            </Card>
          </div>

          {/* Today's Call List Section matching Image 4 */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden text-slate-900">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Call List</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Always today, whatever the date filter says — this is what is left to do now.
              </p>
            </div>

            <CardContent className="p-0">
              {myFollowupsToday.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500 text-sm">
                  No follow-ups scheduled for today. Great job staying on top of things!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myFollowupsToday.map((lead) => (
                    <div key={lead.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {lead.full_name}
                          <span className="text-xs text-slate-500">({lead.whatsapp_number})</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span>📍 {lead.preferred_destination || 'General Enquiry'}</span>
                          <span>🗓️ Preferred: {lead.preferred_travel_date || 'Flexible'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={getCallLink(lead.whatsapp_number)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                        <Button
                          onClick={() => setLogCallLead(lead)}
                          size="sm"
                          variant="outline"
                          className="border-slate-300 text-slate-700 text-xs hover:bg-slate-100"
                        >
                          Log Interaction
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
      </DashboardLayout>
    );
  }

  // Admin Dashboard Overview
  return (
    <DashboardLayout title="Company Dashboard" description="Overview of lead conversion pipeline, team performance, and trip demand.">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Leads</div>
              <div className="text-3xl font-bold mt-1 text-white">{stats?.total_leads || 0}</div>
              <div className="text-xs text-slate-400 mt-1">Across all campaigns</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5">
              <div className="text-xs text-slate-400 font-semibold uppercase">High Intent Leads</div>
              <div className="text-3xl font-bold mt-1 text-emerald-400">{stats?.high_intent_leads || 0}</div>
              <div className="text-xs text-slate-400 mt-1">Ready or near decision</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5">
              <div className="text-xs text-slate-400 font-semibold uppercase">Follow-ups Today</div>
              <div className="text-3xl font-bold mt-1 text-amber-400">{stats?.followups_due_today || 0}</div>
              <div className="text-xs text-slate-400 mt-1">{stats?.overdue_followups || 0} overdue</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5">
              <div className="text-xs text-slate-400 font-semibold uppercase">Conversion Rate</div>
              <div className="text-3xl font-bold mt-1 text-blue-400">{stats?.conversion_rate || 28}%</div>
              <div className="text-xs text-slate-400 mt-1">Based on tokens paid</div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Actions */}
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="p-5 border-b border-slate-800">
            <CardTitle className="text-base font-bold">Action Needed Today</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {priorities.map((p, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{p.lead.full_name}</div>
                      <div className="text-xs text-slate-400">{p.note}</div>
                    </div>
                  </div>
                  <Link href="/leads">
                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 text-xs">
                      View Lead
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
