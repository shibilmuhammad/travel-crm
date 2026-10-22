'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2,
  Loader2,
  PhoneCall,
  Calendar,
  Clock,
  Flame,
  Sun,
  Snowflake,
  XCircle,
  Edit3,
  User,
  MapPin,
  Save,
  ArrowLeft,
  Luggage,
  ArrowRightLeft,
  Check,
} from 'lucide-react';
import type { Lead, LeadTemperature, BookingStage, TripBatch } from '@/types';
import { BOOKING_STAGE_LABELS } from '@/types';
import { formatPhoneNumber, generateUpcomingWeekends, WeekendOption, formatDateNumeric } from '@/lib/utils';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useAuth } from '@/context/AuthContext';

interface CompleteFollowupModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedLead?: Lead) => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

const TIME_OPTIONS = [
  '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '02:00 PM',
  '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
];

const COMMON_DESTINATIONS = [
  'Vattavada',
  'Wayanad',
  'Munnar',
  'Vagamon',
  'Spiti Valley',
  'Meghalaya',
  'Gokarna',
  'Kashmir',
];

function getDateISO(daysAhead = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CompleteFollowupModal({ lead, open, onClose, onSuccess, onLeadUpdated }: CompleteFollowupModalProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);

  // Batches state
  const [batches, setBatches] = useState<TripBatch[]>([]);
  const [batchId, setBatchId] = useState<string>('');
  const [showChangeBatch, setShowChangeBatch] = useState(false);
  const [savingBatchOnly, setSavingBatchOnly] = useState(false);

  // 1. Lead Status
  const [status, setStatus] = useState<LeadTemperature>('warm');

  // 2. Booking Stage
  const [stage, setStage] = useState<BookingStage>('follow_up_required');

  // 3. Call Notes
  const [note, setNote] = useState('');

  // 4. Schedule Next Follow-up
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState(getDateISO(1));
  const [nextTime, setNextTime] = useState('10:00 AM');

  // 5. Edit Info View state
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [fullName, setFullName] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [savingInfoOnly, setSavingInfoOnly] = useState(false);
  const [weekendOptions, setWeekendOptions] = useState<WeekendOption[]>([]);

  const resolveBatchId = (targetLead: Lead | null | undefined, batchList: TripBatch[]) => {
    if (!targetLead || batchList.length === 0) return '';
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
    return '';
  };

  useEffect(() => {
    const weekends = generateUpcomingWeekends(3);
    setWeekendOptions(weekends);
  }, []);

  useEffect(() => {
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBatches(data);
          if (lead && !batchId) {
            const matched = lead.batch_id || resolveBatchId(lead, data);
            if (matched) setBatchId(matched);
          }
        }
      })
      .catch((err) => console.error('Error fetching batches:', err));
  }, []);

  useEffect(() => {
    if (lead) {
      setCurrentLead(lead);
      const currentTemp = (lead.lead_temperature || lead.interest_level || 'warm') as LeadTemperature;
      setStatus(currentTemp);

      const currentStage = (lead.booking_stage || 'follow_up_required') as BookingStage;
      setStage(currentStage);

      setNote('');
      setScheduleNext(false);
      setNextDate(getDateISO(1));
      setNextTime('10:00 AM');

      setFullName(lead.full_name || '');
      setDepartureCity(lead.departure_city || '');
      setPreferredLocation(lead.preferred_destination || lead.destination || '');

      const prefDate = lead.preferred_travel_date || lead.preferred_date || '';
      setPreferredDate(prefDate);
      const isWeekendMatch = generateUpcomingWeekends(3).some((w) => w.value === prefDate);
      setIsCustomDate(Boolean(prefDate && !isWeekendMatch && prefDate !== 'Any Future Trip / Flexible Date'));

      const matchedBatch = lead.batch_id || (batches.length > 0 ? resolveBatchId(lead, batches) : '');
      setBatchId(matchedBatch || '');

      setShowEditInfo(false);
      setShowChangeBatch(false);
    }
  }, [lead, open]);

  if (!lead) return null;

  const currentSelectedBatch =
    batches.find((b) => b.id === (batchId === 'none' ? '' : batchId)) ||
    batches.find((b) => b.id === (currentLead?.batch_id || lead?.batch_id));

  const handleSaveBatchOnly = async () => {
    const activeLead = currentLead || lead;
    if (!activeLead) return;
    setSavingBatchOnly(true);
    try {
      const nowISO = new Date().toISOString();
      const finalBatchId = batchId === 'none' ? null : (batchId || null);
      const selectedBatch = batches.find((b) => b.id === finalBatchId);

      const patchPayload: Record<string, any> = {
        batch_id: finalBatchId,
        updated_at: nowISO,
      };

      if (selectedBatch?.destination) {
        patchPayload.destination = selectedBatch.destination;
        patchPayload.preferred_destination = selectedBatch.destination;
        setPreferredLocation(selectedBatch.destination);
      }

      const res = await fetch(`/api/leads/${activeLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      if (res.ok) {
        const updatedLead = await res.json();
        setCurrentLead(updatedLead);
        if (onLeadUpdated) onLeadUpdated(updatedLead);

        const staffName = currentUser?.full_name || currentUser?.name || activeLead.assigned_team_member || 'Shibil Muhammad';
        const batchName = selectedBatch ? (selectedBatch.title || selectedBatch.destination) : 'None';
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: activeLead.id,
            activity_type: 'note',
            notes: `Trip batch changed to: ${batchName}`,
            outcome: 'Batch Updated',
            team_member: staffName,
          }),
        });

        // Switch back to follow-up view
        setShowChangeBatch(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error updating trip batch.');
    } finally {
      setSavingBatchOnly(false);
    }
  };

  const handleSaveInfoOnly = async () => {
    const activeLead = currentLead || lead;
    if (!activeLead) return;
    setSavingInfoOnly(true);
    try {
      const nowISO = new Date().toISOString();
      const finalBatchId = batchId === 'none' ? null : (batchId || activeLead.batch_id || null);
      const patchPayload: Record<string, any> = {
        full_name: fullName.trim() || activeLead.full_name,
        departure_city: departureCity.trim() || null,
        destination: preferredLocation.trim() || null,
        preferred_destination: preferredLocation.trim() || null,
        preferred_date: preferredDate.trim() || null,
        preferred_travel_date: preferredDate.trim() || null,
        batch_id: finalBatchId,
        updated_at: nowISO,
      };

      const res = await fetch(`/api/leads/${activeLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      if (res.ok) {
        const updatedLead = await res.json();
        setCurrentLead(updatedLead);
        if (onLeadUpdated) onLeadUpdated(updatedLead);
        // Switch back to the previous popup (Mark Follow-up Call Done) instead of closing
        setShowEditInfo(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error updating lead info.');
    } finally {
      setSavingInfoOnly(false);
    }
  };

  const handleComplete = async (withNote = true) => {
    setLoading(true);
    try {
      const staffName = currentUser?.full_name || currentUser?.name || lead.assigned_team_member || 'Shibil Muhammad';
      const nowISO = new Date().toISOString();
      const finalBatchId = batchId === 'none' ? null : (batchId || lead.batch_id || null);

      const patchPayload: Record<string, any> = {
        full_name: fullName.trim() || lead.full_name,
        departure_city: departureCity.trim() || null,
        destination: preferredLocation.trim() || null,
        preferred_destination: preferredLocation.trim() || null,
        preferred_date: preferredDate.trim() || null,
        preferred_travel_date: preferredDate.trim() || null,
        batch_id: finalBatchId,
        lead_temperature: status,
        interest_level: status,
        booking_stage: stage,
        last_contacted_date: nowISO,
      };

      if (scheduleNext && nextDate) {
        patchPayload.next_followup_date = nextDate;
        patchPayload.next_followup_time = nextTime || '10:00 AM';
        patchPayload.next_followup_status = 'pending';
      } else {
        patchPayload.next_followup_status = 'completed';
      }

      // Update lead
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      const updatedLead = res.ok ? await res.json() : null;

      // Log activity note
      const noteContent = withNote && note.trim()
        ? note.trim()
        : `Follow-up call completed. Lead status: ${status}, booking stage: ${BOOKING_STAGE_LABELS[stage] || stage}.`;

      const batchLabel = currentSelectedBatch
        ? ` | Trip Batch: ${currentSelectedBatch.title || currentSelectedBatch.destination}`
        : '';

      const activityText = scheduleNext && nextDate
        ? `[Follow-up Completed] ${noteContent}${batchLabel} | Next scheduled: ${nextDate} at ${nextTime}`
        : `[Follow-up Completed] ${noteContent}${batchLabel}`;

      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          activity_type: 'follow_up',
          notes: activityText,
          outcome: `Status: ${status}`,
          team_member: staffName,
        }),
      });

      setNote('');
      onSuccess(updatedLead || undefined);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error updating follow-up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="bg-white max-w-lg p-0 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white pr-12">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 min-w-0">
              {showChangeBatch ? (
                <>
                  <Luggage className="w-5 h-5 text-blue-900 shrink-0" />
                  <DialogTitle className="text-base font-bold text-slate-900 truncate">
                    Change Trip Batch
                  </DialogTitle>
                </>
              ) : showEditInfo ? (
                <>
                  <Edit3 className="w-5 h-5 text-blue-900 shrink-0" />
                  <DialogTitle className="text-base font-bold text-slate-900 truncate">
                    Edit Lead Information
                  </DialogTitle>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <DialogTitle className="text-base font-bold text-slate-900 truncate">
                    Mark Follow-up Call Done
                  </DialogTitle>
                </>
              )}
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {showChangeBatch || showEditInfo ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeBatch(false);
                    setShowEditInfo(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Follow-up
                </button>
              ) : (
                <>
                  {/* Change Batch Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeBatch(true);
                      setShowEditInfo(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                    title="Change trip batch"
                  >
                    <Luggage className="w-3.5 h-3.5 text-blue-900" />
                    <span>Change Batch</span>
                  </button>

                  {/* Edit Info Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditInfo(true);
                      setShowChangeBatch(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Info
                  </button>
                </>
              )}
            </div>
          </div>

          <DialogDescription className="text-xs text-slate-500 mt-1">
            {showChangeBatch
              ? `Select or update the trip batch for ${fullName || lead.full_name} (${formatPhoneNumber(lead.whatsapp_number)})`
              : showEditInfo
              ? `Update details for ${fullName || lead.full_name} (${formatPhoneNumber(lead.whatsapp_number)})`
              : `Record call outcome, update lead status & stage for ${fullName || lead.full_name} (${formatPhoneNumber(lead.whatsapp_number)})`}
          </DialogDescription>
        </DialogHeader>

        {showChangeBatch ? (
          /* ========================================================= */
          /* CHANGE TRIP BATCH VIEW                                    */
          /* ========================================================= */
          <>
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Current Batch Info Banner */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1.5">
                  <Luggage className="w-3.5 h-3.5 text-blue-900" />
                  Currently Assigned Batch
                </div>
                {currentSelectedBatch ? (
                  <div className="text-xs text-slate-800">
                    <div className="font-bold text-sm text-blue-950">
                      {currentSelectedBatch.title || currentSelectedBatch.destination}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-slate-600 text-[11px]">
                      <span>📍 Destination: <strong className="text-slate-800">{currentSelectedBatch.destination}</strong></span>
                      <span>📅 Date: <strong className="text-slate-800">{formatDateNumeric(currentSelectedBatch.proposed_date || currentSelectedBatch.start_date)}</strong></span>
                      {currentSelectedBatch.proposed_price ? (
                        <span>💰 Price: <strong className="text-slate-800">₹{currentSelectedBatch.proposed_price.toLocaleString()}</strong></span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">
                    No trip batch is currently assigned to this lead.
                  </div>
                )}
              </div>

              {/* Batches Selector List */}
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-2">
                  Select Trip Batch
                </Label>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {batches.map((b) => {
                    const isSelected = batchId === b.id;
                    const dStr = b.proposed_date || b.start_date;
                    const formattedDate = dStr ? formatDateNumeric(dStr) : 'Flexible';
                    return (
                      <div
                        key={b.id}
                        onClick={() => setBatchId(b.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-100 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {b.title || b.destination}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0e2a56] text-white">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                              📍 {b.destination}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                              📅 {formattedDate}
                            </span>
                            {b.departure_city && (
                              <span className="text-slate-500">
                                from {b.departure_city}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {b.proposed_price ? (
                            <div className="font-bold text-blue-950 text-xs">
                              ₹{b.proposed_price.toLocaleString()}
                            </div>
                          ) : null}
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {b.confirmed_pax || 0}/{b.capacity || 40} booked
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Option to clear batch */}
                  <div
                    onClick={() => setBatchId('none')}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      batchId === 'none' || !batchId
                        ? 'bg-slate-100 border-slate-400 font-bold text-slate-800'
                        : 'bg-white border-dashed border-slate-300 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>None (No Batch Assigned)</span>
                    {(batchId === 'none' || !batchId) && <Check className="w-3.5 h-3.5 text-slate-700" />}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChangeBatch(false)}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Back to Follow-up
              </Button>
              <Button
                type="button"
                onClick={handleSaveBatchOnly}
                disabled={savingBatchOnly}
                className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs gap-1.5 shadow-sm px-5 cursor-pointer"
              >
                {savingBatchOnly ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Trip Batch
              </Button>
            </DialogFooter>
          </>
        ) : showEditInfo ? (
          /* ========================================================= */
          /* EDIT INFO VIEW ONLY - Name, City, Destination, Date, Batch */
          /* ========================================================= */
          <>
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Customer Name */}
              <div>
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Customer Name
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rashid, Sujith..."
                  className="mt-1 bg-white border-slate-300 text-slate-900 text-xs h-9"
                />
              </div>

              {/* City / Origin */}
              <div>
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> City / Origin (Departure City)
                </Label>
                <Input
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  placeholder="e.g. Kozhikode, Eranakulam, Calicut..."
                  className="mt-1 bg-white border-slate-300 text-slate-900 text-xs h-9"
                />
              </div>

              {/* Preferred Location (Destination) */}
              <div>
                <Label className="text-xs font-bold text-slate-700 block">
                  Preferred Location (Destination)
                </Label>
                <Input
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  placeholder="e.g. Vattavada, Spiti Valley, Kashmir..."
                  className="mt-1 bg-white border-slate-300 text-slate-900 text-xs h-9"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {COMMON_DESTINATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setPreferredLocation(loc)}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors cursor-pointer"
                    >
                      + {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trip Batch */}
              <div>
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Luggage className="w-3.5 h-3.5 text-slate-400" /> Trip Batch
                </Label>
                <Select
                  value={batchId || 'none'}
                  onValueChange={(val) => {
                    setBatchId(val);
                    const b = batches.find((item) => item.id === val);
                    if (b?.destination && !preferredLocation) {
                      setPreferredLocation(b.destination);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs h-9">
                    <SelectValue placeholder="-- Select Trip Batch --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 max-h-56">
                    <SelectItem value="none" className="text-xs text-slate-500">
                      -- No Batch Assigned --
                    </SelectItem>
                    {batches.map((b) => {
                      const dStr = b.proposed_date || b.start_date;
                      const formattedDate = dStr ? formatDateNumeric(dStr) : '';
                      const title = b.title
                        ? formattedDate ? `${b.title} (${formattedDate})` : b.title
                        : `${b.destination} (${formattedDate})`;
                      return (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {title}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Travel Date (Identical to Edit a Lead) */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Preferred Date
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDate(!isCustomDate)}
                    className="text-[11px] font-semibold text-blue-900 hover:underline cursor-pointer"
                  >
                    {isCustomDate ? '⚡ Select Weekend' : '+ Custom Date'}
                  </button>
                </div>

                {isCustomDate ? (
                  <div className="mt-1">
                    <DatePickerInput
                      value={preferredDate}
                      onChange={setPreferredDate}
                      className="bg-white border-slate-300 text-slate-900 text-xs h-9"
                    />
                  </div>
                ) : (
                  <Select value={preferredDate} onValueChange={setPreferredDate}>
                    <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs h-9">
                      <SelectValue placeholder="-- Select Preferred Date --" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 max-h-56">
                      <SelectItem value="Any Future Trip / Flexible Date">
                        Any Future Trip / Flexible Date
                      </SelectItem>
                      {weekendOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditInfo(false)}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Back to Follow-up
              </Button>
              <Button
                type="button"
                onClick={handleSaveInfoOnly}
                disabled={savingInfoOnly}
                className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs gap-1.5 shadow-sm px-5 cursor-pointer"
              >
                {savingInfoOnly ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Lead Info
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ========================================================= */
          /* NORMAL FOLLOW-UP CALL DONE VIEW                            */
          /* ========================================================= */
          <>
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Section 1: Lead Status Update Buttons */}
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-2">
                  Lead Status <span className="text-slate-400 font-normal">(Click to update)</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('hot')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'hot'
                        ? 'bg-red-500 text-white border-red-600 shadow-sm ring-2 ring-red-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${status === 'hot' ? 'text-white' : 'text-red-500'}`} />
                    Hot
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('warm')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'warm'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                    }`}
                  >
                    <Sun className={`w-3.5 h-3.5 ${status === 'warm' ? 'text-white' : 'text-amber-500'}`} />
                    Warm
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('cold')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'cold'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                    }`}
                  >
                    <Snowflake className={`w-3.5 h-3.5 ${status === 'cold' ? 'text-white' : 'text-blue-500'}`} />
                    Cold
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('not_interested')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'not_interested'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <XCircle className={`w-3.5 h-3.5 ${status === 'not_interested' ? 'text-white' : 'text-slate-400'}`} />
                    Not Int.
                  </button>
                </div>
              </div>

              {/* Section 2: Booking Stage Selector */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Booking Stage</Label>
                <Select value={stage} onValueChange={(val) => setStage(val as BookingStage)}>
                  <SelectTrigger className="w-full bg-white border-slate-300 text-slate-900 text-xs">
                    <SelectValue placeholder="Select Booking Stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    {Object.entries(BOOKING_STAGE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section 3: Trip Batch Selector & Change Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Luggage className="w-3.5 h-3.5 text-blue-900" /> Trip Batch
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeBatch(true);
                      setShowEditInfo(false);
                    }}
                    className="text-[11px] font-bold text-blue-900 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3" /> Change Batch
                  </button>
                </div>
                <Select
                  value={batchId || 'none'}
                  onValueChange={(val) => {
                    setBatchId(val);
                    const matched = batches.find((b) => b.id === val);
                    if (matched?.destination && !preferredLocation) {
                      setPreferredLocation(matched.destination);
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-white border-slate-300 text-slate-900 text-xs h-9">
                    <SelectValue placeholder="-- Select Trip Batch --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 max-h-56">
                    <SelectItem value="none" className="text-xs text-slate-500">
                      -- No Batch Assigned --
                    </SelectItem>
                    {batches.map((b) => {
                      const dStr = b.proposed_date || b.start_date;
                      const formattedDate = dStr ? formatDateNumeric(dStr) : '';
                      const title = b.title
                        ? formattedDate ? `${b.title} (${formattedDate})` : b.title
                        : `${b.destination} (${formattedDate})`;
                      return (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {title}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Selected batch summary badge */}
                {currentSelectedBatch && (
                  <div className="mt-1.5 px-2.5 py-1.5 bg-blue-50/60 border border-blue-200/80 rounded-lg text-[11px] text-slate-700 flex items-center justify-between">
                    <span>
                      📍 <strong className="text-slate-900">{currentSelectedBatch.destination}</strong>
                      {currentSelectedBatch.departure_city ? ` from ${currentSelectedBatch.departure_city}` : ''}
                    </span>
                    <span>
                      📅 <strong className="text-slate-900">{formatDateNumeric(currentSelectedBatch.proposed_date || currentSelectedBatch.start_date)}</strong>
                      {currentSelectedBatch.proposed_price ? ` • ₹${currentSelectedBatch.proposed_price.toLocaleString()}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Section 4: Call Notes / Remarks */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Call Notes / Outcome <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  rows={3}
                  placeholder="What was discussed? (e.g. agreed for Vattavada camp, will transfer advance tomorrow evening...)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs rounded-xl focus:ring-blue-900"
                />
              </div>

              {/* Section 5: Schedule Next Follow-up */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="scheduleNextToggle"
                      checked={scheduleNext}
                      onChange={(e) => setScheduleNext(e.target.checked)}
                      className="rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
                    />
                    <label htmlFor="scheduleNextToggle" className="text-xs font-bold text-slate-900 cursor-pointer">
                      Schedule Next Follow-up
                    </label>
                  </div>

                  {scheduleNext && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNextDate(getDateISO(1))}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold border transition-all cursor-pointer ${
                          nextDate === getDateISO(1)
                            ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setNextDate(getDateISO(2))}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold border transition-all cursor-pointer ${
                          nextDate === getDateISO(2)
                            ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +2 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setNextDate(getDateISO(7))}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold border transition-all cursor-pointer ${
                          nextDate === getDateISO(7)
                            ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +1 Week
                      </button>
                    </div>
                  )}
                </div>

                {scheduleNext && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> Next Date
                      </Label>
                      <DatePickerInput
                        value={nextDate}
                        onChange={setNextDate}
                        className="bg-white border-slate-300 text-slate-900 text-xs h-8"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Next Time
                      </Label>
                      <Select value={nextTime} onValueChange={setNextTime}>
                        <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                          <SelectValue placeholder="Select Time" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-slate-900 max-h-48">
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleComplete(true)}
                disabled={loading}
                className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs gap-1.5 shadow-sm px-5 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                Save & Complete Follow-up
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
