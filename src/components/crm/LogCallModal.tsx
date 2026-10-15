'use client';

import { useState } from 'react';
import { Phone, MessageSquare, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { Lead, InterestLevel, BookingStage, ActivityType } from '@/types';
import { INTEREST_LEVEL_LABELS, BOOKING_STAGE_LABELS } from '@/types';
import { DatePickerInput } from '@/components/ui/date-picker-input';

interface LogCallModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'phone_call', label: '📞 Phone Call' },
  { value: 'whatsapp_message', label: '💬 WhatsApp Message' },
  { value: 'follow_up', label: '🔔 Follow-up' },
  { value: 'booking_update', label: '📋 Booking Update' },
  { value: 'general_note', label: '📝 General Note' },
];

export function LogCallModal({ lead, open, onClose, onSuccess }: LogCallModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    activity_type: 'phone_call' as ActivityType,
    notes: '',
    outcome: '',
    next_action: '',
    next_followup_date: '',
    team_member: 'Admin',
    updated_interest_level: '' as InterestLevel | '',
    updated_booking_stage: '' as BookingStage | '',
    updated_preferred_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        lead_id: lead.id,
        activity_type: form.activity_type,
        notes: form.notes || null,
        outcome: form.outcome || null,
        next_action: form.next_action || null,
        next_followup_date: form.next_followup_date || null,
        team_member: form.team_member || null,
        updated_interest_level: form.updated_interest_level || null,
        updated_booking_stage: form.updated_booking_stage || null,
        updated_preferred_date: form.updated_preferred_date || null,
      };

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to log activity');

      onSuccess();
      onClose();
      setForm({
        activity_type: 'phone_call',
        notes: '',
        outcome: '',
        next_action: '',
        next_followup_date: '',
        team_member: 'Admin',
        updated_interest_level: '',
        updated_booking_stage: '',
        updated_preferred_date: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-slate-200 p-0 rounded-2xl shadow-2xl overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-white">
          <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
            <Phone className="w-4 h-4 text-blue-900" />
            Log Interaction
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Recording interaction for <span className="font-semibold text-slate-900">{lead.full_name}</span>{' '}
            ({lead.whatsapp_number})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Interaction Type</Label>
            <Select
              value={form.activity_type}
              onValueChange={(v) => setForm({ ...form, activity_type: v as ActivityType })}
            >
              <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white text-slate-900">
                {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Conversation Notes</Label>
            <Textarea
              placeholder="e.g. Called customer regarding tour details..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="bg-white border-slate-300 text-slate-900 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700">Outcome</Label>
              <Input
                placeholder="e.g. Price accepted"
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                className="bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">Next Follow-up Date</Label>
              <div className="mt-1">
                <DatePickerInput
                  value={form.next_followup_date}
                  onChange={(val) => setForm({ ...form, next_followup_date: val })}
                  className="bg-white border-slate-300 text-slate-900 text-xs h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs shadow gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
              {loading ? 'Saving…' : 'Save Interaction'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="border-slate-300 text-slate-700 text-xs">
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
