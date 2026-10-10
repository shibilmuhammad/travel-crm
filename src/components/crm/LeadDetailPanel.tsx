'use client';

import { useState, useEffect } from 'react';
import { X, Phone, MessageSquare, Edit, Calendar, Users, MapPin, IndianRupee, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InterestBadge, BookingBadge, LeadSourceBadge, DateFlexBadge, ActivityTypeBadge } from '@/components/crm/StatusBadges';
import type { Lead, LeadActivity } from '@/types';
import { formatDate, formatDateTime, formatCurrency, getWhatsAppLink, getCallLink, timeAgo } from '@/lib/utils';
import { LEAD_TEMPERATURE_COLORS, LEAD_TEMPERATURE_LABELS } from '@/types';

interface LeadDetailPanelProps {
  lead: Lead;
  open?: boolean;
  onClose: () => void;
  onLogCall?: () => void;
  onEdit?: () => void;
  onUpdate?: () => void;
}

export function LeadDetailPanel({ lead, open = true, onClose, onLogCall, onEdit, onUpdate }: LeadDetailPanelProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lead?.id) fetchActivities();
  }, [lead?.id]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activities?lead_id=${lead.id}`);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !lead) return null;

  const temp = lead.lead_temperature || 'warm';

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h2 className="text-lg font-bold text-white">{lead.full_name}</h2>
            <div className="text-xs text-slate-400 mt-0.5">{lead.whatsapp_number}</div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} className="text-slate-400 hover:text-white">
                <Edit className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${LEAD_TEMPERATURE_COLORS[temp]}`}>
              {LEAD_TEMPERATURE_LABELS[temp]}
            </span>
            <InterestBadge level={lead.interest_level || 'new'} />
            <BookingBadge stage={lead.booking_stage || 'not_contacted'} />
            {lead.lead_source && <LeadSourceBadge source={lead.lead_source} />}
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
            <InfoItem icon={<MapPin className="w-3.5 h-3.5" />} label="Destination" value={lead.preferred_destination || '—'} />
            <InfoItem icon={<Calendar className="w-3.5 h-3.5" />} label="Travel Date" value={lead.preferred_travel_date ? formatDate(lead.preferred_travel_date) : '—'} />
            <InfoItem icon={<Users className="w-3.5 h-3.5" />} label="Travellers" value={`${lead.number_of_travellers || 1} pax`} />
            <InfoItem icon={<IndianRupee className="w-3.5 h-3.5" />} label="Budget/Person" value={lead.budget_per_person ? formatCurrency(lead.budget_per_person) : '—'} />
            <InfoItem icon={<MapPin className="w-3.5 h-3.5" />} label="From City" value={lead.departure_city || '—'} />
            <InfoItem icon={<Clock className="w-3.5 h-3.5" />} label="Follow-up" value={lead.next_followup_date ? formatDate(lead.next_followup_date) : '—'} />
          </div>

          {/* Date flexibility */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Flexibility:</span>
            <DateFlexBadge flex={lead.date_flexibility || 'not_decided'} />
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-xl bg-slate-800/70 border border-slate-700/60 p-3.5">
              <p className="text-xs font-semibold text-slate-400 mb-1">Lead Notes</p>
              <p className="text-sm text-slate-200">{lead.notes}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <a
              href={getWhatsAppLink(lead.whatsapp_number)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <a
              href={getCallLink(lead.whatsapp_number)}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          </div>

          {/* Activity Timeline */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3">Interaction History</h3>

            {loading ? (
              <div className="text-xs text-slate-500 py-4 text-center">Loading call logs…</div>
            ) : activities.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No past interactions recorded.</div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="font-semibold text-slate-300">{act.team_member || 'Staff'}</span>
                      <span>{formatDateTime(act.activity_date || act.created_at)}</span>
                    </div>
                    {act.notes && <p className="text-slate-200 mt-1">{act.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[11px] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xs font-semibold text-slate-200 truncate">{value}</div>
    </div>
  );
}
