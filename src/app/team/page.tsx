'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Users, UserPlus, Shield, Phone, Mail, Lock, Trash2, Edit2, CheckCircle2,
  Activity, Search, Key, UserCheck, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import type { TeamMember, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function TeamPage() {
  const { teamMembers, refreshTeamMembers, currentUser, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Add Member Form State
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'telecaller' as UserRole,
    employee_id: '',
    daily_call_target: '0',
    daily_conversion_target: '0',
  });

  const resetForm = () => {
    setForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'telecaller',
      employee_id: '',
      daily_call_target: '0',
      daily_conversion_target: '0',
    });
    setEditMember(null);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditMember(member);
    setForm({
      full_name: member.full_name || member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      password: '',
      role: member.role || 'telecaller',
      employee_id: member.employee_id || '',
      daily_call_target: String(member.daily_call_target || 0),
      daily_conversion_target: String(member.daily_conversion_target || 0),
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return;

    setLoading(true);
    try {
      const url = editMember ? `/api/team/${editMember.id}` : '/api/team';
      const method = editMember ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          daily_call_target: Number(form.daily_call_target) || 0,
          daily_conversion_target: Number(form.daily_conversion_target) || 0,
        }),
      });

      if (!res.ok) throw new Error('Failed to save team member');

      await refreshTeamMembers();
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || 'Error saving team member');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
      if (res.ok) await refreshTeamMembers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await refreshTeamMembers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout title="Team Members" description="Manage staff accounts, assign login credentials, set telecaller targets, and control access permissions.">
      <div className="space-y-6">
        {/* Top Title & Stats Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {teamMembers.length} users active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold shadow-xs gap-2 rounded-xl"
            >
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </Button>
          </div>
        </div>

        {/* Team Members List Card */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900">Staff Accounts</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                {teamMembers.length} users
              </span>
            </div>

            <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Activity Log
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Targets</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last Login</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {teamMembers.map((m) => {
                  const isCurrent = currentUser.id === m.id || currentUser.email === m.email;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900 text-sm">{m.full_name || m.name}</div>
                        {m.phone && <div className="text-xs text-slate-500 font-mono mt-0.5">{m.phone}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{m.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold capitalize ${
                            m.role === 'admin'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-semibold">
                        {m.role === 'admin' ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          `${m.daily_call_target || 0} calls / ${m.daily_conversion_target || 0} conv.`
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          onClick={() => handleToggleStatus(m)}
                          className={`cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {m.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {m.last_login || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> You
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleOpenEdit(m)}
                              variant="outline"
                              size="icon"
                              className="w-8 h-8 border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(m.id)}
                              variant="outline"
                              size="icon"
                              className="w-8 h-8 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add / Edit Team Member Modal matching UI Image 3 */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[560px] bg-white text-slate-900 p-0 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {editMember ? 'Edit Team Member' : 'Add Team Member'}
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              {teamMembers.length} users
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="Enter full name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  required={!editMember}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 pr-10 bg-white border-slate-300 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Interactive Role Card Selector matching UI Image 3 */}
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-2 block">
                Role <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: 'telecaller',
                    title: 'Telecaller',
                    desc: 'Works the leads assigned to them',
                  },
                  {
                    id: 'manager',
                    title: 'Manager',
                    desc: 'Pick exactly what they can see',
                  },
                  {
                    id: 'admin',
                    title: 'Admin',
                    desc: 'Full access, same as you',
                  },
                  {
                    id: 'other',
                    title: 'Other',
                    desc: 'Name the role yourself',
                  },
                ].map((r) => {
                  const isSelected = form.role === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setForm({ ...form, role: r.id as UserRole })}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{r.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{r.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Employee ID (optional)</Label>
              <Input
                placeholder="EMP-001"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Daily Call Target</Label>
                <Input
                  type="number"
                  value={form.daily_call_target}
                  onChange={(e) => setForm({ ...form, daily_call_target: e.target.value })}
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Daily Conversion Target</Label>
                <Input
                  type="number"
                  value={form.daily_conversion_target}
                  onChange={(e) => setForm({ ...form, daily_conversion_target: e.target.value })}
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Uses one seat</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-semibold shadow"
                >
                  {editMember ? 'Save Changes' : '+ Add Team Member'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
