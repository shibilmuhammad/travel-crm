'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tag, Database, Globe, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DESTINATIONS = ['Spiti Valley', 'Meghalaya', 'Kashmir', 'Bali', 'Ladakh', 'Munnar', 'Wayanad', 'Coorg', 'Goa', 'Rajasthan'];
const INTEREST_LEVELS = ['New / Untouched', '🔥 Hot Lead', '⚡ Warm Lead', '❄️ Cold Lead', '✅ Converted', '❌ Lost'];
const BOOKING_STAGES = ['Not Contacted', 'Contacted', 'Follow-up Required', 'Waiting for Date', 'Waiting for Price', 'Ready to Book', 'Advance Paid', 'Booking Confirmed', 'Lost / Closed'];

interface StatusData {
  connected: boolean;
  message: string;
  env: {
    has_url: boolean;
    has_key: boolean;
    url?: string;
  };
  tables: {
    team_members?: { count: number; error: string | null };
    leads?: { count: number; error: string | null };
    trip_batches?: { count: number; error: string | null };
    lead_activities?: { count: number; error: string | null };
  } | null;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <DashboardLayout title="Settings" description="Configure CRM data labels, status parameters, and database connections.">
      <div className="max-w-3xl space-y-6">
        {/* Database Status Card */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Database className="w-4 h-4 text-blue-700" />
                Supabase Connection Status
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Live database integration test & Vercel environment status</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkStatus}
              disabled={loading}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 flex items-center gap-2 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Checking database connection...
              </div>
            ) : status?.connected ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-emerald-900">Connected to Supabase Cloud Database!</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">All API requests write and read directly from your live Supabase database.</div>
                  </div>
                </div>

                {status.tables && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Team Members</div>
                      <div className="text-lg font-bold text-slate-900">{status.tables.team_members?.count ?? 0} rows</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Leads</div>
                      <div className="text-lg font-bold text-slate-900">{status.tables.leads?.count ?? 0} rows</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Trip Batches</div>
                      <div className="text-lg font-bold text-slate-900">{status.tables.trip_batches?.count ?? 0} rows</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Activities</div>
                      <div className="text-lg font-bold text-slate-900">{status.tables.lead_activities?.count ?? 0} rows</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-900">Supabase Not Connected on Vercel</div>
                    <div className="text-[11px] text-amber-800 leading-relaxed">
                      Your Vercel deployment missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Environment Variables.
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs space-y-2">
                  <div className="text-slate-400 font-sans text-xs font-bold">Steps to connect Vercel to Supabase:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Go to your project on <strong className="text-white font-sans">vercel.com</strong></li>
                    <li>Click <strong className="text-white font-sans">Settings</strong> → <strong className="text-white font-sans">Environment Variables</strong></li>
                    <li>Add key <code className="text-emerald-400 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> with your Supabase URL</li>
                    <li>Add key <code className="text-emerald-400 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> with your anon key</li>
                    <li>Click <strong className="text-white font-sans">Deployments</strong> → <strong className="text-white font-sans">Redeploy</strong></li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Status Options */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Tag className="w-4 h-4 text-blue-900" />
              Lead Status Options
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Active temperature badges used across leads & pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {INTEREST_LEVELS.map((l) => (
                <span key={l} className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-800 border border-slate-200">{l}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Stage Pipeline */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Tag className="w-4 h-4 text-purple-900" />
              Booking Stage Pipeline
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Configured booking stage pipeline lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {BOOKING_STAGES.map((s, i) => (
                <span key={s} className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-800 border border-slate-200 flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">{i + 1}.</span> {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Primary Destinations */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Globe className="w-4 h-4 text-emerald-700" />
              Primary Destinations
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Travel trip destinations in CRM database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DESTINATIONS.map((d) => (
                <span key={d} className="px-2.5 py-1 rounded-md bg-emerald-50 text-xs font-semibold text-emerald-800 border border-emerald-200">{d}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
