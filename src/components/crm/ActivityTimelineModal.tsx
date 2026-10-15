'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  History,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  User,
  Loader2,
  Clock,
  PhoneCall,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import type { Lead, LeadActivity, LeadTemperature, BookingStage } from '@/types';
import {
  formatDateTime,
  formatPhoneNumber,
  getCallLink,
  getWhatsAppLink,
  timeAgo,
} from '@/lib/utils';
import {
  LEAD_TEMPERATURE_LABELS,
  LEAD_TEMPERATURE_COLORS,
  BOOKING_STAGE_LABELS,
  BOOKING_STAGE_COLORS,
} from '@/types';

interface ActivityTimelineModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onViewFullLead?: (lead: Lead) => void;
}

export function ActivityTimelineModal({
  lead,
  open,
  onClose,
  onViewFullLead,
}: ActivityTimelineModalProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async (leadId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activities?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch activities:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && lead?.id) {
      fetchActivities(lead.id);
    } else {
      setActivities([]);
    }
  }, [open, lead?.id, fetchActivities]);

  if (!lead) return null;

  const tempKey: LeadTemperature = lead.lead_temperature || 'new';
  const stageKey: BookingStage = lead.booking_stage || 'not_contacted';

  // Determine if there's a fallback note on the lead not present in the activity feed
  const hasFallbackNote =
    Boolean(lead.notes) &&
    lead.notes?.trim() !== '' &&
    lead.notes !== '—' &&
    !activities.some((a) => a.notes === lead.notes);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Activity Timeline</span>
                  <span className="text-slate-400 font-normal text-sm">/</span>
                  <span className="text-blue-950 font-bold text-sm sm:text-base truncate">
                    {lead.full_name}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1 flex items-center flex-wrap gap-2 sm:gap-3">
                  <span className="font-mono font-semibold text-slate-700">
                    {formatPhoneNumber(lead.whatsapp_number)}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {lead.departure_city?.trim() || '—'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      LEAD_TEMPERATURE_COLORS[tempKey] || LEAD_TEMPERATURE_COLORS.new
                    }`}
                  >
                    {LEAD_TEMPERATURE_LABELS[tempKey] || 'New'}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      BOOKING_STAGE_COLORS[stageKey] || BOOKING_STAGE_COLORS.not_contacted
                    }`}
                  >
                    {BOOKING_STAGE_LABELS[stageKey] || 'Not Contacted'}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <a
                href={getCallLink(lead.whatsapp_number)}
                className="p-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
                title="Call Lead"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <a
                href={getWhatsAppLink(lead.whatsapp_number)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition-colors"
                title="WhatsApp Lead"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              </a>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body - Timeline Only */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interaction History
            </h4>
            <span className="text-[11px] text-slate-400">
              {activities.length + (hasFallbackNote ? 1 : 0)} recorded
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
              <span className="text-xs">Loading activity timeline...</span>
            </div>
          ) : activities.length === 0 && !hasFallbackNote ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No activity recorded yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Past calls, follow-ups, and notes for this lead will appear here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 pt-1">
              {/* Regular Activities */}
              {activities.map((act) => {
                const isCall = act.activity_type === 'phone_call' || act.activity_type === 'call_note';
                return (
                  <div key={act.id} className="relative group">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                        isCall
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isCall ? (
                        <PhoneCall className="w-2.5 h-2.5" />
                      ) : (
                        <FileText className="w-2.5 h-2.5" />
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-xs transition-colors">
                      <div className="flex items-center justify-between text-slate-500 font-semibold mb-1.5 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <span className="font-bold flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {act.team_member || 'Team Member'}
                          </span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                            {act.activity_type === 'call_note'
                              ? 'Call Note'
                              : act.activity_type === 'phone_call'
                              ? 'Call Log'
                              : 'Update'}
                          </span>
                          {act.outcome && (
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold">
                              {act.outcome}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDateTime(act.activity_date || act.created_at)}</span>
                          <span>•</span>
                          <span>{timeAgo(act.activity_date || act.created_at)}</span>
                        </div>
                      </div>
                      {act.notes ? (
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {act.notes}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">No notes recorded.</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Fallback Initial Note from lead.notes */}
              {hasFallbackNote && (
                <div className="relative group">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" />
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                    <div className="flex items-center justify-between text-amber-900 font-semibold mb-1.5">
                      <span className="font-bold flex items-center gap-1.5">
                        📝 Initial Note / Import
                      </span>
                      <div className="text-[11px] text-amber-700 font-normal flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateTime(lead.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {lead.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex sm:items-center sm:justify-between gap-2">
          {onViewFullLead ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onViewFullLead(lead);
              }}
              className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-white gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Full Lead Profile
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-white cursor-pointer px-4"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
