import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Lead, InterestLevel, LeadTemperature, BookingStage, DateFlexibility, LeadSource, TripBatch } from '@/types';
import { BOOKING_STAGE_LABELS, LEAD_TEMPERATURE_LABELS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { formatDate, generateUpcomingWeekends, WeekendOption, normalizePhoneNumber, formatPhoneNumber } from '@/lib/utils';
import { DatePickerInput } from '@/components/ui/date-picker-input';

interface LeadFormProps {
  lead?: Lead | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedLead?: Lead) => void;
}

const COMMON_DESTINATIONS = ['Vattavada', 'Wayanad', 'Munnar', 'Vagamon', 'Spiti Valley', 'Meghalaya', 'Gokarna', 'Kashmir'];

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
    assigned_team_member: 'Shibil Muhammad',
    batch_id: '',
    preferred_destination: '',
    preferred_travel_date: '',
    departure_city: '',
    interest_level: 'new' as InterestLevel,
    lead_temperature: 'new' as LeadTemperature,
    booking_stage: 'not_contacted' as BookingStage,
    date_flexibility: 'not_decided' as DateFlexibility,
    number_of_travellers: 1,
    budget_per_person: '',
    advance_amount: '',
    payment_date: '',
    next_followup_date: '',
    notes: '',
  });

  const resolveBatchId = (targetLead: Lead | null | undefined, batchList: TripBatch[]) => {
    if (!targetLead || batchList.length === 0) return batchList[0]?.id || '';
    if (targetLead.batch_id && batchList.some((b) => b.id === targetLead.batch_id)) {
      return targetLead.batch_id;
    }
    const lDest = (targetLead.preferred_destination || targetLead.destination || '').toLowerCase().trim();
    if (lDest) {
      const match = batchList.find((b) => {
        const bTitle = (b.title || '').toLowerCase().trim();
        const bDest = (b.destination || '').toLowerCase().trim();
        return bTitle.includes(lDest) || lDest.includes(bTitle) || bDest.includes(lDest) || lDest.includes(bDest);
      });
      if (match) return match.id;
    }
    return batchList[0]?.id || '';
  };

  useEffect(() => {
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBatches(data);
          setForm((prev) => {
            if (!prev.batch_id) {
              return { ...prev, batch_id: resolveBatchId(lead, data) };
            }
            return prev;
          });
        }
      })
      .catch((err) => console.error(err));
  }, [lead]);

  useEffect(() => {
    if (lead) {
      const prefDate = lead.preferred_travel_date || lead.preferred_date || '';
      const isWeekendMatch = weekendOptions.some((w) => w.value === prefDate);
      setIsCustomDate(!!prefDate && !isWeekendMatch);

      const matchedBatchId = lead.batch_id || resolveBatchId(lead, batches);

      setForm({
        full_name: lead.full_name || '',
        whatsapp_number: formatPhoneNumber(lead.whatsapp_number) || '',
        email: lead.email || '',
        lead_source: (lead.lead_source as LeadSource) || 'manual_entry',
        assigned_team_member: lead.assigned_team_member || 'Shibil Muhammad',
        batch_id: matchedBatchId,
        preferred_destination: lead.preferred_destination || lead.destination || 'Vattavada',
        preferred_travel_date: prefDate,
        departure_city: lead.departure_city || '',
        interest_level: (lead.interest_level || lead.lead_temperature || 'new') as InterestLevel,
        lead_temperature: (lead.lead_temperature || lead.interest_level || 'new') as LeadTemperature,
        booking_stage: (lead.booking_stage || 'not_contacted') as BookingStage,
        date_flexibility: (lead.date_flexibility || 'not_decided') as DateFlexibility,
        number_of_travellers: Number(lead.number_of_travellers || (lead as any).pax_count) || 1,
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
        assigned_team_member: 'Shibil Muhammad',
        batch_id: batches[0]?.id || '',
        preferred_destination: 'Vattavada',
        preferred_travel_date: '',
        departure_city: '',
        interest_level: 'new',
        lead_temperature: 'new',
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
  }, [lead, open, currentUser, batches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.whatsapp_number) return;

    const finalBatchId = form.batch_id || batches[0]?.id || '';
    if (!finalBatchId || finalBatchId === 'none') {
      alert('Please select a Product / Service (Trip / Batch) for this lead.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        batch_id: finalBatchId,
        destination: form.preferred_destination,
        preferred_destination: form.preferred_destination,
        preferred_date: form.preferred_travel_date,
        preferred_travel_date: form.preferred_travel_date,
        whatsapp_number: normalizePhoneNumber(form.whatsapp_number),
        number_of_travellers: Number(form.number_of_travellers) || 1,
        pax_count: Number(form.number_of_travellers) || 1,
        budget_per_person: form.budget_per_person ? parseFloat(form.budget_per_person) : null,
        advance_amount: form.advance_amount ? parseFloat(form.advance_amount) : null,
        payment_date: form.payment_date || null,
        lead_temperature: form.lead_temperature,
        interest_level: form.lead_temperature,
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

      const savedData = await res.json();
      onSuccess(savedData);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] bg-white text-slate-900 border-slate-200 p-0 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Lead Details' : 'Add New Lead'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Email & Departure City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <Label className="text-xs font-bold text-slate-700">Departure City (Origin)</Label>
              <Input
                placeholder="e.g. Kalamassery / Kochi / Aluva"
                value={form.departure_city}
                onChange={(e) => setForm({ ...form, departure_city: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900"
              />
            </div>
          </div>

          {/* Product / Batch */}
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

          {/* Preferred Location / Destination (Place) */}
          <div>
            <Label className="text-xs font-bold text-slate-700">Preferred Location (Destination)</Label>
            <div className="space-y-1.5 mt-1">
              <Input
                placeholder="e.g. Vattavada / Kakkadam Poyil / Wayanad"
                value={form.preferred_destination}
                onChange={(e) => setForm({ ...form, preferred_destination: e.target.value })}
                className="bg-white border-slate-300 text-slate-900 text-xs"
              />
              <div className="flex flex-wrap gap-1">
                {COMMON_DESTINATIONS.map((dest) => (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => setForm({ ...form, preferred_destination: dest })}
                    className="px-2 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors"
                  >
                    + {dest}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lead Status & Booking Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700">Lead Status</Label>
              <Select
                value={form.lead_temperature}
                onValueChange={(val) => setForm({ ...form, lead_temperature: val as LeadTemperature, interest_level: val as InterestLevel })}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="-- Select Status --" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="new">New / Unassessed</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Preferred Date & Pax */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Preferred Date</Label>
                <button
                  type="button"
                  onClick={() => setIsCustomDate(!isCustomDate)}
                  className="text-[11px] font-semibold text-blue-900 hover:underline"
                >
                  {isCustomDate ? '⚡ Select Weekend' : '+ Custom Date'}
                </button>
              </div>
              {isCustomDate ? (
                <div className="mt-1">
                  <DatePickerInput
                    value={form.preferred_travel_date}
                    onChange={(val) => setForm({ ...form, preferred_travel_date: val })}
                    className="bg-white border-slate-300 text-slate-900 text-xs"
                  />
                </div>
              ) : (
                <Select
                  value={form.preferred_travel_date}
                  onValueChange={(val) => setForm({ ...form, preferred_travel_date: val })}
                >
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                    <SelectValue placeholder="-- Select Date --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 max-h-56">
                    <SelectItem value="Any Future Trip / Flexible Date">Any Future Trip / Flexible Date</SelectItem>
                    {weekendOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Pax Count</Label>
              <Input
                type="number"
                min={1}
                value={form.number_of_travellers}
                onChange={(e) => setForm({ ...form, number_of_travellers: Number(e.target.value) || 1 })}
                className="mt-1 bg-white border-slate-300 text-slate-900 text-xs font-medium"
              />
            </div>
          </div>

          {/* Conditional Advance Amount & Payment Date Box */}
          {(form.booking_stage === 'advance_paid' || form.booking_stage === 'booking_confirmed') && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
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
                  <div className="mt-1">
                    <DatePickerInput
                      value={form.payment_date}
                      onChange={(val) => setForm({ ...form, payment_date: val })}
                      className="bg-white border-emerald-300 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lead Source & Assign To */}
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
                  <SelectItem value="manual_entry">Manual Entry</SelectItem>
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
              <Label className="text-xs font-bold text-slate-700">Assign To</Label>
              <Select
                value={form.assigned_team_member}
                onValueChange={(val) => setForm({ ...form, assigned_team_member: val })}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="-- Unassigned --" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="Shibil Muhammad">Shibil Muhammad</SelectItem>
                  <SelectItem value="Unassigned">-- Unassigned --</SelectItem>
                  {teamMembers
                    .filter((m) => (m.full_name || m.name) !== 'Shibil Muhammad' && (m.full_name || m.name) !== 'Shibil')
                    .map((m) => (
                      <SelectItem key={m.id} value={m.full_name || m.name || 'Staff'}>
                        {m.full_name || m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Call Notes / Remarks */}
          <div>
            <Label className="text-xs font-bold text-slate-700">Call Notes / Remarks</Label>
            <Textarea
              rows={2}
              placeholder="e.g. interested, needs 2 seats, departure from kalamassery..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 bg-white border-slate-300 text-slate-900 text-xs"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs shadow px-5 gap-1.5 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              💾 Save Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
