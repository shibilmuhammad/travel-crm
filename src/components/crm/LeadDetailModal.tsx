'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, ArrowLeft, Phone, MessageSquare, Mail, Edit, Trash2, Calendar, Clock,
  UserCheck, Save, PhoneCall, CheckCircle2, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { Lead, LeadActivity, LeadTemperature, BookingStage, TripBatch } from '@/types';
import { BOOKING_STAGE_LABELS, LEAD_TEMPERATURE_LABELS } from '@/types';
import { formatDate, formatDateTime, formatPhoneNumber, parseToISODate, getWhatsAppLink, getCallLink, generateUpcomingWeekends, WeekendOption } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

import { CompleteFollowupModal } from '@/components/crm/CompleteFollowupModal';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (updatedLead?: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

const TIME_OPTIONS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'
];

function getDateISO(daysAhead = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoToDMY(isoDateStr?: string | null): string {
  if (!isoDateStr) return '';
  const clean = isoDateStr.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
}

function dmyToISO(dmyStr?: string | null): string {
  if (!dmyStr) return '';
  const parts = dmyStr.trim().split(/[/.-]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (d.length === 4 && y.length <= 2) {
      [y, m, d] = [d, m, y];
    }
    if (y.length === 2) {
      y = `20${y}`;
    }
    return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dmyStr;
}

function formatDisplayDateDMY(isoDateStr?: string | null): string {
  return isoToDMY(isoDateStr);
}

export function LeadDetailModal({ lead, onClose, onUpdate, onEdit, onDelete }: LeadDetailModalProps) {
  const { teamMembers } = useAuth();
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Status & Travel Info State
  const [batches, setBatches] = useState<TripBatch[]>([]);
  const [tempStatus, setTempStatus] = useState<string>('');
  const [tempBookingStage, setTempBookingStage] = useState<string>('');
  const [tempDestination, setTempDestination] = useState<string>('');
  const [tempCity, setTempCity] = useState<string>('');
  const [tempBatchId, setTempBatchId] = useState<string>('');
  const [tempTravelDate, setTempTravelDate] = useState<string>('');
  const [tempAdvanceAmount, setTempAdvanceAmount] = useState<string>('');
  const [tempPaymentDate, setTempPaymentDate] = useState<string>('');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [weekendOptions, setWeekendOptions] = useState<WeekendOption[]>([]);

  // Call Log State
  const [callNote, setCallNote] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotesText, setEditNotesText] = useState('');

  // Assignment State
  const [assignedStaff, setAssignedStaff] = useState('Shibil Muhammad');

  // Follow-up Schedule State
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [followupDate, setFollowupDate] = useState('');
  const [followupDisplayDate, setFollowupDisplayDate] = useState('');
  const [followupTime, setFollowupTime] = useState('10:00 AM');
  const [followupStaff, setFollowupStaff] = useState('Shibil Muhammad');
  const [followupNote, setFollowupNote] = useState('');

  // Normalize staff options so Admin (Shibil Muhammad) is always present and clean
  const staffOptions = [
    { id: 'admin-shibil', name: 'Shibil Muhammad', role: 'admin' },
    ...teamMembers
      .filter((m) => {
        const n = (m.full_name || m.name || '').trim();
        return n !== 'Shibil' && n !== 'Shibil Muhammad' && n !== '';
      })
      .map((m) => ({
        id: m.id,
        name: m.full_name || m.name || 'Staff',
        role: m.role || 'telecaller',
      })),
  ];

  useEffect(() => {
    setWeekendOptions(generateUpcomingWeekends(3));
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBatches(data);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (lead) {
      setCurrentLead(lead);
    }
  }, [lead]);

  useEffect(() => {
    if (currentLead) {
      setTempStatus(currentLead.lead_temperature || currentLead.interest_level || 'new');
      setTempBookingStage(currentLead.booking_stage || 'not_contacted');
      setTempDestination(currentLead.preferred_destination || currentLead.destination || '');
      setTempCity(currentLead.departure_city || '');
      setTempBatchId(currentLead.batch_id || '');
      setTempAdvanceAmount(currentLead.advance_amount ? String(currentLead.advance_amount) : '');
      const isoPayDate = parseToISODate(currentLead.payment_date) || new Date().toISOString().split('T')[0];
      setTempPaymentDate(isoPayDate);

      const pDate = currentLead.preferred_travel_date || currentLead.preferred_date || '';
      setTempTravelDate(pDate);

      const isMatch = weekendOptions.some((w) => w.value === pDate);
      setIsCustomDate(!!pDate && !isMatch);

      const staffVal = (currentLead.assigned_team_member && currentLead.assigned_team_member !== 'Unassigned' && currentLead.assigned_team_member !== 'Shibil')
        ? currentLead.assigned_team_member
        : 'Shibil Muhammad';

      setAssignedStaff(staffVal);
      setFollowupStaff(staffVal);

      // Pre-fill schedule follow-up if present on currentLead
      if (currentLead.next_followup_date) {
        const iso = parseToISODate(currentLead.next_followup_date) || currentLead.next_followup_date;
        setFollowupDate(iso);
        setFollowupDisplayDate(isoToDMY(iso));
        if (currentLead.next_followup_time) {
          setFollowupTime(currentLead.next_followup_time);
        }
      }

      fetchActivities(currentLead.id);
    }
  }, [currentLead, weekendOptions]);

  const fetchActivities = async (leadId: string) => {
    try {
      const res = await fetch(`/api/activities?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshLeadData = async () => {
    if (!currentLead) return;
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`);
      if (res.ok) {
        const updated = await res.json();
        if (updated && updated.id) {
          setCurrentLead(updated);
          onUpdate(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
    fetchActivities(currentLead.id);
  };

  if (!currentLead) return null;

  // Save Lead Status, Booking Stage, Destination & Preferred Date
  const handleSaveStatus = async () => {
    if (!currentLead) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_temperature: tempStatus,
          interest_level: tempStatus,
          booking_stage: tempBookingStage,
          preferred_destination: tempDestination,
          destination: tempDestination,
          preferred_travel_date: tempTravelDate,
          preferred_date: tempTravelDate,
          advance_amount: tempAdvanceAmount ? parseFloat(tempAdvanceAmount) : null,
          payment_date: tempPaymentDate || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        const finalLead = (updated && updated.id) ? updated : {
          ...currentLead,
          lead_temperature: tempStatus as LeadTemperature,
          booking_stage: tempBookingStage as BookingStage,
          preferred_destination: tempDestination,
          destination: tempDestination,
          preferred_travel_date: tempTravelDate,
          advance_amount: tempAdvanceAmount ? parseFloat(tempAdvanceAmount) : null,
          payment_date: tempPaymentDate || null,
        };
        setCurrentLead(finalLead);
        onUpdate(finalLead);
        alert('Lead status & details updated successfully!');
      } else {
        alert('Failed to update status.');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating status.');
    } finally {
      setLoading(false);
    }
  };

  // Log Call & Note
  const handleLogCall = async () => {
    if (!currentLead) return;
    if (!callNote.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: currentLead.id,
          activity_type: 'phone_call',
          notes: callNote,
          outcome: 'Call Logged',
          team_member: assignedStaff,
        }),
      });
      if (res.ok) {
        setCallNote('');
        fetchActivities(currentLead.id);
        onUpdate(currentLead);
        alert('Call log saved!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Save / Update Lead Notes
  const handleSaveLeadNotes = async () => {
    if (!currentLead) return;
    setLoading(true);
    try {
      const trimmedNotes = editNotesText.trim();
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmedNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentLead(updated);
        setIsEditingNotes(false);
        if (trimmedNotes) {
          await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: currentLead.id,
              activity_type: 'call_note',
              notes: trimmedNotes,
              team_member: assignedStaff || 'Shibil Muhammad',
            }),
          });
          fetchActivities(currentLead.id);
        }
        onUpdate(updated);
      }
    } catch (e) {
      console.error('Failed to update lead notes:', e);
    } finally {
      setLoading(false);
    }
  };

  // Update Assignment
  const handleUpdateAssignment = async () => {
    if (!currentLead) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_team_member: assignedStaff }),
      });
      if (res.ok) {
        const updated = await res.json();
        const finalLead = (updated && updated.id) ? updated : {
          ...currentLead,
          assigned_team_member: assignedStaff,
        };
        setCurrentLead(finalLead);
        onUpdate(finalLead);
        alert(`Lead reassigned to ${assignedStaff}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Schedule Follow-up with Instant UI update
  const handleScheduleFollowup = async () => {
    if (!currentLead) return;
    if (!followupDate) {
      alert('Please select a follow-up date');
      return;
    }
    setLoading(true);

    const scheduledLead: Lead = {
      ...currentLead,
      next_followup_date: followupDate,
      next_followup_time: followupTime,
      next_followup_status: 'pending',
      assigned_team_member: followupStaff || 'Shibil Muhammad',
    };

    // INSTANT UI REFLECTION: update local state and parent state immediately so user sees the card right away!
    setCurrentLead(scheduledLead);
    onUpdate(scheduledLead);

    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          next_followup_date: followupDate,
          next_followup_time: followupTime,
          next_followup_status: 'pending',
          assigned_team_member: followupStaff || 'Shibil Muhammad',
        }),
      });

      if (followupNote.trim()) {
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: currentLead.id,
            activity_type: 'follow_up',
            notes: `Follow-up scheduled for ${formatDisplayDateDMY(followupDate)} (${followupTime}): ${followupNote}`,
            next_followup_date: followupDate,
            next_followup_time: followupTime,
            next_followup_status: 'pending',
            team_member: followupStaff || 'Shibil Muhammad',
          }),
        });
      }

      if (res.ok) {
        const updated = await res.json();
        const finalLead = (updated && updated.id) ? updated : scheduledLead;
        setCurrentLead(finalLead);
        fetchActivities(currentLead.id);
        onUpdate(finalLead);
      } else {
        alert('Failed to save follow-up to database');
      }
    } catch (e) {
      console.error(e);
      alert('Error scheduling follow-up');
    } finally {
      setLoading(false);
    }
  };

  const leadCode = `UNZ${currentLead.id.replace(/[^0-9]/g, '').slice(-3) || '002'}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" /> Back to Leads
        </button>
      </div>

      {/* Two-Column Detail View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
        {/* LEFT COLUMN (7 cols) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6 min-w-0">
          {/* Card 1: Profile Header */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono font-bold text-blue-900">{leadCode}</div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 break-words">{currentLead.full_name}</h1>
              </div>

              <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                  {currentLead.lead_temperature || currentLead.interest_level || 'New'}
                </span>
                <Button
                  onClick={() => onEdit(currentLead)}
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-300 text-slate-700 text-xs hover:bg-slate-100 gap-1.5 cursor-pointer px-2.5"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
                {onDelete && (
                  <Button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${currentLead.full_name}? All follow-ups and data related to this lead will be permanently deleted.`)) {
                        onDelete(currentLead.id);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 border-red-200 text-red-600 text-xs hover:bg-red-50 hover:border-red-300 gap-1.5 cursor-pointer px-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Lead
                  </Button>
                )}
              </div>
            </div>

            {/* Contact line */}
            <div className="flex items-center flex-wrap gap-2.5 sm:gap-4 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <a
                  href={getCallLink(currentLead.whatsapp_number)}
                  className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shrink-0 transition-colors"
                  title="Call Phone"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-700" />
                </a>
                <a
                  href={getWhatsAppLink(currentLead.whatsapp_number)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 shrink-0 transition-colors"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                </a>
                <span className="font-mono text-slate-700 font-semibold">{formatPhoneNumber(currentLead.whatsapp_number)}</span>
              </div>
              {currentLead.email && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{currentLead.email}</span>
                </div>
              )}
            </div>

            {/* Grid attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs mt-4 pt-4 border-t border-slate-100">
              <div>
                <div className="font-bold text-slate-900">City / Origin:</div>
                <div className="text-slate-600 mt-0.5">{currentLead.departure_city || '—'}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Product / Batch:</div>
                <div className="text-blue-900 font-semibold mt-0.5">
                  {batches.find((b) => b.id === currentLead.batch_id)?.title || (currentLead.batch_id ? 'Vattavada Camp 1' : '—')}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Source:</div>
                <div className="text-slate-600 mt-0.5 capitalize">{currentLead.lead_source || 'Manual Entry'}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Assigned To:</div>
                <div className="text-slate-600 mt-0.5 font-semibold text-blue-950">{currentLead.assigned_team_member || 'Shibil Muhammad'}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Created:</div>
                <div className="text-slate-600 mt-0.5">{formatDateTime(currentLead.created_at)}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Last Contacted:</div>
                <div className="text-slate-600 mt-0.5">{currentLead.last_contacted_date ? formatDateTime(currentLead.last_contacted_date) : '-'}</div>
              </div>
            </div>
          </Card>

          {/* Card 2: Lead Status & Travel Info */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 space-y-4 min-w-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lead Status & Info</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Where this lead stands right now, booking stage, and trip preferences.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                Status: {LEAD_TEMPERATURE_LABELS[tempStatus as LeadTemperature] || tempStatus || 'New / Unassessed'}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-900 border border-blue-200 capitalize">
                Stage: {BOOKING_STAGE_LABELS[tempBookingStage as BookingStage] || tempBookingStage || 'Not Contacted'}
              </span>
            </div>

            {currentLead.advance_amount && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Advance Received: <strong className="text-emerald-950 font-mono text-sm">₹{currentLead.advance_amount.toLocaleString('en-IN')}</strong></span>
                </div>
                {currentLead.payment_date && <span className="text-emerald-700 text-[11px] font-medium bg-white px-2 py-0.5 rounded border border-emerald-200">Paid: {formatDate(currentLead.payment_date)}</span>}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Lead Status</Label>
                <Select value={tempStatus} onValueChange={setTempStatus}>
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
                <Select value={tempBookingStage} onValueChange={setTempBookingStage}>
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                    <SelectValue placeholder="-- Select Stage --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    {Object.entries(BOOKING_STAGE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional Advance Amount & Payment Date Box */}
            {(tempBookingStage === 'advance_paid' || tempBookingStage === 'booking_confirmed') && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Advance & Payment Details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-emerald-950">Advance Paid (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2000"
                      value={tempAdvanceAmount}
                      onChange={(e) => setTempAdvanceAmount(e.target.value)}
                      className="mt-1 bg-white border-emerald-300 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-emerald-950">Payment Date *</Label>
                    <Input
                      type="date"
                      value={tempPaymentDate}
                      onChange={(e) => setTempPaymentDate(e.target.value)}
                      className="mt-1 bg-white border-emerald-300 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preferred Location */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Preferred Location (Destination)</Label>
              <div className="space-y-1.5 mt-1">
                <Input
                  placeholder="e.g. Vattavada, Wayanad, Spiti Valley..."
                  value={tempDestination}
                  onChange={(e) => setTempDestination(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs"
                />
                <div className="flex flex-wrap gap-1">
                  {['Vattavada', 'Wayanad', 'Munnar', 'Vagamon', 'Spiti Valley', 'Meghalaya', 'Gokarna', 'Kashmir'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setTempDestination(loc)}
                      className="px-2 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors"
                    >
                      + {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preferred Date */}
            <div>
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
                <Input
                  type="date"
                  value={tempTravelDate}
                  onChange={(e) => setTempTravelDate(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-slate-900 text-xs"
                />
              ) : (
                <Select value={tempTravelDate} onValueChange={setTempTravelDate}>
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                    <SelectValue placeholder="-- Select Preferred Date --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 max-h-60 overflow-y-auto">
                    {weekendOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              onClick={handleSaveStatus}
              disabled={loading}
              size="sm"
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Status & Info
            </Button>
          </Card>

          {/* Card 3: Call Notes / Remarks */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Call Notes & Remarks</span>
                  {currentLead.notes && currentLead.notes.trim() && currentLead.notes !== '—' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Saved
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Imported remarks from Excel or notes recorded during customer calls.
                </p>
              </div>
              {!isEditingNotes && (
                <Button
                  onClick={() => {
                    setEditNotesText(currentLead.notes && currentLead.notes !== '—' ? currentLead.notes : '');
                    setIsEditingNotes(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3 h-3" /> {currentLead.notes && currentLead.notes !== '—' ? 'Edit Note' : 'Add Note'}
                </Button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2 mt-2">
                <Textarea
                  value={editNotesText}
                  onChange={(e) => setEditNotesText(e.target.value)}
                  placeholder="Enter call notes or customer details..."
                  className="bg-white border-slate-300 text-xs min-h-[85px] leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveLeadNotes}
                    disabled={loading}
                    size="sm"
                    className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3 h-3" /> Save Note
                  </Button>
                  <Button
                    onClick={() => setIsEditingNotes(false)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-300 text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : currentLead.notes && currentLead.notes.trim() && currentLead.notes !== '—' ? (
              <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/90 text-xs">
                <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                  {currentLead.notes}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 italic flex items-center justify-between">
                <span>No call notes recorded yet for this lead.</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditNotesText('');
                    setIsEditingNotes(true);
                  }}
                  className="text-blue-700 hover:underline font-semibold not-italic cursor-pointer"
                >
                  + Add note
                </button>
              </div>
            )}
          </Card>

          {/* Card 4: Log Call & Note */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 space-y-3 min-w-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Log Call & Note</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Saving here marks the lead as contacted just now.
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Note</Label>
              <Textarea
                rows={3}
                placeholder="What happened on this call?"
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                className="mt-1 bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>

            <Button
              onClick={handleLogCall}
              disabled={loading || !callNote.trim()}
              size="sm"
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Log Call
            </Button>
          </Card>

          {/* Card 5: Activity Timeline */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Activity Timeline</h3>
            {activities.length === 0 && (!currentLead.notes || currentLead.notes.trim() === '' || currentLead.notes === '—') ? (
              <p className="text-xs text-slate-500 italic">No notes or call logs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {/* Fallback entry if lead has notes not already in activities list */}
                {currentLead.notes &&
                  currentLead.notes.trim() !== '' &&
                  currentLead.notes !== '—' &&
                  !activities.some((a) => a.notes === currentLead.notes) && (
                    <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                      <div className="flex items-center justify-between text-amber-800 font-semibold mb-1">
                        <span className="flex items-center gap-1.5 font-bold">
                          📝 Call Note / Excel Import
                        </span>
                        <span>{formatDateTime(currentLead.created_at)}</span>
                      </div>
                      <p className="text-slate-800 font-medium whitespace-pre-wrap">{currentLead.notes}</p>
                    </div>
                  )}

                {activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-slate-500 font-semibold mb-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        👤 {act.team_member || 'Staff'}
                        <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                          {act.activity_type === 'call_note' ? 'Call Note' : 'Call Log'}
                        </span>
                      </span>
                      <span>{formatDateTime(act.activity_date || act.created_at)}</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap">{act.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6 min-w-0">
          {/* Card 1: Assignment */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 space-y-3 min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Assignment</h3>

            <div>
              <Label className="text-xs font-bold text-slate-700">Assigned To</Label>
              <Select value={assignedStaff} onValueChange={setAssignedStaff}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {staffOptions.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name} {m.role === 'admin' ? '(ADMIN)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpdateAssignment}
              disabled={loading}
              size="sm"
              className="w-full bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Update Assignment
            </Button>
          </Card>

          {/* Card 2: Schedule Follow-up with Time dropdown and DD/MM/YYYY formatting */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 space-y-3 min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Schedule Follow-up</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date Input with DD/MM/YYYY formatting */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date
                  </Label>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                    dd/mm/yyyy
                  </span>
                </div>

                <div className="relative mt-1">
                  <Input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={followupDisplayDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFollowupDisplayDate(val);
                      const parsed = dmyToISO(val);
                      if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
                        setFollowupDate(parsed);
                      }
                    }}
                    onClick={() => {
                      try {
                        datePickerRef.current?.showPicker();
                      } catch {
                        datePickerRef.current?.focus();
                      }
                    }}
                    className="bg-white border-slate-300 text-slate-900 text-xs pr-8 font-medium cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        datePickerRef.current?.showPicker();
                      } catch {
                        datePickerRef.current?.focus();
                      }
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                    title="Open calendar"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <input
                    ref={datePickerRef}
                    type="date"
                    value={followupDate}
                    onChange={(e) => {
                      const iso = e.target.value;
                      setFollowupDate(iso);
                      setFollowupDisplayDate(isoToDMY(iso));
                    }}
                    className="sr-only"
                    tabIndex={-1}
                  />
                </div>

                {/* Quick Date Chips */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const iso = getDateISO(0);
                      setFollowupDate(iso);
                      setFollowupDisplayDate(isoToDMY(iso));
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const iso = getDateISO(1);
                      setFollowupDate(iso);
                      setFollowupDisplayDate(isoToDMY(iso));
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const iso = getDateISO(2);
                      setFollowupDate(iso);
                      setFollowupDisplayDate(isoToDMY(iso));
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const iso = getDateISO(7);
                      setFollowupDate(iso);
                      setFollowupDisplayDate(isoToDMY(iso));
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                  >
                    +1 Week
                  </button>
                </div>
              </div>

              {/* Time Dropdown Selector */}
              <div>
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Time
                </Label>
                <Select value={followupTime} onValueChange={setFollowupTime}>
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                    <SelectValue placeholder="10:00 AM" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 max-h-60 overflow-y-auto">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Assign To</Label>
              <Select value={followupStaff} onValueChange={setFollowupStaff}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {staffOptions.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Notes</Label>
              <Input
                placeholder="e.g. Call to discuss pricing"
                value={followupNote}
                onChange={(e) => setFollowupNote(e.target.value)}
                className="mt-1 bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>

            <Button
              onClick={handleScheduleFollowup}
              disabled={loading}
              size="sm"
              className="w-full bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </Button>
          </Card>

          {/* Card 3: Follow-ups Card matching Reference Image 3 */}
          <Card className="bg-white border-slate-200 shadow-xs p-4 sm:p-5 space-y-3 min-w-0">
            <h3 className="text-base font-bold text-slate-900">Follow-ups</h3>
            {currentLead.next_followup_date ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>{formatDate(currentLead.next_followup_date)}, {currentLead.next_followup_time || '10:00 AM'}</span>
                      <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {formatDisplayDateDMY(currentLead.next_followup_date)}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                      {currentLead.assigned_team_member || 'Shibil Muhammad'}
                    </div>
                  </div>
                  {currentLead.next_followup_status === 'completed' ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Completed
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                      Pending
                    </span>
                  )}
                </div>

                {currentLead.next_followup_status !== 'completed' ? (
                  <Button
                    type="button"
                    onClick={() => setCompleteModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="bg-white border-slate-300 text-slate-900 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs gap-1.5 cursor-pointer h-8 px-3"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" /> Mark Done
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Follow-up call completed
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No follow-ups scheduled.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Complete Follow-up Call Note Modal */}
      {completeModalOpen && (
        <CompleteFollowupModal
          lead={currentLead}
          open={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          onSuccess={(updated) => {
            if (updated) {
              setCurrentLead(updated);
              onUpdate(updated);
            }
            refreshLeadData();
          }}
        />
      )}
    </div>
  );
}


