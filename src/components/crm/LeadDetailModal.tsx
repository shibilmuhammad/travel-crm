'use client';

import { useState, useEffect } from 'react';
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
import type { Lead, LeadActivity, LeadTemperature, BookingStage } from '@/types';
import { BOOKING_STAGE_LABELS, LEAD_TEMPERATURE_LABELS } from '@/types';
import { formatDate, formatDateTime, formatPhoneNumber, parseToISODate, getWhatsAppLink, getCallLink, generateUpcomingWeekends, WeekendOption } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

import { CompleteFollowupModal } from '@/components/crm/CompleteFollowupModal';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadDetailModal({ lead, onClose, onUpdate, onEdit, onDelete }: LeadDetailModalProps) {
  const { teamMembers } = useAuth();
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Status & Travel Info State
  const [tempStatus, setTempStatus] = useState<string>('');
  const [tempBookingStage, setTempBookingStage] = useState<string>('');
  const [tempDestination, setTempDestination] = useState<string>('');
  const [tempTravelDate, setTempTravelDate] = useState<string>('');
  const [tempAdvanceAmount, setTempAdvanceAmount] = useState<string>('');
  const [tempPaymentDate, setTempPaymentDate] = useState<string>('');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [weekendOptions, setWeekendOptions] = useState<WeekendOption[]>([]);

  // Call Log State
  const [callNote, setCallNote] = useState('');

  // Assignment State
  const [assignedStaff, setAssignedStaff] = useState('');

  // Follow-up Schedule State
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('10:00 AM');
  const [followupStaff, setFollowupStaff] = useState('');
  const [followupNote, setFollowupNote] = useState('');

  useEffect(() => {
    setWeekendOptions(generateUpcomingWeekends(3));
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
      setTempAdvanceAmount(currentLead.advance_amount ? String(currentLead.advance_amount) : '');
      const isoPayDate = parseToISODate(currentLead.payment_date) || new Date().toISOString().split('T')[0];
      setTempPaymentDate(isoPayDate);

      const pDate = currentLead.preferred_travel_date || currentLead.preferred_date || '';
      setTempTravelDate(pDate);

      const isMatch = weekendOptions.some((w) => w.value === pDate);
      setIsCustomDate(!!pDate && !isMatch);

      setAssignedStaff(currentLead.assigned_team_member || 'Unassigned');
      setFollowupStaff(currentLead.assigned_team_member || 'Unassigned');
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
        }
      }
    } catch (e) {
      console.error(e);
    }
    fetchActivities(currentLead.id);
    onUpdate();
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
        if (updated && updated.id) {
          setCurrentLead(updated);
        }
        onUpdate();
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
        onUpdate();
        alert('Call log saved!');
      }
    } catch (e) {
      console.error(e);
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
        if (updated && updated.id) {
          setCurrentLead(updated);
        }
        onUpdate();
        alert(`Lead reassigned to ${assignedStaff}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Schedule Follow-up
  const handleScheduleFollowup = async () => {
    if (!currentLead) return;
    if (!followupDate) {
      alert('Please select a follow-up date');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          next_followup_date: followupDate,
          next_followup_time: followupTime,
          next_followup_status: 'pending',
          assigned_team_member: followupStaff,
        }),
      });

      if (followupNote.trim()) {
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: currentLead.id,
            activity_type: 'follow_up',
            notes: `Follow-up scheduled for ${followupDate} (${followupTime}): ${followupNote}`,
            next_followup_date: followupDate,
            team_member: followupStaff,
          }),
        });
      }

      if (res.ok) {
        const updated = await res.json();
        if (updated && updated.id) {
          setCurrentLead(updated);
        }
        fetchActivities(currentLead.id);
        onUpdate();
        alert('Follow-up scheduled successfully!');
      } else {
        alert('Failed to schedule follow-up');
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
      {/* Top Header matching Reference Image 2 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" /> Back to Leads
        </button>

        <Button
          onClick={() => onDelete(currentLead.id)}
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1.5 bg-white font-semibold shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Lead
        </Button>
      </div>

      {/* Two-Column Detail View Layout matching Reference Images 2 & 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Profile Header */}
          <Card className="bg-white border-slate-200 shadow-xs p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-blue-900">{leadCode}</div>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{currentLead.full_name}</h1>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                  {currentLead.lead_temperature || currentLead.interest_level || 'New'}
                </span>
                <Button
                  onClick={() => onEdit(currentLead)}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 text-xs hover:bg-slate-100 gap-1.5"
                >
                  <Edit className="w-3 h-3" /> Edit
                </Button>
              </div>
            </div>

            {/* Contact line */}
            <div className="flex items-center gap-4 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatPhoneNumber(currentLead.whatsapp_number)}</span>
              </div>
              <a
                href={getWhatsAppLink(currentLead.whatsapp_number)}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                title="WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
              {currentLead.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentLead.email}</span>
                </div>
              )}
            </div>

            {/* Grid attributes */}
            <div className="grid grid-cols-3 gap-4 text-xs mt-4 pt-4 border-t border-slate-100">
              <div>
                <div className="font-bold text-slate-900">City:</div>
                <div className="text-slate-600 mt-0.5">{currentLead.departure_city || 'Eranakulam'}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Source:</div>
                <div className="text-slate-600 mt-0.5 capitalize">{currentLead.lead_source || 'Manual Entry'}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Assigned To:</div>
                <div className="text-slate-600 mt-0.5 font-semibold">{currentLead.assigned_team_member || 'Unassigned'}</div>
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
          <Card className="bg-white border-slate-200 shadow-xs p-5 space-y-4">
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
              <Label className="text-xs font-bold text-slate-700">Preferred Location</Label>
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
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Status & Info
            </Button>
          </Card>

          {/* Card 3: Log Call & Note */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 space-y-3">
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
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Log Call
            </Button>
          </Card>

          {/* Card 4: Activity Timeline */}
          <Card className="bg-white border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Activity Timeline</h3>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No notes or call logs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-slate-500 font-semibold mb-1">
                      <span>👤 {act.team_member || 'Staff'}</span>
                      <span>{formatDateTime(act.activity_date || act.created_at)}</span>
                    </div>
                    <p className="text-slate-800">{act.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Assignment */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Assignment</h3>

            <div>
              <Label className="text-xs font-bold text-slate-700">Assigned To</Label>
              <Select value={assignedStaff} onValueChange={setAssignedStaff}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.full_name || m.name || 'Staff'}>
                      {m.full_name || m.name} ({m.role.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpdateAssignment}
              disabled={loading}
              size="sm"
              className="w-full bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" /> Update Assignment
            </Button>
          </Card>

          {/* Card 2: Schedule Follow-up */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Schedule Follow-up</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Date</Label>
                <Input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-slate-900 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Time</Label>
                <Input
                  type="text"
                  placeholder="10:00 AM"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-slate-900 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Assign To</Label>
              <Select value={followupStaff} onValueChange={setFollowupStaff}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900 text-xs">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.full_name || m.name || 'Staff'}>
                      {m.full_name || m.name}
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
              className="w-full bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow text-xs gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </Button>
          </Card>

          {/* Card 3: Follow-ups Card matching Input Image 1 */}
          <Card className="bg-white border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Follow-ups</h3>
            {currentLead.next_followup_date ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatDate(currentLead.next_followup_date)}, {currentLead.next_followup_time || '10:00 AM'}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      {currentLead.assigned_team_member || 'Unassigned Staff'}
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
          onSuccess={refreshLeadData}
        />
      )}
    </div>
  );
}

