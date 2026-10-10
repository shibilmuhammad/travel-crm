import { useState, useEffect } from 'react';
import { Loader2, X, Edit, Save, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import type { Lead, InterestLevel, LeadTemperature, BookingStage, DateFlexibility, LeadSource, TripBatch } from '@/types';
import { BOOKING_STAGE_LABELS, LEAD_SOURCE_LABELS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { formatDate, generateUpcomingWeekends, WeekendOption, normalizePhoneNumber, formatPhoneNumber } from '@/lib/utils';

interface LeadFormProps {
  lead?: Lead | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadForm({ lead, open, onClose, onSuccess }: LeadFormProps) {
  const isEdit = !!lead;
  const { teamMembers, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<TripBatch[]>([]);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [weekendOptions, setWeekendOptions] = useState<WeekendOption[]>([]);

  useEffect(() => {
    setWeekendOptions(generateUpcomingWeekends(3));
  }, []);

  const [form, setForm] = useState({
    full_name: '',
    whatsapp_number: '',
    email: '',
    lead_source: 'manual_entry' as LeadSource,
    assigned_team_member: '',
    batch_id: '',
    preferred_destination: '',
    preferred_travel_date: '',
    departure_city: '',
    interest_level: 'new' as InterestLevel,
    lead_temperature: 'warm' as LeadTemperature,
    booking_stage: 'not_contacted' as BookingStage,
    date_flexibility: 'not_decided' as DateFlexibility,
    number_of_travellers: 1,
    budget_per_person: '',
    advance_amount: '',
    payment_date: '',
    next_followup_date: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBatches(data);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (lead) {
      const prefDate = lead.preferred_travel_date || '';
      const isWeekendMatch = weekendOptions.some((w) => w.value === prefDate);
      setIsCustomDate(!!prefDate && !isWeekendMatch);

      setForm({
        full_name: lead.full_name || '',
        whatsapp_number: formatPhoneNumber(lead.whatsapp_number) || '',
        email: lead.email || '',
        lead_source: (lead.lead_source as LeadSource) || 'manual_entry',
        assigned_team_member: lead.assigned_team_member || currentUser.name || 'Shibil',
        batch_id: lead.batch_id || '',
        preferred_destination: lead.preferred_destination || '',
        preferred_travel_date: prefDate,
        departure_city: lead.departure_city || '',
        interest_level: lead.interest_level || 'new',
        lead_temperature: lead.lead_temperature || 'warm',
        booking_stage: lead.booking_stage || 'not_contacted',
        date_flexibility: lead.date_flexibility || 'not_decided',
        number_of_travellers: lead.number_of_travellers || 1,
        budget_per_person: lead.budget_per_person ? String(lead.budget_per_person) : '',
        advance_amount: lead.advance_amount ? String(lead.advance_amount) : '',
        payment_date: lead.payment_date || new Date().toISOString().split('T')[0],
        next_followup_date: lead.next_followup_date || '',
        notes: lead.notes || '',
      });
    } else {
      setIsCustomDate(false);
      setForm({
        full_name: '',
        whatsapp_number: '',
        email: '',
        lead_source: 'manual_entry',
        assigned_team_member: currentUser.name || 'Shibil',
        batch_id: '',
        preferred_destination: '',
        preferred_travel_date: '',
        departure_city: '',
        interest_level: 'new',
        lead_temperature: 'warm',
        booking_stage: 'not_contacted',
        date_flexibility: 'not_decided',
        number_of_travellers: 1,
        budget_per_person: '',
        advance_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        next_followup_date: '',
        notes: '',
      });
    }
  }, [lead, open, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.whatsapp_number) return;

    if (!form.batch_id || form.batch_id === 'none') {
      alert('Please select a Product / Service (Trip / Batch) for this lead.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        whatsapp_number: normalizePhoneNumber(form.whatsapp_number),
        number_of_travellers: Number(form.number_of_travellers) || 1,
        budget_per_person: form.budget_per_person ? parseFloat(form.budget_per_person) : null,
        advance_amount: form.advance_amount ? parseFloat(form.advance_amount) : null,
        payment_date: form.payment_date || null,
      };

      const url = isEdit ? `/api/leads/${lead.id}` : '/api/leads';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save lead');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-white text-slate-900 border-slate-200 p-0 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-white">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Lead' : 'Add New Lead'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <Label className="text-xs font-bold text-slate-700">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1 bg-white border-slate-300 text-slate-900 focus:ring-blue-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="Phone number"
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Email</Label>
              <Input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700">Departure City</Label>
            <Input
              placeholder="e.g. Kochi / Eranakulam / Delhi"
              value={form.departure_city}
              onChange={(e) => setForm({ ...form, departure_city: e.target.value })}
              className="mt-1 bg-white border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700">
              Product / Service (Trip Batch) <span className="text-red-500">*</span>
            </Label>
            <Select
              required
              value={form.batch_id}
              onValueChange={(val) => {
                const selectedBatch = batches.find((b) => b.id === val);
                setForm({
                  ...form,
                  batch_id: val,
                  preferred_destination: form.preferred_destination || selectedBatch?.destination || '',
                });
              }}
            >
              <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                <SelectValue placeholder="-- Select Batch --" />
              </SelectTrigger>
              <SelectContent className="bg-white text-slate-900">
                {batches.map((b) => {
                  const formattedDate = formatDate(b.proposed_date || b.start_date);
                  const displayTitle = b.title ? `${b.title} (${formattedDate})` : `${b.destination} (${formattedDate})`;
                  return (
                    <SelectItem key={b.id} value={b.id}>
                      {displayTitle}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Booking Stage Selection */}
          <div>
            <Label className="text-xs font-bold text-slate-700">Booking Stage</Label>
            <Select
              value={form.booking_stage}
              onValueChange={(val) => setForm({ ...form, booking_stage: val as BookingStage })}
            >
              <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                <SelectValue placeholder="Booking Stage" />
              </SelectTrigger>
              <SelectContent className="bg-white text-slate-900">
                {Object.entries(BOOKING_STAGE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Advance Amount & Payment Date Box */}
          {(form.booking_stage === 'advance_paid' || form.booking_stage === 'booking_confirmed') && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Advance & Payment Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-emerald-950">Advance Paid (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2000"
                    value={form.advance_amount}
                    onChange={(e) => setForm({ ...form, advance_amount: e.target.value })}
                    className="mt-1 bg-white border-emerald-300 text-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-emerald-950">Payment Date</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="mt-1 bg-white border-emerald-300 text-slate-900 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700">Lead Source</Label>
              <Select
                value={form.lead_source}
                onValueChange={(val) => setForm({ ...form, lead_source: val as LeadSource })}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="-- Default (Manual) --" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="manual_entry">-- Default (Manual) --</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Assign To (optional)</Label>
              <Select
                value={form.assigned_team_member}
                onValueChange={(val) => setForm({ ...form, assigned_team_member: val })}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="-- Unassigned --" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="Unassigned">-- Unassigned --</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.full_name || m.name || 'Staff'}>
                      {m.full_name || m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs shadow px-5 gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              💾 Save Lead
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
