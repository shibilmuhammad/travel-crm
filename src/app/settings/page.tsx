'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Database, Users, Tag, Globe, Shield } from 'lucide-react';

const DESTINATIONS = ['Spiti Valley', 'Meghalaya', 'Kashmir', 'Bali', 'Ladakh', 'Munnar', 'Wayanad', 'Coorg', 'Goa', 'Rajasthan'];
const INTEREST_LEVELS = ['New / Untouched', '🔥 Hot Lead', '⚡ Warm Lead', '❄️ Cold Lead', '✅ Converted', '❌ Lost'];
const BOOKING_STAGES = ['Not Contacted', 'Contacted', 'Follow-up Required', 'Waiting for Date', 'Waiting for Price', 'Ready to Book', 'Advance Paid', 'Booking Confirmed', 'Lost / Closed'];

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" description="Configure CRM data labels, status parameters, and database connections.">
      <div className="max-w-3xl space-y-6">
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

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Database className="w-4 h-4 text-amber-700" />
              Database Status
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Database connection and fallback mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 font-mono text-xs space-y-1 text-slate-800">
              <div><span className="text-slate-500">Mode:</span> <span className="font-bold text-emerald-700">Offline Fallback Service Active (0ms Latency)</span></div>
              <div><span className="text-slate-500">Supabase URL:</span> <span className="text-slate-800">{process.env.NEXT_PUBLIC_SUPABASE_URL || 'Local Environment'}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
