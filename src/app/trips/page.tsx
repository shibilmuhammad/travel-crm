'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BatchStatusBadge } from '@/components/crm/StatusBadges';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Plane, Trash2, RefreshCw, Loader2, Calendar, MapPin, IndianRupee, Users, Edit, CheckCircle2
} from 'lucide-react';
import type { TripBatch, BatchStatus } from '@/types';
import { BATCH_STATUS_LABELS } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DatePickerInput } from '@/components/ui/date-picker-input';

export default function TripsPage() {
  const [batches, setBatches] = useState<TripBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editBatch, setEditBatch] = useState<TripBatch | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state for creating a batch
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    status: 'open_for_booking' as BatchStatus,
    proposed_date: '',
    end_date: '',
    proposed_price: '',
    capacity: '12',
    departure_city: 'Kochi',
    notes: '',
  });

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/batches', { cache: 'no-store' });
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this batch? This action cannot be undone.')) return;
    await fetch(`/api/batches/${id}`, { method: 'DELETE' });
    fetchBatches();
  };

  const handleStatusChange = async (id: string, status: BatchStatus) => {
    await fetch(`/api/batches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchBatches();
  };

  const handleOpenEdit = (batch: TripBatch) => {
    setEditBatch(batch);
    setFormData({
      title: batch.title || `${batch.destination} Batch`,
      destination: batch.destination,
      status: batch.status || 'open_for_booking',
      proposed_date: batch.proposed_date || batch.start_date || '',
      end_date: batch.end_date || '',
      proposed_price: (batch.proposed_price || batch.price_per_pax || '').toString(),
      capacity: (batch.capacity || batch.total_capacity || 12).toString(),
      departure_city: batch.departure_city || 'Kochi',
      notes: batch.notes || '',
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination || !formData.title) {
      alert('Please enter a destination and batch title.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: formData.title,
        destination: formData.destination,
        status: formData.status,
        proposed_date: formData.proposed_date || new Date().toISOString().split('T')[0],
        end_date: formData.end_date || null,
        proposed_price: Number(formData.proposed_price) || 0,
        price_per_pax: Number(formData.proposed_price) || 0,
        capacity: Number(formData.capacity) || 12,
        total_capacity: Number(formData.capacity) || 12,
        departure_city: formData.departure_city || null,
        notes: formData.notes || '',
      };

      const url = editBatch ? `/api/batches/${editBatch.id}` : '/api/batches';
      const method = editBatch ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreate(false);
        setEditBatch(null);
        setFormData({
          title: '',
          destination: '',
          status: 'open_for_booking',
          proposed_date: '',
          end_date: '',
          proposed_price: '',
          capacity: '12',
          departure_city: 'Kochi',
          notes: '',
        });
        fetchBatches();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save batch');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving batch');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout
      title="Trips & Departure Batches"
      description="Manage upcoming group travel batches, capacity targets, and seat confirmations."
      actions={
        <Button onClick={() => setShowCreate(true)} size="sm" className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs gap-1.5 shadow cursor-pointer">
          <Plus className="w-4 h-4" /> Create New Batch
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Top Header Action Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Upcoming Batches ({batches.length})</h2>
            <p className="text-xs text-slate-500">Track seat availability, proposed prices, and booking status.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm" className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs gap-1.5 shadow cursor-pointer">
            <Plus className="w-4 h-4" /> Create New Batch
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : batches.length === 0 ? (
          <Card className="bg-white border-slate-200 p-12 text-center text-slate-500 rounded-2xl">
            <Plane className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-sm font-semibold">No trip batches created yet.</p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="mt-4 bg-[#0e2a56] hover:bg-[#0a1f42] text-white text-xs font-semibold">
              <Plus className="w-4 h-4 mr-1.5" /> Create Your First Batch
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => {
              const capacity = batch.capacity || batch.total_capacity || 12;
              const confirmed = batch.confirmed_pax || 0;
              const percent = Math.min(100, Math.round((confirmed / capacity) * 100));

              return (
                <Card key={batch.id} className="bg-white border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between rounded-2xl">
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">{batch.destination}</div>
                        <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{batch.title || `${batch.destination} Batch`}</h3>
                      </div>
                      <BatchStatusBadge status={batch.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">Departure:</span>
                        <div className="font-semibold text-slate-900">{formatDate(batch.proposed_date || batch.start_date || '')}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Price / Pax:</span>
                        <div className="font-semibold text-slate-900">{formatCurrency(batch.proposed_price || batch.price_per_pax || 0)}</div>
                      </div>
                    </div>

                    {/* Seats Capacity Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span>Seats Filled</span>
                        <span className="font-bold text-slate-900">{confirmed} / {capacity}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <Select value={batch.status} onValueChange={(val) => handleStatusChange(batch.id, val as BatchStatus)}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-300 text-slate-900 w-36 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900">
                        {Object.entries(BATCH_STATUS_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k} className="text-xs cursor-pointer">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={() => handleOpenEdit(batch)}
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Edit Batch"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(batch.id)}
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Batch Modal Dialog */}
      <Dialog open={showCreate || !!editBatch} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setEditBatch(null);
        }
      }}>
        <DialogContent className="bg-white text-slate-900 border-slate-200 max-w-lg p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-900" />
              {editBatch ? 'Edit Trip Batch' : 'Create New Trip Batch'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Batch Title *</Label>
              <Input
                placeholder="e.g. Vattavada Camp & Offroad Trek Batch #2"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white border-slate-300 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Destination *</Label>
                <Input
                  placeholder="e.g. Vattavada"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Batch Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val as BatchStatus })}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    {Object.entries(BATCH_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Departure Date</Label>
                <DatePickerInput
                  value={formData.proposed_date}
                  onChange={(val) => setFormData({ ...formData, proposed_date: val })}
                  className="bg-white border-slate-300 text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">End Date (Optional)</Label>
                <DatePickerInput
                  value={formData.end_date}
                  onChange={(val) => setFormData({ ...formData, end_date: val })}
                  className="bg-white border-slate-300 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Price / Pax (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 3800"
                  value={formData.proposed_price}
                  onChange={(e) => setFormData({ ...formData, proposed_price: e.target.value })}
                  className="bg-white border-slate-300 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Total Seats</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="bg-white border-slate-300 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Departure City</Label>
                <Input
                  placeholder="Kochi"
                  value={formData.departure_city}
                  onChange={(e) => setFormData({ ...formData, departure_city: e.target.value })}
                  className="bg-white border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Batch Notes / Inclusions</Label>
              <Textarea
                placeholder="e.g. 4WD Offroad vehicle, tent stay, campfire & breakfast included."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white border-slate-300 text-xs h-20"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setEditBatch(null);
                }}
                className="text-xs border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white text-xs font-semibold gap-1.5"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editBatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editBatch ? 'Save Changes' : 'Create Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

