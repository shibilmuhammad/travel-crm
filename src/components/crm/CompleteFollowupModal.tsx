'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, PhoneCall } from 'lucide-react';
import type { Lead } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface CompleteFollowupModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompleteFollowupModal({ lead, open, onClose, onSuccess }: CompleteFollowupModalProps) {
  const { currentUser } = useAuth();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!lead) return null;

  const handleComplete = async (withNote = true) => {
    setLoading(true);
    try {
      const staffName = currentUser?.full_name || currentUser?.name || lead.assigned_team_member || 'Agent';

      // 1. Log activity if note provided or generic follow-up completion log
      const noteContent = withNote && note.trim()
        ? note.trim()
        : 'Follow-up completed.';

      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          activity_type: 'follow_up',
          notes: `[Follow-up Completed] ${noteContent}`,
          outcome: 'Follow-up Completed',
          team_member: staffName,
        }),
      });

      // 2. Update lead's next_followup_status to 'completed' and refresh last_contacted_date
      const nowISO = new Date().toISOString();
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          next_followup_status: 'completed',
          last_contacted_date: nowISO,
        }),
      });

      setNote('');
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error marking follow-up as done.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="bg-white max-w-md p-6 rounded-2xl shadow-xl border border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold text-slate-900">Complete Follow-up Call</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Log notes for your call with <strong className="text-slate-800">{lead.full_name}</strong> ({lead.whatsapp_number})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
            <div className="font-semibold flex items-center justify-between">
              <span>Scheduled Follow-up:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold text-[11px]">
                {lead.next_followup_date || 'Today'} {lead.next_followup_time ? `at ${lead.next_followup_time}` : ''}
              </span>
            </div>
            {lead.assigned_team_member && (
              <div className="text-[11px] text-emerald-700">Assigned Telecaller: <strong>{lead.assigned_team_member}</strong></div>
            )}
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Call Notes / Outcome <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Textarea
              rows={4}
              placeholder="What was discussed on this follow-up call? (e.g. Customer agreed to pay advance tomorrow, sent WhatsApp itinerary...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-white border-slate-300 text-slate-900 text-xs rounded-xl focus:ring-blue-900"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleComplete(false)}
            disabled={loading}
            className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Mark Done without Note
          </Button>
          <Button
            type="button"
            onClick={() => handleComplete(true)}
            disabled={loading}
            className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
            Save Note & Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
